import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { authenticateManager, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import {
  assertStaffLimit,
  handleSubscriptionEnforcementError,
} from "@/lib/subscription-enforcement";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/manager/staff/[id]/status
 * Dedicated status endpoint for activating or deactivating a staff account.
 * Reactivation checks staff quota limits before allowing activation.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const authManager = await authenticateManager(req);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    await connectToDatabase();

    const staff = await User.findOne({
      _id: id,
      hotelId: authManager.hotelId,
      role: USER_ROLES.STAFF,
    });

    if (!staff) {
      return NextResponse.json(
        { error: "Staff member not found or access denied" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { isActive } = body;

    if (isActive === undefined || typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "Field 'isActive' (boolean) is required" },
        { status: 400 }
      );
    }

    // If reactivating from inactive state, verify staff subscription limits
    if (isActive && !staff.isActive) {
      await assertStaffLimit(authManager.hotelId);
    }

    staff.isActive = isActive;
    await staff.save();

    return NextResponse.json({
      success: true,
      message: `Staff member '${staff.name}' is now ${isActive ? "Active" : "Inactive"}`,
      staff: {
        _id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        isActive: staff.isActive,
        updatedAt: staff.updatedAt,
      },
    });
  } catch (error: any) {
    const subError = handleSubscriptionEnforcementError(error);
    if (subError) return subError;
    return handleAuthError(error);
  }
}
