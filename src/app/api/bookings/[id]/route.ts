import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Room from "@/models/Room";
import Hotel from "@/models/Hotel";
import { requireFrontDeskUser, handleAuthError } from "@/lib/auth";
import {
  normalizeDateToMidnight,
  calculateStayNights,
  checkBookingConflict,
  calculateBookingPricing,
} from "@/lib/bookingService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/bookings/[id]
 * Retrieves booking details. Returns 404 if cross-hotel.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
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
    })
      .populate("customerId", "customerId fullName phone email address city state country idType idNumber")
      .populate("roomId", "roomNumber roomType pricePerNight floor capacity amenities")
      .populate("createdBy", "name email role")
      .lean();

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found or does not belong to your hotel" },
        { status: 404 }
      );
    }

    const hotel = await Hotel.findById(authUser.hotelId).select("name hotelCode").lean();

    return NextResponse.json({
      success: true,
      booking: {
        ...booking,
        hotelName: hotel?.name || "Your Hotel",
        hotelCode: hotel?.hotelCode || "HOT-000000",
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * PATCH /api/bookings/[id]
 * Updates booking parameters (dates, room, guest count, discount, notes).
 * Re-validates double-booking conflicts and capacity constraints.
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
        { error: "Booking not found or access denied" },
        { status: 404 }
      );
    }

    if (booking.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot edit a cancelled booking" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      roomId: newRoomId,
      checkInDate: rawCheckIn,
      checkOutDate: rawCheckOut,
      adults,
      children,
      discount,
      notes,
      status,
    } = body;

    // Handle status cancellation if sent directly
    if (status === "CANCELLED") {
      booking.status = "CANCELLED";
      await booking.save();
      return NextResponse.json({
        success: true,
        message: `Booking ${booking.bookingId} cancelled successfully`,
        booking,
      });
    }

    const targetRoomId = newRoomId ? new mongoose.Types.ObjectId(newRoomId) : booking.roomId;
    const targetCheckIn = rawCheckIn ? normalizeDateToMidnight(rawCheckIn) : booking.checkInDate;
    const targetCheckOut = rawCheckOut ? normalizeDateToMidnight(rawCheckOut) : booking.checkOutDate;

    // 1. Validate dates
    let nights = booking.numberOfNights;
    if (rawCheckIn || rawCheckOut) {
      try {
        nights = calculateStayNights(targetCheckIn, targetCheckOut);
      } catch (dateErr: any) {
        return NextResponse.json({ error: dateErr.message }, { status: 400 });
      }
    }

    // 2. Validate Room & Capacity
    const room = await Room.findOne({
      _id: targetRoomId,
      hotelId: authUser.hotelId,
      isActive: true,
    });

    if (!room) {
      return NextResponse.json({ error: "Target room not found or inactive" }, { status: 404 });
    }

    const numAdults = adults !== undefined ? parseInt(String(adults), 10) : booking.adults;
    const numChildren = children !== undefined ? parseInt(String(children), 10) : booking.children;
    const totalGuests = numAdults + numChildren;

    if (totalGuests > room.capacity) {
      return NextResponse.json(
        { error: `Guest count (${totalGuests}) exceeds room capacity (${room.capacity})` },
        { status: 400 }
      );
    }

    // 3. Double-Booking Conflict check (excluding this current booking ID)
    const { hasConflict, conflictingBooking } = await checkBookingConflict({
      hotelId: authUser.hotelId,
      roomId: room._id,
      checkInDate: targetCheckIn,
      checkOutDate: targetCheckOut,
      excludeBookingId: booking._id,
    });

    if (hasConflict) {
      return NextResponse.json(
        {
          error: `Room ${room.roomNumber} is unavailable for the requested modification dates.`,
          conflictDetails: conflictingBooking?.bookingId,
        },
        { status: 409 }
      );
    }

    // 4. Update fields & recalculate pricing
    booking.roomId = room._id;
    booking.checkInDate = targetCheckIn;
    booking.checkOutDate = targetCheckOut;
    booking.adults = numAdults;
    booking.children = numChildren;
    booking.numberOfGuests = totalGuests;
    booking.numberOfNights = nights;

    // Price snapshot: preserve existing price if room unchanged, or adopt new room rate
    if (newRoomId && newRoomId.toString() !== booking.roomId.toString()) {
      booking.pricePerNight = room.pricePerNight;
    }

    const discountVal = discount !== undefined ? discount : booking.discount;
    const pricing = calculateBookingPricing({
      pricePerNight: booking.pricePerNight,
      numberOfNights: nights,
      discount: discountVal,
    });

    booking.roomAmount = pricing.roomAmount;
    booking.discount = pricing.discount;
    booking.tax = pricing.tax;
    booking.totalAmount = pricing.totalAmount;

    if (notes !== undefined) booking.notes = String(notes || "").trim();

    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate("customerId", "customerId fullName phone email")
      .populate("roomId", "roomNumber roomType pricePerNight floor capacity")
      .populate("createdBy", "name email role")
      .lean();

    return NextResponse.json({
      success: true,
      message: `Booking ${booking.bookingId} updated successfully`,
      booking: updatedBooking,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
