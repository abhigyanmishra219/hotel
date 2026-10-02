import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireFrontDeskUser } from "@/lib/auth";
import Invoice from "@/models/Invoice";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireFrontDeskUser(req);
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const body = await req.json();
    const paymentAmount = Math.round(Number(body.amount) || 0);
    const paymentMethod = body.paymentMethod || "CASH";
    const transactionRef = body.transactionRef ? String(body.transactionRef).trim() : undefined;
    const notes = body.notes ? String(body.notes).trim() : undefined;

    if (paymentAmount <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be greater than 0." },
        { status: 400 }
      );
    }

    await connectDB();

    let invoice = await Invoice.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { invoiceId: id }].filter(Boolean) as any,
      hotelId: authUser.hotelId,
    });

    if (!invoice) {
      // Check if id corresponds to an active booking
      const Booking = (await import("@/models/Booking")).default;
      const booking = await Booking.findOne({
        $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { bookingId: id }].filter(Boolean) as any,
        hotelId: authUser.hotelId,
      });

      if (booking) {
        invoice = await Invoice.findOne({
          bookingId: booking._id,
          hotelId: authUser.hotelId,
        });

        if (!invoice) {
          const roomAmount = booking.roomAmount || (booking.pricePerNight * booking.numberOfNights);
          const discount = booking.discount || 0;
          const tax = booking.tax || Math.round(Math.max(0, roomAmount - discount) * 0.12);
          const totalAmount = Math.max(0, roomAmount - discount) + tax;

          invoice = new Invoice({
            hotelId: booking.hotelId,
            bookingId: booking._id,
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
            paymentMethod,
            paymentHistory: [],
            generatedBy: authUser.userId as any,
            generatedAt: new Date(),
            notes: "Interim stay folio",
          });
          await invoice.save();
        }
      }
    }

    if (!invoice) {
      return NextResponse.json(
        { error: "Billing folio or invoice not found for your hotel property." },
        { status: 404 }
      );
    }

    if (invoice.amountDue <= 0) {
      return NextResponse.json(
        { error: "This invoice is already fully paid." },
        { status: 400 }
      );
    }

    if (paymentAmount > invoice.amountDue) {
      return NextResponse.json(
        {
          error: `Payment amount (₹${paymentAmount.toLocaleString()}) cannot exceed remaining balance due (₹${invoice.amountDue.toLocaleString()}).`,
        },
        { status: 400 }
      );
    }

    // Record payment
    const newAmountPaid = invoice.amountPaid + paymentAmount;
    const newAmountDue = Math.max(0, invoice.totalAmount - newAmountPaid);

    invoice.amountPaid = newAmountPaid;
    invoice.amountDue = newAmountDue;
    invoice.paymentStatus = newAmountDue === 0 ? "PAID" : "PARTIALLY_PAID";
    invoice.paymentMethod = paymentMethod;

    invoice.paymentHistory.push({
      amount: paymentAmount,
      paymentMethod,
      transactionRef,
      recordedBy: authUser.userId as any,
      recordedAt: new Date(),
      notes: notes || "Incremental payment receipt",
    });

    await invoice.save();

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate("customerId", "customerId fullName phone email")
      .populate("roomId", "roomNumber floor roomType")
      .populate("paymentHistory.recordedBy", "name email");

    return NextResponse.json({
      success: true,
      message: `Payment of ₹${paymentAmount.toLocaleString()} recorded successfully. New balance due: ₹${newAmountDue.toLocaleString()}.`,
      invoice: populatedInvoice,
    });
  } catch (err: any) {
    console.error("Payment recording error:", err);
    if (err.message?.includes("Unauthorized") || err.message?.includes("Forbidden")) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to record invoice payment." },
      { status: 500 }
    );
  }
}
