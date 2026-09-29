import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Hotel from "@/models/Hotel";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import HotelSubscription from "@/models/HotelSubscription";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { logAudit } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/types/audit";

/**
 * GET /api/admin/hotels/[id]/subscription
 * Fetches the current subscription and full subscription history for a hotel.
 * Only SYSTEM_ADMIN can access.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(USER_ROLES.SYSTEM_ADMIN, req);
    await connectToDatabase();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid hotel ID format" },
        { status: 400 }
      );
    }

    const hotel = await Hotel.findById(id).lean();
    if (!hotel) {
      return NextResponse.json(
        { error: "Hotel not found" },
        { status: 404 }
      );
    }

    // 1. Fetch current subscription
    let currentSubscription = await HotelSubscription.findOne({
      hotelId: id,
      isCurrent: true,
    })
      .populate("planId")
      .lean();

    // Fallback: If no record has isCurrent: true, get latest subscription
    if (!currentSubscription) {
      currentSubscription = await HotelSubscription.findOne({
        hotelId: id,
      })
        .sort({ createdAt: -1 })
        .populate("planId")
        .lean();
    }

    // 2. Fetch full history in reverse chronological order
    const history = await HotelSubscription.find({
      hotelId: id,
    })
      .sort({ createdAt: -1 })
      .populate("planId")
      .lean();

    return NextResponse.json({
      success: true,
      currentSubscription,
      history,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * POST /api/admin/hotels/[id]/subscription
 * Assigns or changes the subscription plan for a hotel.
 * Validates plan is ACTIVE, validates dates, and safely archives previous subscriptions into history.
 * Only SYSTEM_ADMIN can access.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireRole(USER_ROLES.SYSTEM_ADMIN, req);
    await connectToDatabase();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid hotel ID format" },
        { status: 400 }
      );
    }

    const hotel = await Hotel.findById(id);
    if (!hotel) {
      return NextResponse.json(
        { error: "Hotel not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      planId,
      billingCycle = "MONTHLY",
      startDate,
      endDate,
      status = "ACTIVE",
      paymentStatus = "PAID",
      changeReason,
    } = body;

    // 1. Validate planId
    if (!planId || !mongoose.Types.ObjectId.isValid(planId)) {
      return NextResponse.json(
        { error: "A valid Subscription Plan ID is required" },
        { status: 400 }
      );
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return NextResponse.json(
        { error: "Subscription plan not found" },
        { status: 404 }
      );
    }

    // 2. Validate plan status - DO NOT assign an inactive plan
    if (plan.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error: `Cannot assign inactive subscription plan '${plan.name}'. Please activate the plan first.`,
        },
        { status: 400 }
      );
    }

    // 3. Validate and compute dates
    let computedStartDate: Date;
    let computedEndDate: Date;

    if (startDate) {
      computedStartDate = new Date(startDate);
      if (isNaN(computedStartDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid start date format" },
          { status: 400 }
        );
      }
    } else {
      computedStartDate = new Date();
    }

    if (endDate) {
      computedEndDate = new Date(endDate);
      if (isNaN(computedEndDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid end date format" },
          { status: 400 }
        );
      }
    } else {
      // Default: 30 days for monthly, 365 days for annual
      computedEndDate = new Date(computedStartDate.getTime());
      if (billingCycle === "YEARLY") {
        computedEndDate.setFullYear(computedEndDate.getFullYear() + 1);
      } else {
        computedEndDate.setDate(computedEndDate.getDate() + 30);
      }
    }

    if (computedEndDate.getTime() < computedStartDate.getTime()) {
      return NextResponse.json(
        { error: "End date must be on or after start date" },
        { status: 400 }
      );
    }

    // 4. Safely handle transition of existing subscription(s)
    const existingCurrentSubs = await HotelSubscription.find({
      hotelId: id,
      isCurrent: true,
    }).populate("planId");

    let defaultReason = `Assigned initial plan: ${plan.name}`;

    if (existingCurrentSubs.length > 0) {
      const oldPlan = (existingCurrentSubs[0].planId as any)?.name || "Previous Plan";
      defaultReason = `Transitioned from ${oldPlan} to ${plan.name}`;

      // Update all existing current records to isCurrent: false without deleting them
      await HotelSubscription.updateMany(
        { hotelId: id, isCurrent: true },
        {
          $set: {
            isCurrent: false,
          },
        }
      );
    }

    // 5. Create new current subscription
    const newSubscription = await HotelSubscription.create({
      hotelId: id,
      planId: plan._id,
      status,
      startDate: computedStartDate,
      endDate: computedEndDate,
      paymentStatus,
      isCurrent: true,
      changeReason: changeReason?.trim() || defaultReason,
    });

    const isPlanChange = existingCurrentSubs.length > 0;
    await logAudit({
      userId: adminUser.userId,
      hotelId: hotel._id,
      action: isPlanChange ? AUDIT_ACTIONS.SUBSCRIPTION_CHANGED : AUDIT_ACTIONS.SUBSCRIPTION_ASSIGNED,
      entity: "HotelSubscription",
      entityId: newSubscription._id.toString(),
      description: isPlanChange
        ? `Subscription for '${hotel.name}' changed to '${plan.name}' (${status})`
        : `Initial subscription '${plan.name}' (${status}) assigned to '${hotel.name}'`,
      metadata: {
        planName: plan.name,
        planId: plan._id.toString(),
        status,
        paymentStatus,
        startDate: computedStartDate,
        endDate: computedEndDate,
        changeReason: newSubscription.changeReason,
      },
    });

    const populatedSubscription = await HotelSubscription.findById(
      newSubscription._id
    )
      .populate("planId")
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: `Hotel subscription updated to '${plan.name}' (${status})`,
        subscription: populatedSubscription,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}
