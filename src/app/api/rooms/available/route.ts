import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { requireHotelUser, handleAuthError } from "@/lib/auth";
import {
  getAvailableRooms,
  normalizeDateToMidnight,
  calculateStayNights,
} from "@/lib/bookingService";

/**
 * GET /api/rooms/available
 * Returns all active rooms in the authenticated hotel that are available for the requested check-in and check-out dates.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireHotelUser(req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const checkInParam = searchParams.get("checkInDate");
    const checkOutParam = searchParams.get("checkOutDate");
    const roomType = searchParams.get("roomType") || undefined;
    const capacityParam = searchParams.get("capacity");
    const minCapacity = capacityParam ? parseInt(capacityParam, 10) : undefined;

    if (!checkInParam || !checkOutParam) {
      return NextResponse.json(
        { error: "Both 'checkInDate' and 'checkOutDate' query parameters are required" },
        { status: 400 }
      );
    }

    const checkInDate = normalizeDateToMidnight(checkInParam);
    const checkOutDate = normalizeDateToMidnight(checkOutParam);

    // Validate stay duration
    const nights = calculateStayNights(checkInDate, checkOutDate);

    const availableRooms = await getAvailableRooms({
      hotelId: authUser.hotelId,
      checkInDate,
      checkOutDate,
      roomType,
      minCapacity,
    });

    return NextResponse.json({
      success: true,
      count: availableRooms.length,
      nights,
      checkInDate,
      checkOutDate,
      rooms: availableRooms.map((room: any) => ({
        _id: room._id,
        roomNumber: room.roomNumber,
        floor: room.floor,
        roomType: room.roomType || room.type,
        pricePerNight: room.pricePerNight,
        estimatedTotal: room.pricePerNight * nights,
        capacity: room.capacity,
        amenities: room.amenities,
        status: room.status,
      })),
    });
  } catch (error: any) {
    if (error.message?.includes("Check-out date") || error.message?.includes("Invalid date")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleAuthError(error);
  }
}
