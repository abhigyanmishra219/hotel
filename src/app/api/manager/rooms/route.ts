import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Room from "@/models/Room";
import { requireHotelUser, handleAuthError } from "@/lib/auth";
import {
  assertRoomLimit,
  checkRoomLimit,
  handleSubscriptionEnforcementError,
} from "@/lib/subscription-enforcement";

/**
 * GET /api/manager/rooms
 * Retrieves all rooms for the authenticated manager's hotel, along with quota limit status.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireHotelUser(req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status")?.trim();

    const query: Record<string, any> = {
      hotelId: authUser.hotelId,
      isActive: true,
    };

    if (status && ["AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE"].includes(status)) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { roomNumber: { $regex: search, $options: "i" } },
        { type: { $regex: search, $options: "i" } },
      ];
    }

    const rooms = await Room.find(query).sort({ roomNumber: 1 }).lean();
    const quota = await checkRoomLimit(authUser.hotelId).catch(() => ({
      allowed: true,
      current: rooms.length,
      max: -1,
      planName: "Standard",
    }));

    return NextResponse.json({
      success: true,
      count: rooms.length,
      rooms,
      quota,
    });
  } catch (error) {
    const subError = handleSubscriptionEnforcementError(error);
    if (subError) return subError;
    return handleAuthError(error);
  }
}

/**
 * POST /api/manager/rooms
 * Creates a new room for the hotel tenant.
 * BACKEND ENFORCEMENT: Enforces maxRooms limit before creation. Rejects with ROOM_LIMIT_REACHED if limit is met.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await requireHotelUser(req);
    await connectToDatabase();

    const body = await req.json();
    const { roomNumber, type = "Deluxe Room", floor = 1, pricePerNight = 100, status = "AVAILABLE" } = body;

    if (!roomNumber || typeof roomNumber !== "string" || !roomNumber.trim()) {
      return NextResponse.json(
        { error: "Room number is required" },
        { status: 400 }
      );
    }

    const trimmedNumber = roomNumber.trim();

    // 1. CRITICAL: Enforce backend room quota limit using active SubscriptionPlan
    await assertRoomLimit(authUser.hotelId);

    // 2. Check for duplicate room number in this hotel
    const existingRoom = await Room.findOne({
      hotelId: authUser.hotelId,
      roomNumber: trimmedNumber,
      isActive: true,
    });

    if (existingRoom) {
      return NextResponse.json(
        { error: `Room ${trimmedNumber} already exists in this hotel` },
        { status: 409 }
      );
    }

    // 3. Create the room
    const newRoom = await Room.create({
      hotelId: authUser.hotelId,
      roomNumber: trimmedNumber,
      type: type.trim(),
      floor: Number(floor) || 1,
      pricePerNight: Number(pricePerNight) || 100,
      status,
      isActive: true,
    });

    const updatedQuota = await checkRoomLimit(authUser.hotelId);

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
        { error: "A room with this number already exists" },
        { status: 409 }
      );
    }
    return handleAuthError(error);
  }
}
