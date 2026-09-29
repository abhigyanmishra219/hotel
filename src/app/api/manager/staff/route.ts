import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { requireHotelUser, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import {
  assertStaffLimit,
  assertReceptionistLimit,
  checkStaffLimit,
  checkReceptionistLimit,
  handleSubscriptionEnforcementError,
} from "@/lib/subscription-enforcement";

/**
 * GET /api/manager/staff
 * Lists all staff and receptionists belonging to the manager's hotel.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireHotelUser(req);
    await connectToDatabase();

    const staffUsers = await User.find({
      hotelId: authUser.hotelId,
      role: { $in: [USER_ROLES.STAFF, USER_ROLES.RECEPTIONIST] },
    })
      .select("name email role isActive createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const staffQuota = await checkStaffLimit(authUser.hotelId).catch(() => ({
      allowed: true,
      current: 0,
      max: -1,
      planName: "Standard",
    }));

    const receptionistQuota = await checkReceptionistLimit(authUser.hotelId).catch(() => ({
      allowed: true,
      current: 0,
      max: -1,
      planName: "Standard",
    }));

    return NextResponse.json({
      success: true,
      count: staffUsers.length,
      staff: staffUsers,
      quotas: {
        staff: staffQuota,
        receptionists: receptionistQuota,
      },
    });
  } catch (error) {
    const subError = handleSubscriptionEnforcementError(error);
    if (subError) return subError;
    return handleAuthError(error);
  }
}

/**
 * POST /api/manager/staff
 * Creates a new Staff or Receptionist for the hotel.
 * BACKEND ENFORCEMENT: Enforces maxStaff or maxReceptionists limit before creation.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await requireHotelUser(req);
    await connectToDatabase();

    const body = await req.json();
    const { name, email, password, role } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    if (role !== USER_ROLES.STAFF && role !== USER_ROLES.RECEPTIONIST) {
      return NextResponse.json(
        { error: "Role must be either STAFF or RECEPTIONIST" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.toLowerCase().trim();

    // 1. CRITICAL: Enforce backend limits based on role
    if (role === USER_ROLES.STAFF) {
      await assertStaffLimit(authUser.hotelId);
    } else if (role === USER_ROLES.RECEPTIONIST) {
      await assertReceptionistLimit(authUser.hotelId);
    }

    // 2. Check if user already exists
    const existing = await User.findOne({ email: trimmedEmail });
    if (existing) {
      return NextResponse.json(
        { error: `A user with email '${trimmedEmail}' already exists` },
        { status: 409 }
      );
    }

    // 3. Create user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name: name.trim(),
      email: trimmedEmail,
      password: hashedPassword,
      role,
      hotelId: authUser.hotelId,
      isActive: true,
    });

    return NextResponse.json(
      {
        success: true,
        message: `${role} '${newUser.name}' created successfully`,
        user: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          hotelId: newUser.hotelId,
          isActive: newUser.isActive,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    const subError = handleSubscriptionEnforcementError(error);
    if (subError) return subError;
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }
    return handleAuthError(error);
  }
}
