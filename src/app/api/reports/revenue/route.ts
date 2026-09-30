import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { parseReportDateRange } from "@/lib/reportService";

/**
 * GET /api/reports/revenue
 * Financial Revenue Report with time-series daily aggregations and invoice breakdown.
 * Protected for Manager role.
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
    const dateRange = parseReportDateRange(
      searchParams.get("preset"),
      searchParams.get("startDate"),
      searchParams.get("endDate")
    );

    const { startDate, endDate, prevStartDate, prevEndDate } = dateRange;

    // 1. Fetch Invoices in current date window
    const invoices = await Invoice.find({
      hotelId,
      createdAt: { $gte: startDate, $lt: endDate },
    })
      .select(
        "totalAmount amountPaid amountDue roomAmount additionalCharges discount tax paymentStatus paymentMethod createdAt"
      )
      .sort({ createdAt: 1 })
      .lean();

    let totalGrossRevenue = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let totalRoomRevenue = 0;
    let totalAdditionalCharges = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    const paymentStatusCounts = {
      PAID: 0,
      PARTIALLY_PAID: 0,
      UNPAID: 0,
    };

    const paymentMethodCounts: Record<string, number> = {};

    // Grouping by Date for time-series chart
    const dailyMap = new Map<string, { date: string; revenue: number; collected: number; invoicesCount: number }>();

    for (const inv of invoices) {
      const gross = inv.totalAmount || 0;
      const paid = inv.amountPaid || 0;
      const due = inv.amountDue || 0;

      totalGrossRevenue += gross;
      totalCollected += paid;
      totalOutstanding += due;
      totalRoomRevenue += inv.roomAmount || 0;
      totalTax += inv.tax || 0;
      totalDiscount += inv.discount || 0;

      if (Array.isArray(inv.additionalCharges)) {
        totalAdditionalCharges += inv.additionalCharges.reduce(
          (acc, c) => acc + (c.amount || 0),
          0
        );
      }

      // Status tally
      if (inv.paymentStatus in paymentStatusCounts) {
        paymentStatusCounts[inv.paymentStatus as keyof typeof paymentStatusCounts] += 1;
      }

      // Method tally
      const method = inv.paymentMethod || "CASH";
      paymentMethodCounts[method] = (paymentMethodCounts[method] || 0) + 1;

      // Date key
      const dateKey = new Date(inv.createdAt).toISOString().split("T")[0];
      const existing = dailyMap.get(dateKey) || {
        date: dateKey,
        revenue: 0,
        collected: 0,
        invoicesCount: 0,
      };

      existing.revenue += gross;
      existing.collected += paid;
      existing.invoicesCount += 1;
      dailyMap.set(dateKey, existing);
    }

    // Previous window comparison
    const prevInvoices = await Invoice.find({
      hotelId,
      createdAt: { $gte: prevStartDate, $lt: prevEndDate },
    })
      .select("totalAmount amountPaid")
      .lean();

    let prevGrossRevenue = 0;
    let prevCollected = 0;
    for (const inv of prevInvoices) {
      prevGrossRevenue += inv.totalAmount || 0;
      prevCollected += inv.amountPaid || 0;
    }

    const timeSeries = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return NextResponse.json({
      success: true,
      dateRange: {
        preset: dateRange.preset,
        label: dateRange.label,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      summary: {
        totalGrossRevenue,
        totalCollected,
        totalOutstanding,
        totalRoomRevenue,
        totalAdditionalCharges,
        totalTax,
        totalDiscount,
        totalInvoices: invoices.length,
        prevGrossRevenue,
        prevCollected,
        revenueDelta: totalGrossRevenue - prevGrossRevenue,
      },
      paymentStatusCounts,
      paymentMethodCounts,
      timeSeries,
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
