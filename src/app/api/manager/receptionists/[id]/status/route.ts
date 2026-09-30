import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { authenticateManager, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import {
  assertReceptionistLimit,
  handleSubscriptionEnforcementError,
} from "@/lib/subscription-enforcement";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/manager/receptionists/[id]/status
 * Dedicated status endpoint for activating or deactivating a receptionist account.
 * Reactivation checks receptionist quota limits before allowing activation.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const authManager = await authenticateManager(req);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Receptionist not found" }, { status: 404 });
    }

    await connectToDatabase();

    const receptionist = await User.findOne({
      _id: id,
      hotelId: authManager.hotelId,
      role: USER_ROLES.RECEPTIONIST,
    });

    if (!receptionist) {
      return NextResponse.json(
        { error: "Receptionist not found or access denied" },
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

    // If reactivating from inactive state, verify receptionist subscription limits
    if (isActive && !receptionist.isActive) {
      await assertReceptionistLimit(authManager.hotelId);
    }

    receptionist.isActive = isActive;
    await receptionist.save();

    return NextResponse.json({
      success: true,
      message: `Receptionist '${receptionist.name}' is now ${isActive ? "Active" : "Inactive"}`,
      receptionist: {
        _id: receptionist._id,
        name: receptionist.name,
        email: receptionist.email,
        role: receptionist.role,
        isActive: receptionist.isActive,
        updatedAt: receptionist.updatedAt,
      },
    });
  } catch (error: any) {
    const subError = handleSubscriptionEnforcementError(error);
    if (subError) return subError;
    return handleAuthError(error);
  }
}
