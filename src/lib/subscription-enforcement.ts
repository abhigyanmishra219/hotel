import mongoose, { Types } from "mongoose";
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import HotelSubscription, { IHotelSubscription } from "@/models/HotelSubscription";
import SubscriptionPlan, { ISubscriptionPlan } from "@/models/SubscriptionPlan";
import Room from "@/models/Room";
import User from "@/models/User";
import { USER_ROLES } from "@/types/roles";

/**
 * Custom Error for Subscription Limits (Rooms, Staff, Receptionists)
 */
export class SubscriptionLimitError extends Error {
  code: string;
  statusCode: number;
  limitType: "rooms" | "staff" | "receptionists";
  currentCount: number;
  maxLimit: number;
  planName: string;

  constructor(
    message: string,
    code: "ROOM_LIMIT_REACHED" | "STAFF_LIMIT_REACHED" | "RECEPTIONIST_LIMIT_REACHED",
    limitType: "rooms" | "staff" | "receptionists",
    currentCount: number,
    maxLimit: number,
    planName: string
  ) {
    super(message);
    this.name = "SubscriptionLimitError";
    this.code = code;
    this.statusCode = 403;
    this.limitType = limitType;
    this.currentCount = currentCount;
    this.maxLimit = maxLimit;
    this.planName = planName;
  }
}

/**
 * Custom Error for Feature Access Restrictions
 */
export class SubscriptionFeatureError extends Error {
  code: string;
  statusCode: number;
  feature: string;
  planName: string;

  constructor(feature: string, planName: string) {
    super(
      `The requested module '${feature}' is not included in your hotel's current '${planName}' plan. Upgrade your plan to unlock this feature.`
    );
    this.name = "SubscriptionFeatureError";
    this.code = "FEATURE_NOT_AVAILABLE";
    this.statusCode = 403;
    this.feature = feature;
    this.planName = planName;
  }
}

/**
 * Custom Error for Inactive/Suspended/Expired Subscription Status
 */
export class SubscriptionStatusError extends Error {
  code: string;
  statusCode: number;
  status: string;

  constructor(status: string, message: string, code: "SUBSCRIPTION_INACTIVE" | "SUBSCRIPTION_SUSPENDED" | "SUBSCRIPTION_EXPIRED") {
    super(message);
    this.name = "SubscriptionStatusError";
    this.code = code;
    this.statusCode = 403;
    this.status = status;
  }
}

export interface ActiveSubscriptionResult {
  subscription: any;
  plan: ISubscriptionPlan;
}

/**
 * Retrieves the hotel's active subscription and populated plan.
 * Throws SubscriptionStatusError if subscription is missing, suspended, expired, or cancelled.
 */
export async function getHotelActiveSubscription(
  hotelId: string | Types.ObjectId
): Promise<ActiveSubscriptionResult> {
  await connectToDatabase();

  const formattedHotelId =
    typeof hotelId === "string" ? new mongoose.Types.ObjectId(hotelId) : hotelId;

  // Query current subscription first
  let sub: any = await HotelSubscription.findOne({
    hotelId: formattedHotelId,
    isCurrent: true,
  }).populate<{ planId: ISubscriptionPlan }>({
    path: "planId",
    model: SubscriptionPlan,
  });

  // Fallback to latest subscription if isCurrent flag is missing
  if (!sub) {
    sub = await HotelSubscription.findOne({
      hotelId: formattedHotelId,
    })
      .sort({ createdAt: -1 })
      .populate<{ planId: ISubscriptionPlan }>({
        path: "planId",
        model: SubscriptionPlan,
      });
  }

  if (!sub || !sub.planId) {
    throw new SubscriptionStatusError(
      "NONE",
      "No active subscription plan found for this hotel property. Please assign a subscription plan to continue.",
      "SUBSCRIPTION_INACTIVE"
    );
  }

  // Check Subscription Lifecycle Status
  if (sub.status === "SUSPENDED") {
    throw new SubscriptionStatusError(
      "SUSPENDED",
      "Hotel subscription is currently SUSPENDED. Platform operations and modifications are disabled. Please contact administration.",
      "SUBSCRIPTION_SUSPENDED"
    );
  }

  if (sub.status === "EXPIRED") {
    throw new SubscriptionStatusError(
      "EXPIRED",
      "Hotel subscription has EXPIRED. Please renew or upgrade your SaaS plan to proceed.",
      "SUBSCRIPTION_EXPIRED"
    );
  }

  if (sub.status === "CANCELLED") {
    throw new SubscriptionStatusError(
      "CANCELLED",
      "Hotel subscription has been CANCELLED. Please activate a new subscription plan to proceed.",
      "SUBSCRIPTION_INACTIVE"
    );
  }

  const plan = sub.planId as unknown as ISubscriptionPlan;

  return {
    subscription: sub,
    plan,
  };
}

