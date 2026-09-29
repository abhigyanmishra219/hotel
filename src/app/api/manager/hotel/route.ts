import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Hotel from "@/models/Hotel";
import { requireHotelUser, handleAuthError } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireHotelUser(req);
    await connectToDatabase();

    const hotel = await Hotel.findById(authUser.hotelId).lean();
    if (!hotel) {
      return NextResponse.json(
        { error: "Assigned hotel not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      hotel,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
