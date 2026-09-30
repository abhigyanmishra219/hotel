import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import RoomServiceRequest from "@/models/RoomServiceRequest";
import User from "@/models/User";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";

/**
 * POST /api/room-service/[id]/assign
 * Manager assigns room service request to staff member of the same hotel.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireRole([USER_ROLES.MANAGER, USER_ROLES.RECEPTIONIST], req);
    const { id } = await params;
    await connectToDatabase();

    const query: Record<string, any> = {
      hotelId: authUser.hotelId,
      ...(mongoose.Types.ObjectId.isValid(id)
        ? { _id: new mongoose.Types.ObjectId(id) }
        : { requestId: id.toUpperCase() }),
    };

    const request = await RoomServiceRequest.findOne(query);
    if (!request) {
      return NextResponse.json(
        { error: "Room service request not found in your hotel" },
        { status: 404 }
      );
    }

    if (request.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Cannot reassign a completed room service request." },
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
    if (request.status === "PENDING") {
      request.status = "ASSIGNED";
    }

    await request.save();

    const populated = await RoomServiceRequest.findById(request._id)
      .populate("roomId", "roomNumber floor roomType")
      .populate("bookingId", "bookingId customerId")
      .populate("requestedBy", "name email role")
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
