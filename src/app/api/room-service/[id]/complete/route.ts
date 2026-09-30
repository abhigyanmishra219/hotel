import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import RoomServiceRequest from "@/models/RoomServiceRequest";
import { requireHotelUser, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";

/**
 * POST & PATCH /api/room-service/[id]/complete
 * Staff completes room service delivery.
 */
async function handleComplete(
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

    const request = await RoomServiceRequest.findOne(query);
    if (!request) {
      return NextResponse.json(
        { error: "Room service request not found or access denied." },
        { status: 404 }
      );
    }

    // Double completion check
    if (request.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Room service request has already been completed." },
        { status: 409 }
      );
    }

    // Must be in progress to complete
    if (request.status === "PENDING" || request.status === "ASSIGNED") {
      return NextResponse.json(
        { error: "Cannot complete a pending room service task. Start service before completing." },
        { status: 400 }
      );
    }

    if (request.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot complete a cancelled request." },
        { status: 400 }
      );
    }

    request.status = "COMPLETED";
    request.completedAt = new Date();
    if (!request.startedAt) {
      request.startedAt = new Date();
    }
    await request.save();

    // NOTE: Room status is explicitly NOT modified. Room readiness belongs exclusively to Housekeeping.

    const populated = await RoomServiceRequest.findById(request._id)
      .populate("roomId", "roomNumber floor roomType status")
      .populate({
        path: "bookingId",
        select: "bookingId customerId",
        populate: {
          path: "customerId",
          select: "fullName name",
        },
      })
      .populate("requestedBy", "name email role")
      .populate("assignedTo", "name email role")
      .lean();

    return NextResponse.json({
      success: true,
      message: `Room service request ${request.requestId} completed successfully.`,
      request: populated,
    });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleComplete(req, context);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleComplete(req, context);
}
