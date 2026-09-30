import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Room from "@/models/Room";
import Hotel from "@/models/Hotel";
import { requireHotelUser, handleAuthError } from "@/lib/auth";
import {
  VALID_ROOM_TYPES,
  VALID_ROOM_STATUSES,
} from "@/types/room";

export { POST } from "@/app/api/manager/rooms/route";

/**
 * GET /api/rooms
 * Multi-tenant room listing for hotel staff/receptionists/managers.
 * Strictly scoped to authenticatedUser.hotelId.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireHotelUser(req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status")?.trim();
    const roomType = searchParams.get("roomType")?.trim();
    const floor = searchParams.get("floor")?.trim();
    const activeFilter = searchParams.get("isActive")?.trim();
    const sortBy = searchParams.get("sortBy")?.trim() || "roomNumber";
    const sortOrder = searchParams.get("sortOrder")?.trim() === "desc" ? -1 : 1;

    const query: Record<string, any> = {
      hotelId: authUser.hotelId,
    };

    if (activeFilter === "true") {
      query.isActive = true;
    } else if (activeFilter === "false") {
      query.isActive = false;
    }

    if (status && status !== "ALL" && (VALID_ROOM_STATUSES as readonly string[]).includes(status)) {
      query.status = status;
    }

    if (roomType && roomType !== "ALL" && (VALID_ROOM_TYPES as readonly string[]).includes(roomType)) {
      query.roomType = roomType;
    }

    if (floor && floor !== "ALL") {
      query.floor = floor;
    }

    if (search) {
      query.$or = [
        { roomNumber: { $regex: search, $options: "i" } },
        { roomCode: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const sortOptions: Record<string, any> = {};
    if (sortBy === "price" || sortBy === "pricePerNight") {
      sortOptions.pricePerNight = sortOrder;
    } else if (sortBy === "floor") {
      sortOptions.floor = sortOrder;
    } else if (sortBy === "status") {
      sortOptions.status = sortOrder;
    } else if (sortBy === "createdAt") {
      sortOptions.createdAt = sortOrder;
    } else {
      sortOptions.roomNumber = sortOrder;
    }

    const [rooms, hotel, availableFloors] = await Promise.all([
      Room.find(query).sort(sortOptions).lean(),
      Hotel.findById(authUser.hotelId).select("name hotelCode").lean(),
      Room.distinct("floor", { hotelId: authUser.hotelId }).catch(() => []),
    ]);

    return NextResponse.json({
      success: true,
      count: rooms.length,
      rooms,
      availableFloors,
      hotelName: hotel?.name || "Hotel",
      hotelCode: hotel?.hotelCode || "HOT-000001",
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
