import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { requireFrontDeskUser, handleAuthError } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/bookings/[id]/cancel
 * Cancels a confirmed booking, setting status = "CANCELLED".
 * This immediately frees up the room for other reservations while keeping historical audit records.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await requireFrontDeskUser(req);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    await connectToDatabase();

    const booking = await Booking.findOne({
      _id: id,
      hotelId: authUser.hotelId,
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found or does not belong to your hotel" },
        { status: 404 }
      );
    }

    if (booking.status === "CANCELLED") {
      return NextResponse.json(
        { error: "This booking is already cancelled" },
        { status: 400 }
      );
    }

    booking.status = "CANCELLED";
    await booking.save();

    return NextResponse.json({
      success: true,
      message: `Booking ${booking.bookingId} has been cancelled successfully. The room is now available for other guests.`,
      booking: {
        _id: booking._id,
        bookingId: booking.bookingId,
        status: booking.status,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
