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

    const invoice = await Invoice.findOne({
      _id: id,
      hotelId: authUser.hotelId,
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found for your hotel property." },
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
