import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Room from "@/models/Room";
import { requireManager, handleAuthError } from "@/lib/authorization/manager";
import { VALID_ROOM_STATUSES, ROOM_STATUSES, RoomStatus } from "@/types/room";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/manager/rooms/[id]/status
 * Dedicated room status & lifecycle controller:
 * - action: "deactivate" -> sets isActive = false, status = OUT_OF_SERVICE
 * - action: "reactivate" -> sets isActive = true, status = AVAILABLE
 * - action: "update-status" -> sets status to valid status (cannot set inactive room to AVAILABLE)
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { hotelId } = await requireManager(req);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    await connectToDatabase();

    const room = await Room.findOne({
      _id: id,
      hotelId,
    });

    if (!room) {
      return NextResponse.json(
        { error: "Room not found in your hotel property" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { action, status } = body;

    if (action === "deactivate") {
      room.isActive = false;
      room.status = ROOM_STATUSES.OUT_OF_SERVICE;
      await room.save();

      return NextResponse.json({
        success: true,
        message: `Room ${room.roomNumber} has been deactivated`,
        room,
      });
    }

    if (action === "reactivate") {
      room.isActive = true;
      room.status = ROOM_STATUSES.AVAILABLE;
      await room.save();

      return NextResponse.json({
        success: true,
        message: `Room ${room.roomNumber} has been reactivated and is now AVAILABLE`,
        room,
      });
    }

    if (action === "update-status") {
      if (!status || !(VALID_ROOM_STATUSES as readonly string[]).includes(status)) {
        return NextResponse.json(
          {
            error: `Invalid status '${status}'. Allowed: ${VALID_ROOM_STATUSES.join(", ")}`,
          },
          { status: 400 }
        );
      }

      if (!room.isActive && status === ROOM_STATUSES.AVAILABLE) {
        return NextResponse.json(
          {
            error: "Cannot set an inactive room to AVAILABLE. Please reactivate the room first.",
          },
          { status: 400 }
        );
      }

      room.status = status as RoomStatus;
      await room.save();

      return NextResponse.json({
        success: true,
        message: `Room ${room.roomNumber} status updated to ${room.status}`,
        room,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Supported: deactivate, reactivate, update-status" },
      { status: 400 }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}
