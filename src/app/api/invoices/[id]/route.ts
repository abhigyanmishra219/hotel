import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireFrontDeskUser } from "@/lib/auth";
import Invoice from "@/models/Invoice";
import Hotel from "@/models/Hotel";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireFrontDeskUser(req);
    const resolvedParams = await params;
    const { id } = resolvedParams;

    await connectDB();

    // Fetch Invoice strictly scoped to authenticated hotelId
    const invoice = await Invoice.findOne({
      _id: id,
      hotelId: authUser.hotelId,
    })
      .populate("customerId", "customerId fullName phone email address city state country idType idNumber notes")
      .populate("roomId", "roomNumber floor roomType pricePerNight capacity amenities")
      .populate("bookingId", "bookingId checkInDate checkOutDate numberOfNights adults children bookingSource status notes checkedInAt actualCheckInDate actualCheckOutDate")
      .populate("generatedBy", "name email role")
      .populate("paymentHistory.recordedBy", "name email");

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found for your hotel property." },
        { status: 404 }
      );
    }

    // Fetch Hotel details for invoice header / print folio
    const hotel = await Hotel.findById(authUser.hotelId).select(
      "name hotelCode address city state country phone email gstNumber"
    );

    return NextResponse.json({
      success: true,
      invoice,
      hotel,
    });
  } catch (err: any) {
    console.error("Fetch invoice error:", err);
    if (err.message?.includes("Unauthorized") || err.message?.includes("Forbidden")) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to load invoice." },
      { status: 500 }
    );
  }
}
