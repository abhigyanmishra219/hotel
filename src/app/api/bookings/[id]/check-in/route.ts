import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireFrontDeskUser } from "@/lib/auth";
import Booking from "@/models/Booking";
import Room from "@/models/Room";
import Customer from "@/models/Customer";
import { normalizeDateToMidnight } from "@/lib/bookingService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireFrontDeskUser(req);
    const resolvedParams = await params;
    const { id } = resolvedParams;

    await connectDB();

    // 1. Fetch Booking scoped strictly to authenticated hotelId
    const booking = await Booking.findOne({
      _id: id,
      hotelId: authUser.hotelId,
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking record not found for your hotel property." },
        { status: 404 }
      );
    }

    // 2. State & Lifecycle Validations
    if (booking.status === "CHECKED_IN") {
      return NextResponse.json(
        { error: "Guest is already checked in." },
        { status: 400 }
      );
    }

    if (booking.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Cannot check in a completed booking." },
        { status: 400 }
      );
    }

    if (booking.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot check in a cancelled booking." },
        { status: 400 }
      );
    }

    if (booking.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: `Invalid booking status transition from ${booking.status} to CHECKED_IN.` },
        { status: 400 }
      );
    }

    // 3. Check-In Date Validation
    // Normal check-in: current date must be >= checkInDate (midnight normalized)
    const todayMidnight = normalizeDateToMidnight(new Date());
    const scheduledCheckInMidnight = normalizeDateToMidnight(booking.checkInDate);

    if (todayMidnight < scheduledCheckInMidnight) {
      return NextResponse.json(
        {
          error: `Check-in is not available yet. Scheduled arrival date is ${new Date(
            booking.checkInDate
          ).toLocaleDateString()}.`,
        },
        { status: 400 }
      );
    }

    // 4. Verify room is available and not currently occupied by another active stay
    const existingOccupancy = await Booking.findOne({
      hotelId: authUser.hotelId,
      roomId: booking.roomId,
      status: "CHECKED_IN",
      _id: { $ne: booking._id },
    });

    if (existingOccupancy) {
      return NextResponse.json(
        {
          error: `Room is currently occupied by another active stay (${existingOccupancy.bookingId}). Please resolve prior stay before check-in.`,
        },
        { status: 400 }
      );
    }

    // 5. Read optional notes from body
    let checkInNotes = "";
    try {
      const body = await req.json();
      if (body?.notes) {
        checkInNotes = String(body.notes).trim();
      }
    } catch {
      // Body is optional
    }

    // 6. Atomically perform Check-in
    const now = new Date();
    booking.status = "CHECKED_IN";
    booking.checkedInAt = now;
    booking.checkedInBy = authUser.userId as any;
    booking.actualCheckInDate = now;
    if (checkInNotes) {
      booking.checkInNotes = checkInNotes;
    }

    await booking.save();

    // 7. Update Room status to OCCUPIED
    await Room.findByIdAndUpdate(booking.roomId, {
      status: "OCCUPIED",
    });

    // 8. Fetch populated booking for response
    const populatedBooking = await Booking.findById(booking._id)
      .populate("customerId", "customerId fullName phone email idType idNumber city")
      .populate("roomId", "roomNumber floor roomType pricePerNight capacity amenities status")
      .populate("checkedInBy", "name email role")
      .populate("createdBy", "name email role");

    return NextResponse.json({
      success: true,
      message: `Guest successfully checked in to Room ${(populatedBooking?.roomId as any)?.roomNumber || ""}.`,
      booking: populatedBooking,
    });
  } catch (err: any) {
    console.error("Check-in error:", err);
    if (err.message?.includes("Unauthorized") || err.message?.includes("Forbidden")) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to process guest check-in." },
      { status: 500 }
    );
  }
}
