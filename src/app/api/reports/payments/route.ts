import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { parseReportDateRange } from "@/lib/reportService";

/**
 * GET /api/reports/payments
 * Invoices and Collections ledger with payment status breakdowns and customer folio linkage.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireRole(
      [USER_ROLES.MANAGER, USER_ROLES.RECEPTIONIST, USER_ROLES.SYSTEM_ADMIN],
      req
    );
    if (!authUser.hotelId) {
      return NextResponse.json({ error: "User is not assigned to a hotel property" }, { status: 403 });
    }

    await connectToDatabase();
    const hotelId = new mongoose.Types.ObjectId(authUser.hotelId);

    const { searchParams } = new URL(req.url);
    const paymentStatus = searchParams.get("paymentStatus")?.toUpperCase() || "ALL";
    const paymentMethod = searchParams.get("paymentMethod")?.toUpperCase() || "ALL";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));

    const dateRange = parseReportDateRange(
      searchParams.get("preset"),
      searchParams.get("startDate"),
      searchParams.get("endDate")
    );

    const query: Record<string, any> = {
      hotelId,
      createdAt: { $gte: dateRange.startDate, $lt: dateRange.endDate },
    };

    if (paymentStatus !== "ALL" && ["PAID", "PARTIALLY_PAID", "UNPAID"].includes(paymentStatus)) {
      query.paymentStatus = paymentStatus;
    }

    if (paymentMethod !== "ALL" && ["CASH", "UPI", "CARD", "BANK_TRANSFER", "ONLINE"].includes(paymentMethod)) {
      query.paymentMethod = paymentMethod;
    }

    // Summary metrics across full date window
    const allWindowInvoices = await Invoice.find({
      hotelId,
      createdAt: { $gte: dateRange.startDate, $lt: dateRange.endDate },
    })
      .select("totalAmount amountPaid amountDue paymentStatus paymentMethod")
      .lean();

    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;
    const methodsMap: Record<string, { method: string; count: number; collected: number }> = {};

    for (const inv of allWindowInvoices) {
      totalInvoiced += inv.totalAmount || 0;
      totalPaid += inv.amountPaid || 0;
      totalOutstanding += inv.amountDue || 0;

      if (inv.paymentStatus === "PAID") paidCount++;
      else if (inv.paymentStatus === "PARTIALLY_PAID") partialCount++;
      else unpaidCount++;

      const m = inv.paymentMethod || "CASH";
      if (!methodsMap[m]) {
        methodsMap[m] = { method: m, count: 0, collected: 0 };
      }
      methodsMap[m].count += 1;
      methodsMap[m].collected += inv.amountPaid || 0;
    }

    const methodsBreakdown = Object.values(methodsMap);

    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .populate("customerId", "fullName phone email customerId")
      .populate("bookingId", "bookingId checkInDate checkOutDate status")
      .populate("roomId", "roomNumber roomType floor")
      .populate("generatedBy", "name email role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      dateRange: {
        preset: dateRange.preset,
        label: dateRange.label,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      summary: {
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        totalDue: totalOutstanding,
        paidCount,
        partialCount,
        unpaidCount,
        totalInvoices: allWindowInvoices.length,
        invoicesCount: allWindowInvoices.length,
      },
      methodsBreakdown,
      invoices,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
