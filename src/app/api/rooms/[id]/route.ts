import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Room from "@/models/Room";
import Hotel from "@/models/Hotel";
import { requireHotelUser, handleAuthError } from "@/lib/auth";

export { PUT, PATCH, DELETE } from "@/app/api/manager/rooms/[id]/route";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/rooms/[id]
 * Retrieves single room details strictly within the authenticated user's hotel.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await requireHotelUser(req);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    await connectToDatabase();

    const room = await Room.findOne({
      _id: id,
      hotelId: authUser.hotelId,
    }).lean();

    if (!room) {
      return NextResponse.json(
        { error: "Room not found in your hotel property" },
        { status: 404 }
      );
    }

    const hotel = await Hotel.findById(authUser.hotelId).select("name hotelCode status").lean();

    return NextResponse.json({
      success: true,
      room,
      hotel,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
