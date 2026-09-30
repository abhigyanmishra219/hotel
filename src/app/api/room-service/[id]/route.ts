import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import RoomServiceRequest from "@/models/RoomServiceRequest";
import { requireHotelUser, requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";

/**
 * GET /api/room-service/[id]
 */
export async function GET(
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

    const request = await RoomServiceRequest.findOne(query)
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

    if (!request) {
      return NextResponse.json(
        { error: "Room service request not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, request });
  } catch (err) {
    return handleAuthError(err);
  }
}

/**
 * PATCH /api/room-service/[id]
 * Updates request notes (Staff, Manager, Receptionist) or priority/cancellation (Manager, Receptionist).
 */
export async function PATCH(
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

    // If STAFF, must be assigned to this specific task
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

    const body = await req.json();

    // Prevent staff from tampering with protected properties
    if (authUser.role === USER_ROLES.STAFF) {
      if (body.hotelId || body.assignedTo || body.roomId || body.role) {
        return NextResponse.json(
          { error: "Unauthorized attempt to modify protected properties." },
          { status: 403 }
        );
      }

      if (body.status && body.status !== request.status) {
        return NextResponse.json(
          { error: "Status must be updated via the dedicated start/complete endpoints." },
          { status: 400 }
        );
      }

      if (body.notes !== undefined && typeof body.notes === "string") {
        request.notes = body.notes.trim();
      }
    } else {
      // Manager & Receptionist
      const { priority, notes, status } = body;

      if (priority) {
        request.priority = priority;
      }

      if (typeof notes === "string") {
        request.notes = notes.trim();
      }

      if (status === "CANCELLED" && request.status !== "COMPLETED") {
        request.status = "CANCELLED";
      }
    }

    await request.save();

    const populated = await RoomServiceRequest.findById(request._id)
      .populate("roomId", "roomNumber floor roomType status")
      .populate({
        path: "bookingId",
        select: "bookingId customerId",
        populate: {
          path: "customerId",
          select: "name",
        },
      })
      .populate("requestedBy", "name email role")
      .populate("assignedTo", "name email role")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Room service request updated successfully.",
      request: populated,
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
