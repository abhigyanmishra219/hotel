import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Room from "@/models/Room";
import { requireManager, handleAuthError } from "@/lib/authorization/manager";
import {
  assertRoomLimit,
  checkRoomLimit,
  handleSubscriptionEnforcementError,
} from "@/lib/subscription-enforcement";
import {
  VALID_ROOM_TYPES,
  VALID_ROOM_STATUSES,
  ROOM_TYPES,
  ROOM_STATUSES,
} from "@/types/room";

/**
 * GET /api/manager/rooms
 * Retrieves rooms belonging strictly to the authenticated manager's hotel.
 * Supports:
 * - search: by roomNumber or roomCode
 * - status: AVAILABLE, RESERVED, OCCUPIED, CLEANING, MAINTENANCE, OUT_OF_SERVICE, or ALL
 * - roomType: SINGLE, DOUBLE, DELUXE, SUITE, FAMILY, or ALL
 * - floor: string filter
 * - isActive: 'true', 'false', or 'ALL' (defaults to 'all' or 'true' based on query)
 * - sortBy: 'roomNumber', 'pricePerNight', 'floor', 'status', 'createdAt'
 * - sortOrder: 'asc' or 'desc'
 */
export async function GET(req: NextRequest) {
  try {
    const { hotelId, hotel } = await requireManager(req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status")?.trim();
    const roomType = searchParams.get("roomType")?.trim();
    const floor = searchParams.get("floor")?.trim();
    const activeFilter = searchParams.get("isActive")?.trim();
    const sortBy = searchParams.get("sortBy")?.trim() || "roomNumber";
    const sortOrder = searchParams.get("sortOrder")?.trim() === "desc" ? -1 : 1;

    // Strict multi-tenant query filter: ALWAYS locked to authenticated manager's hotelId
    const query: Record<string, any> = {
      hotelId,
    };

    // Filter by active / inactive status
    if (activeFilter === "true") {
      query.isActive = true;
    } else if (activeFilter === "false") {
      query.isActive = false;
    }

    // Filter by room status
    if (status && status !== "ALL" && (VALID_ROOM_STATUSES as readonly string[]).includes(status)) {
      query.status = status;
    }

    // Filter by room type
    if (roomType && roomType !== "ALL" && (VALID_ROOM_TYPES as readonly string[]).includes(roomType)) {
      query.roomType = roomType;
    }

    // Filter by floor
    if (floor && floor !== "ALL") {
      query.floor = floor;
    }

    // Search by roomNumber or roomCode
    if (search) {
      query.$or = [
        { roomNumber: { $regex: search, $options: "i" } },
        { roomCode: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Sorting
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
      // Default natural sort by roomNumber
      sortOptions.roomNumber = sortOrder;
    }

    const rooms = await Room.find(query).sort(sortOptions).lean();

    // Check plan quota limits
    const quota = await checkRoomLimit(hotelId).catch(() => ({
      allowed: true,
      current: rooms.filter((r) => r.isActive).length,
      max: -1,
      planName: "Standard",
    }));

    // Extract unique floors for filter dropdown
    const availableFloors = await Room.distinct("floor", { hotelId }).catch(() => []);

    return NextResponse.json({
      success: true,
      count: rooms.length,
      rooms,
      quota,
      availableFloors,
      hotelName: hotel.name,
      hotelCode: hotel.hotelCode,
    });
  } catch (error) {
    const subError = handleSubscriptionEnforcementError(error);
    if (subError) return subError;
    return handleAuthError(error);
  }
}

/**
 * POST /api/manager/rooms
 * Creates a new room under the authenticated manager's hotel.
 * Enforces:
 * 1. Role must be MANAGER
 * 2. Hotel must be ACTIVE (rejects INACTIVE/SUSPENDED)
 * 3. Subscription room quota limit check
 * 4. Unique roomNumber within hotel
 * 5. Input validation (positive price, min capacity 1)
 * 6. Initial status is defaulted to AVAILABLE
 */
export async function POST(req: NextRequest) {
  try {
    const { hotelId, hotel } = await requireManager(req);
    await connectToDatabase();

    // 1. Inactive hotel check
    if (hotel.status === "INACTIVE" || hotel.status === "SUSPENDED") {
      return NextResponse.json(
        {
          error:
            "Your hotel account is currently inactive or suspended. Please contact the System Administrator to create new rooms.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      roomNumber,
      floor,
      roomType = ROOM_TYPES.DELUXE,
      pricePerNight,
      capacity = 2,
      amenities = [],
      description = "",
      status = ROOM_STATUSES.AVAILABLE,
    } = body;

    // 2. Validate roomNumber
    if (!roomNumber || typeof roomNumber !== "string" || !roomNumber.trim()) {
      return NextResponse.json(
        { error: "Room number is required (e.g. 101, 204)" },
        { status: 400 }
      );
    }
    const cleanRoomNumber = roomNumber.trim();

    // 3. Validate floor
    if (!floor || typeof floor !== "string" || !floor.trim()) {
      return NextResponse.json(
        { error: "Floor is required (e.g. Ground, 1, 2, 3)" },
        { status: 400 }
      );
    }
    const cleanFloor = floor.trim();

    // 4. Validate roomType
    const normalizedType = String(roomType).toUpperCase();
    if (!(VALID_ROOM_TYPES as readonly string[]).includes(normalizedType)) {
      return NextResponse.json(
        {
          error: `Invalid room type '${roomType}'. Allowed types: ${VALID_ROOM_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // 5. Validate pricePerNight
    const numericPrice = Number(pricePerNight);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return NextResponse.json(
        { error: "Price per night must be a valid positive number in INR (e.g. 2500)" },
        { status: 400 }
      );
    }

    // 6. Validate capacity
    const numericCapacity = parseInt(String(capacity), 10);
    if (isNaN(numericCapacity) || numericCapacity < 1) {
      return NextResponse.json(
        { error: "Room capacity must be at least 1 guest" },
        { status: 400 }
      );
    }

    // 7. Validate initial status: new rooms cannot be initialized as OCCUPIED or RESERVED
    let initialStatus = ROOM_STATUSES.AVAILABLE;
    if (status && status !== ROOM_STATUSES.AVAILABLE) {
      if (
        status === ROOM_STATUSES.OCCUPIED ||
        status === ROOM_STATUSES.RESERVED ||
        status === ROOM_STATUSES.CLEANING
      ) {
        return NextResponse.json(
          {
            error: `Newly created rooms must have initial status 'AVAILABLE'. Status '${status}' is reserved for active bookings and housekeeping tasks.`,
          },
          { status: 400 }
        );
      }
      if ((VALID_ROOM_STATUSES as readonly string[]).includes(status)) {
        initialStatus = status as any;
      }
    }

    // 8. Validate amenities
    const cleanAmenities = Array.isArray(amenities)
      ? amenities.map((a: any) => String(a).trim()).filter(Boolean)
      : [];

    // 9. Enforce backend subscription maxRooms quota limit
    await assertRoomLimit(hotelId);

    // 10. Check duplicate roomNumber in this hotel
    const existingRoom = await Room.findOne({
      hotelId,
      roomNumber: cleanRoomNumber,
    });

    if (existingRoom) {
      return NextResponse.json(
        {
          error: `Room '${cleanRoomNumber}' already exists in your hotel. Please use a unique room number.`,
        },
        { status: 409 }
      );
    }

    // 11. Create room under authenticated hotelId (Never trusts client hotelId)
    const newRoom: any = await Room.create({
      hotelId,
      roomNumber: cleanRoomNumber,
      floor: cleanFloor,
      roomType: normalizedType as any,
      type: normalizedType as any,
      pricePerNight: Math.round(numericPrice),
      capacity: numericCapacity,
      amenities: cleanAmenities.length > 0 ? cleanAmenities : ["WiFi", "AC", "TV"],
      description: String(description || "").trim(),
      status: initialStatus,
      isActive: true,
    });

    const updatedQuota = await checkRoomLimit(hotelId).catch(() => ({
      allowed: true,
      current: 1,
      max: -1,
      planName: "Standard",
    }));

    return NextResponse.json(
      {
        success: true,
        message: `Room ${newRoom.roomNumber} created successfully`,
        room: newRoom,
        quota: updatedQuota,
      },
      { status: 201 }
    );
  } catch (error: any) {
    const subError = handleSubscriptionEnforcementError(error);
    if (subError) return subError;
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "A room with this number already exists in your hotel" },
        { status: 409 }
      );
    }
    return handleAuthError(error);
  }
}
