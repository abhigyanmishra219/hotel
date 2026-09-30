import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireFrontDeskUser } from "@/lib/auth";
import Booking from "@/models/Booking";
import Room from "@/models/Room";
import Invoice from "@/models/Invoice";
import { calculateCheckoutBilling } from "@/lib/bookingService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireFrontDeskUser(req);
    const resolvedParams = await params;
    const { id } = resolvedParams;

    await connectDB();

    // 1. Fetch Booking strictly scoped to authenticated hotelId
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

    // 2. Lifecycle Validations
    if (booking.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Guest has already checked out." },
        { status: 400 }
      );
    }

    if (booking.status !== "CHECKED_IN") {
      return NextResponse.json(
        { error: `Cannot check out booking with status ${booking.status}. Only checked-in active stays can be checked out.` },
        { status: 400 }
      );
    }

    // 3. Parse request body (additional charges, payment recording, notes)
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const additionalCharges = Array.isArray(body.additionalCharges)
      ? body.additionalCharges.map((c: any) => ({
          description: String(c.description || "Additional Service").trim(),
          amount: Math.max(0, Number(c.amount) || 0),
          date: c.date ? new Date(c.date) : new Date(),
        }))
      : [];

    const discount = body.discount !== undefined ? Number(body.discount) : booking.discount;
    const amountPaid = Math.max(0, Number(body.amountPaid) || 0);
    const paymentMethod = body.paymentMethod || "CASH";
    const transactionRef = body.transactionRef ? String(body.transactionRef).trim() : undefined;
    const notes = body.notes ? String(body.notes).trim() : undefined;

    // 4. Server-Side Authoritative Billing Calculation
    const actualCheckOut = new Date();
    const billing = calculateCheckoutBilling({
      pricePerNight: booking.pricePerNight,
      scheduledCheckIn: booking.checkInDate,
      scheduledCheckOut: booking.checkOutDate,
      actualCheckOut,
      additionalCharges,
      discount,
      amountPaid,
      taxRate: 0.12,
    });

    // 5. Create or Update Invoice Document
    const paymentHistory =
      billing.amountPaid > 0
        ? [
            {
              amount: billing.amountPaid,
              paymentMethod,
              transactionRef,
              recordedBy: authUser.userId as any,
              recordedAt: actualCheckOut,
              notes: "Check-out settlement payment",
            },
          ]
        : [];

    const invoice = new Invoice({
      hotelId: booking.hotelId,
      bookingId: booking._id,
      customerId: booking.customerId,
      roomId: booking.roomId,
      pricePerNight: billing.pricePerNight,
      numberOfNights: billing.billableNights,
      roomAmount: billing.roomAmount,
      additionalCharges,
      discount: billing.discount,
      tax: billing.tax,
      totalAmount: billing.totalAmount,
      amountPaid: billing.amountPaid,
      amountDue: billing.amountDue,
      paymentStatus: billing.paymentStatus,
      paymentMethod,
      paymentHistory,
      generatedBy: authUser.userId as any,
      generatedAt: actualCheckOut,
      notes: notes || "",
    });

    await invoice.save();

    // 6. Complete Booking Record
    booking.status = "COMPLETED";
    booking.actualCheckOutDate = actualCheckOut;
    booking.checkedOutBy = authUser.userId as any;
    if (notes) {
      booking.checkOutNotes = notes;
    }
    booking.totalAmount = billing.totalAmount;
    await booking.save();

    // 7. CRITICAL: Transition Room to CLEANING (Staff will later mark AVAILABLE in Phase 7)
    await Room.findByIdAndUpdate(booking.roomId, {
      status: "CLEANING",
    });

    // 8. Phase 7: Automatically create HousekeepingTask for room turnaround (idempotent)
    const HousekeepingTask = (await import("@/models/HousekeepingTask")).default;
    const existingCleaningTask = await HousekeepingTask.findOne({
      hotelId: booking.hotelId,
      roomId: booking.roomId,
      status: { $in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] },
    });

    if (!existingCleaningTask) {
      await new HousekeepingTask({
        hotelId: booking.hotelId,
        roomId: booking.roomId,
        bookingId: booking._id,
        type: "ROOM_CLEANING",
        priority: "HIGH",
        status: "PENDING",
        createdBy: authUser.userId as any,
        notes: `Turnaround cleaning dispatched after guest check-out (Booking ${booking.bookingId}).`,
      }).save();
    }

    // 9. Fetch populated records
    const populatedBooking = await Booking.findById(booking._id)
      .populate("customerId", "customerId fullName phone email")
      .populate("roomId", "roomNumber floor roomType pricePerNight")
      .populate("checkedInBy", "name email")
      .populate("checkedOutBy", "name email");

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate("customerId", "customerId fullName phone email idType idNumber city")
      .populate("roomId", "roomNumber floor roomType")
      .populate("generatedBy", "name email role");

    return NextResponse.json({
      success: true,
      message: `Check-out completed for Room ${(populatedBooking?.roomId as any)?.roomNumber}. Room marked for CLEANING.`,
      booking: populatedBooking,
      invoice: populatedInvoice,
    });
  } catch (err: any) {
    console.error("Check-out error:", err);
    if (err.message?.includes("Unauthorized") || err.message?.includes("Forbidden")) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to process guest check-out." },
      { status: 500 }
    );
  }
}