/**
 * Reusable helper: hasFeature(hotelId, feature)
 * Returns boolean indicating whether the hotel's active plan includes the requested feature.
 *
 * Examples:
 * hasFeature(hotelId, "booking")
 * hasFeature(hotelId, "billing")
 * hasFeature(hotelId, "roomService")
 * hasFeature(hotelId, "reports")
 */
export async function hasFeature(
  hotelId: string | Types.ObjectId,
  feature: string
): Promise<boolean> {
  try {
    const { plan } = await getHotelActiveSubscription(hotelId);
    if (!plan || !Array.isArray(plan.features)) return false;

    // Check case-insensitive match or standard key match
    return plan.features.some(
      (f) => f.toLowerCase() === feature.toLowerCase() || f.toLowerCase().includes(feature.toLowerCase())
    );
  } catch {
    return false;
  }
}

/**
 * Reusable assertion: requireHotelFeature(hotelId, feature)
 * Enforces feature access on the backend. Throws SubscriptionFeatureError if feature is not available.
 */
export async function requireHotelFeature(
  hotelId: string | Types.ObjectId,
  feature: string
): Promise<ActiveSubscriptionResult> {
  const active = await getHotelActiveSubscription(hotelId);
  const { plan } = active;

  const isEnabled = plan.features.some(
    (f) => f.toLowerCase() === feature.toLowerCase() || f.toLowerCase().includes(feature.toLowerCase())
  );

  if (!isEnabled) {
    throw new SubscriptionFeatureError(feature, plan.name);
  }

  return active;
}

/**
 * Checks Room Limit for a hotel.
 */
export async function checkRoomLimit(
  hotelId: string | Types.ObjectId
): Promise<{ allowed: boolean; current: number; max: number; planName: string }> {
  const { plan } = await getHotelActiveSubscription(hotelId);
  await connectToDatabase();

  const currentRooms = await Room.countDocuments({
    hotelId,
    isActive: true,
  });

  const maxRooms = plan.maxRooms; // -1 represents Unlimited

  const allowed = maxRooms === -1 || currentRooms < maxRooms;

  return {
    allowed,
    current: currentRooms,
    max: maxRooms,
    planName: plan.name,
  };
}

/**
 * Backend Room Limit Enforcement:
 * Throws SubscriptionLimitError (ROOM_LIMIT_REACHED) before room creation if limit is reached.
 */
export async function assertRoomLimit(
  hotelId: string | Types.ObjectId
): Promise<{ current: number; max: number; planName: string }> {
  const check = await checkRoomLimit(hotelId);

  if (!check.allowed) {
    throw new SubscriptionLimitError(
      "Your current plan has reached its Room limit. Upgrade your plan to add more rooms.",
      "ROOM_LIMIT_REACHED",
      "rooms",
      check.current,
      check.max,
      check.planName
    );
  }

  return check;
}

/**
 * Checks Staff Limit for a hotel.
 */
