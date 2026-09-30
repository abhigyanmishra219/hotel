import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Hotel from "@/models/Hotel";
import { authenticateManager, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { handleSubscriptionEnforcementError } from "@/lib/subscription-enforcement";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/manager/staff/[id]
 * Retrieves staff member details strictly belonging to the authenticated Manager's hotel.
 * Prevents cross-tenant information exposure (returns 404 if in another hotel).
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const authManager = await authenticateManager(req);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    await connectToDatabase();

    // STRICT MULTI-TENANT QUERY: Must match authenticated hotelId and role = STAFF
    const staff = await User.findOne({
      _id: id,
      hotelId: authManager.hotelId,
      role: USER_ROLES.STAFF,
    })
      .select("_id name email phone role hotelId isActive mustChangePassword createdAt updatedAt")
      .lean();

    if (!staff) {
      return NextResponse.json(
        { error: "Staff member not found or does not belong to your hotel property" },
        { status: 404 }
      );
    }

    const hotel = await Hotel.findById(authManager.hotelId).select("name hotelCode").lean();

    return NextResponse.json({
      success: true,
      staff: {
        ...staff,
        hotelName: hotel?.name || "Your Hotel",
        hotelCode: hotel?.hotelCode || "HOT-000000",
      },
    });
  } catch (error: any) {
    const subError = handleSubscriptionEnforcementError(error);
    if (subError) return subError;
    return handleAuthError(error);
  }
}

/**
 * PUT / PATCH /api/manager/staff/[id]
 * Updates staff member details (name, phone, email, isActive).
 * IMMUTABILITY: Manager CANNOT edit role, hotelId, or direct password.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const authManager = await authenticateManager(req);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    await connectToDatabase();

    const existingStaff = await User.findOne({
      _id: id,
      hotelId: authManager.hotelId,
      role: USER_ROLES.STAFF,
    });

    if (!existingStaff) {
      return NextResponse.json(
        { error: "Staff member not found or access denied" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, phone, email, isActive } = body;

    // 1. Name update
    if (name !== undefined) {
      if (!name || !String(name).trim()) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      existingStaff.name = String(name).trim();
    }

    // 2. Phone update
    if (phone !== undefined) {
      existingStaff.phone = String(phone || "").trim();
    }

    // 3. Email update (check uniqueness if changed)
    if (email !== undefined) {
      const cleanEmail = String(email).toLowerCase().trim();
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(cleanEmail)) {
        return NextResponse.json(
          { error: "Please provide a valid email address" },
          { status: 400 }
        );
      }

      if (cleanEmail !== existingStaff.email) {
        const conflict = await User.findOne({
          email: cleanEmail,
          _id: { $ne: existingStaff._id },
        });
        if (conflict) {
          return NextResponse.json(
            { error: `An account with email '${cleanEmail}' already exists` },
            { status: 409 }
          );
        }
        existingStaff.email = cleanEmail;
      }
    }

    // 4. Status toggle
    if (isActive !== undefined) {
      existingStaff.isActive = Boolean(isActive);
    }

    // Explicitly guarantee role and hotelId remain unchanged
    existingStaff.role = USER_ROLES.STAFF;
    existingStaff.hotelId = authManager.hotelId as any;

    await existingStaff.save();

    return NextResponse.json({
      success: true,
      message: `Staff member '${existingStaff.name}' updated successfully`,
      staff: {
        _id: existingStaff._id,
        name: existingStaff.name,
        email: existingStaff.email,
        phone: existingStaff.phone,
        role: existingStaff.role,
        hotelId: existingStaff.hotelId,
        isActive: existingStaff.isActive,
        mustChangePassword: existingStaff.mustChangePassword,
        updatedAt: existingStaff.updatedAt,
      },
    });
  } catch (error: any) {
    const subError = handleSubscriptionEnforcementError(error);
    if (subError) return subError;
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }
    return handleAuthError(error);
  }
}

export async function PUT(req: NextRequest, context: RouteParams) {
  return PATCH(req, context);
}

/**
 * DELETE /api/manager/staff/[id]
 * Soft delete: Marks staff as inactive (isActive = false) to preserve operational logs.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
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

    staff.isActive = false;
    await staff.save();

    return NextResponse.json({
      success: true,
      message: `Staff member '${staff.name}' has been deactivated`,
      staff: {
        _id: staff._id,
        name: staff.name,
        isActive: false,
      },
    });
  } catch (error: any) {
    const subError = handleSubscriptionEnforcementError(error);
    if (subError) return subError;
    return handleAuthError(error);
  }
}
