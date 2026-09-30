import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Room from "@/models/Room";
import Hotel from "@/models/Hotel";
import { requireManager, handleAuthError } from "@/lib/authorization/manager";
import {
  VALID_ROOM_TYPES,
  VALID_ROOM_STATUSES,
  ROOM_TYPES,
  ROOM_STATUSES,
} from "@/types/room";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/manager/rooms/[id]
 * Retrieves single room details strictly within the authenticated manager's hotel.
 * Rejects cross-tenant room IDs with 404 Not Found (zero cross-tenant existence leakage).
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { hotelId, hotel } = await requireManager(req);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    await connectToDatabase();

    // Strict multi-tenant query: MUST match hotelId
    const room = await Room.findOne({
      _id: id,
      hotelId,
    }).lean();

    if (!room) {
      return NextResponse.json(
        { error: "Room not found in your hotel property" },
        { status: 404 }
      );
    }

    // Fetch operational details
    const Booking = (await import("@/models/Booking")).default;
    const HousekeepingTask = (await import("@/models/HousekeepingTask")).default;
    const RoomServiceRequest = (await import("@/models/RoomServiceRequest")).default;
    const MaintenanceRequest = (await import("@/models/MaintenanceRequest")).default;

    const [currentBooking, housekeepingTasks, roomServiceRequests, maintenanceRequests] =
      await Promise.all([
        Booking.findOne({
          hotelId,
          roomId: room._id,
          status: "CHECKED_IN",
        })
          .populate("customerId", "fullName phone email")
          .lean(),
        HousekeepingTask.find({
          hotelId,
          roomId: room._id,
        })
          .populate("assignedTo", "name email")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
        RoomServiceRequest.find({
          hotelId,
          roomId: room._id,
        })
          .populate("assignedTo", "name email")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
        MaintenanceRequest.find({
          hotelId,
          roomId: room._id,
        })
          .populate("assignedTo", "name email")
          .populate("reportedBy", "name email")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
      ]);

    return NextResponse.json({
      success: true,
      room,
      operations: {
        currentBooking,
        housekeepingTasks,
        roomServiceRequests,
        maintenanceRequests,
      },
      hotel: {
        _id: hotel._id,
        name: hotel.name,
        hotelCode: hotel.hotelCode,
        status: hotel.status,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * PUT / PATCH /api/manager/rooms/[id]
 * Updates room details.
 * Prevents cross-tenant edits and ensures hotelId is immutable.
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { hotelId, hotel } = await requireManager(req);
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
    const {
      roomNumber,
      floor,
      roomType,
      pricePerNight,
      capacity,
      amenities,
      description,
      status,
      isActive,
    } = body;

    // 1. Validate roomNumber if provided
    if (roomNumber !== undefined) {
      const cleanNumber = String(roomNumber).trim();
      if (!cleanNumber) {
        return NextResponse.json(
          { error: "Room number cannot be empty" },
          { status: 400 }
        );
      }

      // Check duplicate roomNumber if changed
      if (cleanNumber !== room.roomNumber) {
        const duplicate = await Room.findOne({
          hotelId,
          roomNumber: cleanNumber,
          _id: { $ne: room._id },
        });

        if (duplicate) {
          return NextResponse.json(
            { error: `Room number '${cleanNumber}' already exists in your hotel` },
            { status: 409 }
          );
        }
        room.roomNumber = cleanNumber;
      }
    }

    // 2. Validate floor
    if (floor !== undefined) {
      const cleanFloor = String(floor).trim();
      if (!cleanFloor) {
        return NextResponse.json(
          { error: "Floor cannot be empty" },
          { status: 400 }
        );
      }
      room.floor = cleanFloor;
    }

    // 3. Validate roomType
    if (roomType !== undefined) {
      const normalizedType = String(roomType).toUpperCase();
      if (!(VALID_ROOM_TYPES as readonly string[]).includes(normalizedType)) {
        return NextResponse.json(
          {
            error: `Invalid room type '${roomType}'. Allowed: ${VALID_ROOM_TYPES.join(", ")}`,
          },
          { status: 400 }
        );
      }
      room.roomType = normalizedType as any;
      room.type = normalizedType;
    }

    // 4. Validate pricePerNight
    if (pricePerNight !== undefined) {
      const numericPrice = Number(pricePerNight);
      if (isNaN(numericPrice) || numericPrice <= 0) {
        return NextResponse.json(
          { error: "Price per night must be greater than 0" },
          { status: 400 }
        );
      }
      room.pricePerNight = Math.round(numericPrice);
    }

    // 5. Validate capacity
    if (capacity !== undefined) {
      const numericCapacity = parseInt(String(capacity), 10);
      if (isNaN(numericCapacity) || numericCapacity < 1) {
        return NextResponse.json(
          { error: "Room capacity must be at least 1 guest" },
          { status: 400 }
        );
      }
      room.capacity = numericCapacity;
    }

    // 6. Validate amenities
    if (amenities !== undefined) {
      room.amenities = Array.isArray(amenities)
        ? amenities.map((a: any) => String(a).trim()).filter(Boolean)
        : [];
    }

    // 7. Validate description
    if (description !== undefined) {
      room.description = String(description).trim();
    }

    // 8. Validate status
    if (status !== undefined) {
      if (!(VALID_ROOM_STATUSES as readonly string[]).includes(status)) {
        return NextResponse.json(
          {
            error: `Invalid status '${status}'. Allowed: ${VALID_ROOM_STATUSES.join(", ")}`,
          },
          { status: 400 }
        );
      }
      room.status = status;
    }

    // 9. Active flag
    if (isActive !== undefined) {
      room.isActive = Boolean(isActive);
      if (!room.isActive) {
        // When deactivated, status cannot remain AVAILABLE
        if (room.status === ROOM_STATUSES.AVAILABLE) {
          room.status = ROOM_STATUSES.OUT_OF_SERVICE;
        }
      }
    }

    await room.save();

    return NextResponse.json({
      success: true,
      message: `Room ${room.roomNumber} updated successfully`,
      room,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "A room with this number already exists in your hotel" },
        { status: 409 }
      );
    }
    return handleAuthError(error);
  }
}

export { PUT as PATCH };

/**
 * DELETE /api/manager/rooms/[id]
 * Soft-deactivates the room (`isActive = false`).
 * Preserves room history for future bookings/reports.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
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

    room.isActive = false;
    room.status = ROOM_STATUSES.OUT_OF_SERVICE;
    await room.save();

    return NextResponse.json({
      success: true,
      message: `Room ${room.roomNumber} deactivated successfully`,
      room,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
