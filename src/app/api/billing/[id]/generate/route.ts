import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireFrontDeskUser } from "@/lib/auth";
import Booking from "@/models/Booking";
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

    // 1. Verify Booking belongs to authenticated hotel
    const booking = await Booking.findOne({
      _id: id,
      hotelId: authUser.hotelId,
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found for your hotel property." },
        { status: 404 }
      );
    }

    // 2. Prevent Duplicate Invoices
    const existingInvoice = await Invoice.findOne({
      bookingId: booking._id,
      hotelId: authUser.hotelId,
    })
      .populate("customerId", "customerId fullName phone email")
      .populate("roomId", "roomNumber floor roomType")
      .populate("generatedBy", "name email role");

    if (existingInvoice) {
      return NextResponse.json({
        success: true,
        message: "Invoice already exists for this booking.",
        invoice: existingInvoice,
        alreadyExists: true,
      });
    }

    // 3. Parse optional overrides or additional charges
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const additionalCharges = Array.isArray(body.additionalCharges)
      ? body.additionalCharges.map((c: any) => ({
          description: String(c.description || "Service Charge").trim(),
          amount: Math.max(0, Number(c.amount) || 0),
          date: c.date ? new Date(c.date) : new Date(),
        }))
      : [];

    const discount = body.discount !== undefined ? Number(body.discount) : (booking.discount || 0);
    const amountPaid = Math.max(0, Number(body.amountPaid) || 0);
    const paymentMethod = body.paymentMethod || "CASH";
    const transactionRef = body.transactionRef ? String(body.transactionRef).trim() : undefined;
    const notes = body.notes ? String(body.notes).trim() : undefined;

    // 4. Server-Side Bill Calculation
    const billing = calculateCheckoutBilling({
      pricePerNight: booking.pricePerNight,
      scheduledCheckIn: booking.checkInDate,
      scheduledCheckOut: booking.checkOutDate,
      actualCheckOut: booking.actualCheckOutDate || new Date(),
      additionalCharges,
      discount,
      amountPaid,
      taxRate: 0.12,
    });

    const paymentHistory =
      billing.amountPaid > 0
        ? [
            {
              amount: billing.amountPaid,
              paymentMethod,
              transactionRef,
              recordedBy: authUser.userId as any,
              recordedAt: new Date(),
              notes: "Initial invoice generation settlement",
            },
          ]
        : [];

    // 5. Generate and Save Invoice
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
      generatedAt: new Date(),
      notes: notes || "",
    });

    await invoice.save();

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate("customerId", "customerId fullName phone email")
      .populate("roomId", "roomNumber floor roomType")
      .populate("generatedBy", "name email role");

    return NextResponse.json({
      success: true,
      message: "Invoice generated successfully.",
      invoice: populatedInvoice,
    });
  } catch (err: any) {
    console.error("Generate invoice error:", err);
    if (err.message?.includes("Unauthorized") || err.message?.includes("Forbidden")) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to generate invoice." },
      { status: 500 }
    );
  }
}
