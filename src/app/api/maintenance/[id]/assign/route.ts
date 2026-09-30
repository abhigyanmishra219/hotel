import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import MaintenanceRequest from "@/models/MaintenanceRequest";
import User from "@/models/User";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";

/**
 * POST /api/maintenance/[id]/assign
 * Manager assigns maintenance request to same-hotel staff.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireRole([USER_ROLES.MANAGER], req);
    const { id } = await params;
    await connectToDatabase();

    const query: Record<string, any> = {
      hotelId: authUser.hotelId,
      ...(mongoose.Types.ObjectId.isValid(id)
        ? { _id: new mongoose.Types.ObjectId(id) }
        : { requestId: id.toUpperCase() }),
    };

    const request = await MaintenanceRequest.findOne(query);
    if (!request) {
      return NextResponse.json(
        { error: "Maintenance request not found in your hotel" },
        { status: 404 }
      );
    }

    if (request.status === "RESOLVED") {
      return NextResponse.json(
        { error: "Cannot reassign an already resolved maintenance request." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { staffId } = body;

    if (!staffId || !mongoose.Types.ObjectId.isValid(staffId)) {
      return NextResponse.json(
        { error: "Valid staffId is required" },
        { status: 400 }
      );
    }

    const staffUser = await User.findOne({
      _id: staffId,
      hotelId: authUser.hotelId,
      role: USER_ROLES.STAFF,
      isActive: true,
    });

    if (!staffUser) {
      return NextResponse.json(
        { error: "Staff member not found in your hotel or is inactive" },
        { status: 404 }
      );
    }

    request.assignedTo = staffUser._id as mongoose.Types.ObjectId;
    if (request.status === "OPEN") {
      request.status = "ASSIGNED";
    }

    await request.save();

    const populated = await MaintenanceRequest.findById(request._id)
      .populate("roomId", "roomNumber floor roomType status")
      .populate("reportedBy", "name email role")
      .populate("assignedTo", "name email role")
      .lean();

    return NextResponse.json({
      success: true,
      message: `Request ${request.requestId} assigned to ${staffUser.name}.`,
      request: populated,
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
