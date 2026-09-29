import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Hotel from "@/models/Hotel";
import User from "@/models/User";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { logAudit } from "@/lib/audit";
import { AUDIT_ACTIONS, AuditAction } from "@/types/audit";

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

    // Fetch managers and staff summary
    const managers = await User.find({
      hotelId: id,
      role: USER_ROLES.MANAGER,
    })
      .select("name email role hotelId isActive createdAt")
      .lean();

    const staffCount = await User.countDocuments({
      hotelId: id,
      role: { $in: [USER_ROLES.RECEPTIONIST, USER_ROLES.STAFF] },
    });

    return NextResponse.json({
      success: true,
      hotel,
      managers,
      staffCount,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(
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

    const previousHotel = await Hotel.findById(id);
    if (!previousHotel) {
      return NextResponse.json(
        { error: "Hotel not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, email, phone, address, city, state, country, status } = body;

    const updateData: Record<string, any> = {};

    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (address !== undefined) updateData.address = address.trim();
    if (city !== undefined) updateData.city = city.trim();
    if (state !== undefined) updateData.state = state.trim();
    if (country !== undefined) updateData.country = country.trim();

    if (status !== undefined) {
      if (!["ACTIVE", "INACTIVE", "SUSPENDED"].includes(status)) {
        return NextResponse.json(
          { error: "Status must be ACTIVE, INACTIVE, or SUSPENDED" },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    const updatedHotel = await Hotel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedHotel) {
      return NextResponse.json(
        { error: "Hotel not found" },
        { status: 404 }
      );
    }

    // Determine specific audit action
    let auditAction: AuditAction = AUDIT_ACTIONS.HOTEL_UPDATED;
    let auditDesc = `Hotel '${updatedHotel.name}' (${updatedHotel.hotelCode}) updated`;

    if (status && status !== previousHotel.status) {
      if (status === "ACTIVE") {
        auditAction = AUDIT_ACTIONS.HOTEL_ACTIVATED;
        auditDesc = `Hotel '${updatedHotel.name}' (${updatedHotel.hotelCode}) was ACTIVATED`;
      } else if (status === "SUSPENDED") {
        auditAction = AUDIT_ACTIONS.HOTEL_SUSPENDED;
        auditDesc = `Hotel '${updatedHotel.name}' (${updatedHotel.hotelCode}) was SUSPENDED`;
      }
    }

    await logAudit({
      userId: adminUser.userId,
      hotelId: updatedHotel._id,
      action: auditAction,
      entity: "Hotel",
      entityId: updatedHotel._id.toString(),
      description: auditDesc,
      metadata: {
        previousStatus: previousHotel.status,
        newStatus: updatedHotel.status,
        updatedFields: Object.keys(updateData),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Hotel updated successfully",
      hotel: updatedHotel,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