export async function checkStaffLimit(
  hotelId: string | Types.ObjectId
): Promise<{ allowed: boolean; current: number; max: number; planName: string }> {
  const { plan } = await getHotelActiveSubscription(hotelId);
  await connectToDatabase();

  const currentStaff = await User.countDocuments({
    hotelId,
    role: USER_ROLES.STAFF,
    isActive: true,
  });

  const maxStaff = plan.maxStaff; // -1 represents Unlimited

  const allowed = maxStaff === -1 || currentStaff < maxStaff;

  return {
    allowed,
    current: currentStaff,
    max: maxStaff,
    planName: plan.name,
  };
}

/**
 * Backend Staff Limit Enforcement:
 * Throws SubscriptionLimitError (STAFF_LIMIT_REACHED) before staff creation if limit is reached.
 */
export async function assertStaffLimit(
  hotelId: string | Types.ObjectId
): Promise<{ current: number; max: number; planName: string }> {
  const check = await checkStaffLimit(hotelId);

  if (!check.allowed) {
    throw new SubscriptionLimitError(
      "Your current plan has reached its Staff limit. Upgrade your plan to add more staff.",
      "STAFF_LIMIT_REACHED",
      "staff",
      check.current,
      check.max,
      check.planName
    );
  }

  return check;
}

/**
 * Checks Receptionist Limit for a hotel.
 */
export async function checkReceptionistLimit(
  hotelId: string | Types.ObjectId
): Promise<{ allowed: boolean; current: number; max: number; planName: string }> {
  const { plan } = await getHotelActiveSubscription(hotelId);
  await connectToDatabase();

  const currentReceptionists = await User.countDocuments({
    hotelId,
    role: USER_ROLES.RECEPTIONIST,
    isActive: true,
  });

  const maxReceptionists = plan.maxReceptionists; // -1 represents Unlimited

  const allowed = maxReceptionists === -1 || currentReceptionists < maxReceptionists;

  return {
    allowed,
    current: currentReceptionists,
    max: maxReceptionists,
    planName: plan.name,
  };
}

/**
 * Backend Receptionist Limit Enforcement:
 * Throws SubscriptionLimitError (RECEPTIONIST_LIMIT_REACHED) before receptionist creation if limit is reached.
 */
export async function assertReceptionistLimit(
  hotelId: string | Types.ObjectId
): Promise<{ current: number; max: number; planName: string }> {
  const check = await checkReceptionistLimit(hotelId);

  if (!check.allowed) {
    throw new SubscriptionLimitError(
      "Your current plan has reached its Receptionist limit. Upgrade your plan to add more receptionists.",
      "RECEPTIONIST_LIMIT_REACHED",
      "receptionists",
      check.current,
      check.max,
      check.planName
    );
  }

  return check;
}

/**
 * Central Error Handler helper for subscription limits and feature errors in Next.js Route Handlers.
 */
export function handleSubscriptionEnforcementError(error: unknown) {
  if (
    error instanceof SubscriptionLimitError ||
    (error as any)?.name === "SubscriptionLimitError"
  ) {
    const err = error as SubscriptionLimitError;
    return NextResponse.json(
      {
        error: err.message,
        code: err.code,
        limitType: err.limitType,
        current: err.currentCount,
        max: err.maxLimit,
        planName: err.planName,
      },
      { status: 403 }
    );
  }

  if (
    error instanceof SubscriptionFeatureError ||
    (error as any)?.name === "SubscriptionFeatureError"
  ) {
    const err = error as SubscriptionFeatureError;
    return NextResponse.json(
      {
        error: err.message,
        code: err.code,
        feature: err.feature,
        planName: err.planName,
      },
      { status: 403 }
    );
  }

  if (
    error instanceof SubscriptionStatusError ||
    (error as any)?.name === "SubscriptionStatusError"
  ) {
    const err = error as SubscriptionStatusError;
    return NextResponse.json(
      {
        error: err.message,
        code: err.code,
        status: err.status,
      },
      { status: 403 }
    );
  }

  return null;
}
