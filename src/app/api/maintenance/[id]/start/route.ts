import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import MaintenanceRequest from "@/models/MaintenanceRequest";
import Room from "@/models/Room";
import { requireHotelUser, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";

/**
 * POST /api/maintenance/[id]/start
 * Staff starts work on assigned maintenance task.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireHotelUser(req);
    const { id } = await params;
    await connectToDatabase();

    const query: Record<string, any> = {
      hotelId: authUser.hotelId,
      ...(mongoose.Types.ObjectId.isValid(id)
        ? { _id: new mongoose.Types.ObjectId(id) }
        : { requestId: id.toUpperCase() }),
    };

    if (authUser.role === USER_ROLES.STAFF) {
      query.assignedTo = new mongoose.Types.ObjectId(authUser.userId);
    }

    const request = await MaintenanceRequest.findOne(query);
    if (!request) {
      return NextResponse.json(
        { error: "Maintenance request not found or access denied." },
        { status: 404 }
      );
    }

    if (request.status === "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Maintenance request is already in progress." },
        { status: 400 }
      );
    }

    if (request.status === "RESOLVED") {
      return NextResponse.json(
        { error: "Maintenance request is already resolved." },
        { status: 400 }
      );
    }

    request.status = "IN_PROGRESS";
    request.startedAt = new Date();
    await request.save();

    // Ensure Room is in MAINTENANCE status if not OCCUPIED
    const room = await Room.findById(request.roomId);
    if (room && room.status !== "OCCUPIED" && room.status !== "OUT_OF_SERVICE") {
      await Room.findByIdAndUpdate(room._id, { status: "MAINTENANCE" });
    }

    const populated = await MaintenanceRequest.findById(request._id)
      .populate("roomId", "roomNumber floor roomType status")
      .populate("reportedBy", "name email role")
      .populate("assignedTo", "name email role")
      .lean();

    return NextResponse.json({
      success: true,
      message: `Maintenance started for Room ${(populated?.roomId as any)?.roomNumber || ""}.`,
      request: populated,
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
