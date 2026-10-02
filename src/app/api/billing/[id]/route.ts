import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireFrontDeskUser } from "@/lib/auth";
import Invoice from "@/models/Invoice";
import Booking from "@/models/Booking";
import Hotel from "@/models/Hotel";
import Customer from "@/models/Customer";
import Room from "@/models/Room";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireFrontDeskUser(req);
    const resolvedParams = await params;
    const { id } = resolvedParams;

    await connectDB();

    // 1. Try to find an existing Invoice by _id or invoiceId
    let invoice = await Invoice.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { invoiceId: id }].filter(Boolean) as any,
      hotelId: authUser.hotelId,
    })
      .populate("customerId", "customerId fullName phone email address city state country idType idNumber")
      .populate("roomId", "roomNumber floor roomType pricePerNight capacity amenities")
      .populate("bookingId", "bookingId checkInDate checkOutDate checkInAt checkOutAt numberOfNights adults children bookingSource status notes checkedInAt actualCheckInAt actualCheckInDate actualCheckOutDate actualCheckOutAt")
      .populate("generatedBy", "name email role")
      .populate("paymentHistory.recordedBy", "name email");

    // 2. Fetch Hotel Details for invoice/bill header
    const hotel = await Hotel.findById(authUser.hotelId).select(
      "name hotelCode address city state country phone email gstNumber"
    );

    if (invoice) {
      const isDraft = (invoice.bookingId as any)?.status !== "COMPLETED";
      return NextResponse.json({
        success: true,
        isDraft,
        invoice,
        hotel,
      });
    }

    // 3. If no direct invoice found, check if id is a Booking ID or booking _id
    const booking = await Booking.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { bookingId: id }].filter(Boolean) as any,
      hotelId: authUser.hotelId,
    })
      .populate("customerId", "customerId fullName phone email address city state country idType idNumber")
      .populate("roomId", "roomNumber floor roomType pricePerNight capacity amenities")
      .populate("createdBy", "name email role")
      .populate("checkedInBy", "name email");

    if (!booking) {
      return NextResponse.json(
        { error: "Billing folio or invoice record not found for your hotel property." },
        { status: 404 }
      );
    }

    // Check if an invoice exists for this booking
    invoice = await Invoice.findOne({
      bookingId: booking._id,
      hotelId: authUser.hotelId,
    })
      .populate("customerId", "customerId fullName phone email address city state country idType idNumber")
      .populate("roomId", "roomNumber floor roomType pricePerNight capacity amenities")
      .populate("bookingId", "bookingId checkInDate checkOutDate checkInAt checkOutAt numberOfNights adults children bookingSource status notes checkedInAt actualCheckInAt actualCheckInDate actualCheckOutDate actualCheckOutAt")
      .populate("generatedBy", "name email role")
      .populate("paymentHistory.recordedBy", "name email");

    if (invoice) {
      const isDraft = booking.status !== "COMPLETED";
      return NextResponse.json({
        success: true,
        isDraft,
        invoice,
        hotel,
      });
    }

    // 4. Construct Live Folio from active Booking data
    const roomAmount = booking.roomAmount || (booking.pricePerNight * booking.numberOfNights);
    const discount = booking.discount || 0;
    const taxableAmount = Math.max(0, roomAmount - discount);
    const tax = booking.tax || Math.round(taxableAmount * 0.12);
    const totalAmount = taxableAmount + tax;

    const draftInvoice = {
      _id: `folio-${booking._id}`,
      invoiceId: `FOLIO-${booking.bookingId}`,
      hotelId: String(authUser.hotelId),
      bookingId: booking,
      customerId: booking.customerId,
      roomId: booking.roomId,
      pricePerNight: booking.pricePerNight,
      numberOfNights: booking.numberOfNights,
      roomAmount,
      additionalCharges: [],
      discount,
      tax,
      totalAmount,
      amountPaid: 0,
      amountDue: totalAmount,
      paymentStatus: "UNPAID",
      paymentMethod: "CASH",
      paymentHistory: [],
      generatedAt: new Date(),
      createdAt: booking.createdAt,
      isDraft: true,
    };

    return NextResponse.json({
      success: true,
      isDraft: true,
      invoice: draftInvoice,
      booking,
      hotel,
    });
  } catch (err: any) {
    console.error("Fetch billing detail error:", err);
    if (err.message?.includes("Unauthorized") || err.message?.includes("Forbidden")) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to load billing folio details." },
      { status: 500 }
    );
  }
}
