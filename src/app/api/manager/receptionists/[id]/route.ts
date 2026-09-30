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
 * GET /api/manager/receptionists/[id]
 * Retrieves receptionist details strictly belonging to the authenticated Manager's hotel.
 * Prevents cross-tenant information exposure (returns 404 if in another hotel).
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const authManager = await authenticateManager(req);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Receptionist not found" }, { status: 404 });
    }

    await connectToDatabase();

    // STRICT MULTI-TENANT QUERY: Must match authenticated hotelId and role = RECEPTIONIST
    const receptionist = await User.findOne({
      _id: id,
      hotelId: authManager.hotelId,
      role: USER_ROLES.RECEPTIONIST,
    })
      .select("_id name email phone role hotelId isActive mustChangePassword createdAt updatedAt")
      .lean();

    if (!receptionist) {
      return NextResponse.json(
        { error: "Receptionist not found or does not belong to your hotel property" },
        { status: 404 }
      );
    }

    const hotel = await Hotel.findById(authManager.hotelId).select("name hotelCode").lean();

    return NextResponse.json({
      success: true,
      receptionist: {
        ...receptionist,
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
 * PUT / PATCH /api/manager/receptionists/[id]
 * Updates receptionist details (name, phone, email, isActive).
 * IMMUTABILITY: Manager CANNOT edit role, hotelId, or direct password.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const authManager = await authenticateManager(req);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Receptionist not found" }, { status: 404 });
    }

    await connectToDatabase();

    const existingReceptionist = await User.findOne({
      _id: id,
      hotelId: authManager.hotelId,
      role: USER_ROLES.RECEPTIONIST,
    });

    if (!existingReceptionist) {
      return NextResponse.json(
        { error: "Receptionist not found or access denied" },
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
      existingReceptionist.name = String(name).trim();
    }

    // 2. Phone update
    if (phone !== undefined) {
      existingReceptionist.phone = String(phone || "").trim();
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

      if (cleanEmail !== existingReceptionist.email) {
        const conflict = await User.findOne({
          email: cleanEmail,
          _id: { $ne: existingReceptionist._id },
        });
        if (conflict) {
          return NextResponse.json(
            { error: `An account with email '${cleanEmail}' already exists` },
            { status: 409 }
          );
        }
        existingReceptionist.email = cleanEmail;
      }
    }

    // 4. Status toggle
    if (isActive !== undefined) {
      existingReceptionist.isActive = Boolean(isActive);
    }

    // Explicitly guarantee role and hotelId remain unchanged
    existingReceptionist.role = USER_ROLES.RECEPTIONIST;
    existingReceptionist.hotelId = authManager.hotelId as any;

    await existingReceptionist.save();

    return NextResponse.json({
      success: true,
      message: `Receptionist '${existingReceptionist.name}' updated successfully`,
      receptionist: {
        _id: existingReceptionist._id,
        name: existingReceptionist.name,
        email: existingReceptionist.email,
        phone: existingReceptionist.phone,
        role: existingReceptionist.role,
        hotelId: existingReceptionist.hotelId,
        isActive: existingReceptionist.isActive,
        mustChangePassword: existingReceptionist.mustChangePassword,
        updatedAt: existingReceptionist.updatedAt,
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
 * DELETE /api/manager/receptionists/[id]
 * Soft delete: Marks receptionist as inactive (isActive = false) to preserve booking/billing logs.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
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

    receptionist.isActive = false;
    await receptionist.save();

    return NextResponse.json({
      success: true,
      message: `Receptionist '${receptionist.name}' has been deactivated`,
      receptionist: {
        _id: receptionist._id,
        name: receptionist.name,
        isActive: false,
      },
    });
  } catch (error: any) {
    const subError = handleSubscriptionEnforcementError(error);
    if (subError) return subError;
    return handleAuthError(error);
  }
}
