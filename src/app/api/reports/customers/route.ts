import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Customer from "@/models/Customer";
import Booking from "@/models/Booking";
import Invoice from "@/models/Invoice";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { parseReportDateRange } from "@/lib/reportService";

/**
 * GET /api/reports/customers
 * Customer metrics, lifetime spend, booking counts, new vs returning guests.
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

    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const { startDate, endDate, prevStartDate, prevEndDate } = dateRange;

    // 1. Hotel-wide Total Customers
    const totalCustomersAllTime = await Customer.countDocuments({ hotelId, isActive: true });

    // 2. New Customers in Window
    const newCustomersInWindow = await Customer.countDocuments({
      hotelId,
      createdAt: { $gte: startDate, $lt: endDate },
    });

    const prevNewCustomers = await Customer.countDocuments({
      hotelId,
      createdAt: { $gte: prevStartDate, $lt: prevEndDate },
    });

    // 3. Customers with >= 2 bookings (Returning Guests in this hotel)
    const returningGuestsAgg = await Booking.aggregate([
      { $match: { hotelId } },
      { $group: { _id: "$customerId", count: { $sum: 1 } } },
      { $match: { count: { $gte: 2 } } },
      { $count: "returningCount" },
    ]);
    const returningCustomers = returningGuestsAgg[0]?.returningCount || 0;

    // 4. Bookings & Invoices inside this date window
    const [windowBookingsCount, windowCompletedCount, windowInvoices] = await Promise.all([
      Booking.countDocuments({
        hotelId,
        createdAt: { $gte: startDate, $lt: endDate },
      }),
      Booking.countDocuments({
        hotelId,
        status: "COMPLETED",
        createdAt: { $gte: startDate, $lt: endDate },
      }),
      Invoice.find({
        hotelId,
        createdAt: { $gte: startDate, $lt: endDate },
      }).select("totalAmount amountPaid").lean(),
    ]);

    let totalCustomerRevenue = 0;
    let totalCustomerPaid = 0;
    for (const inv of windowInvoices) {
      totalCustomerRevenue += inv.totalAmount || 0;
      totalCustomerPaid += inv.amountPaid || 0;
    }

    // 5. Customer list query with search & pagination
    const customerFilter: any = { hotelId, isActive: true };
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      customerFilter.$or = [
        { fullName: { $regex: escaped, $options: "i" } },
        { phone: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
        { customerId: { $regex: escaped, $options: "i" } },
      ];
    }

    const totalFilteredCustomers = await Customer.countDocuments(customerFilter);
    const customers = await Customer.find(customerFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("customerId fullName phone email city state createdAt")
      .lean();

    // Enrich each customer with aggregate bookings & spend within this hotel
    const customerIds = customers.map((c) => c._id);
    const [bookingStats, invoiceStats] = await Promise.all([
      Booking.aggregate([
        { $match: { hotelId, customerId: { $in: customerIds } } },
        {
          $group: {
            _id: "$customerId",
            totalBookings: { $sum: 1 },
            completedStays: {
              $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
            },
            cancelledBookings: {
              $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] },
            },
          },
        },
      ]),
      Invoice.aggregate([
        { $match: { hotelId, customerId: { $in: customerIds } } },
        {
          $group: {
            _id: "$customerId",
            totalSpent: { $sum: "$totalAmount" },
            totalPaid: { $sum: "$amountPaid" },
            totalDue: { $sum: "$amountDue" },
          },
        },
      ]),
    ]);

    const bookingMap = new Map(bookingStats.map((b) => [String(b._id), b]));
    const invoiceMap = new Map(invoiceStats.map((i) => [String(i._id), i]));

    const enrichedCustomers = customers.map((c) => {
      const bStat = bookingMap.get(String(c._id));
      const iStat = invoiceMap.get(String(c._id));
      return {
        _id: c._id,
        customerId: c.customerId,
        fullName: c.fullName,
        phone: c.phone,
        email: c.email || "—",
        location: [c.city, c.state].filter(Boolean).join(", ") || "—",
        createdAt: c.createdAt,
        totalBookings: bStat?.totalBookings || 0,
        completedStays: bStat?.completedStays || 0,
        cancelledBookings: bStat?.cancelledBookings || 0,
        totalSpent: iStat?.totalSpent || 0,
        totalPaid: iStat?.totalPaid || 0,
        totalDue: iStat?.totalDue || 0,
      };
    });

    return NextResponse.json({
      success: true,
      dateRange: {
        preset: dateRange.preset,
        label: dateRange.label,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      summary: {
        totalCustomers: totalCustomersAllTime,
        newCustomers: newCustomersInWindow,
        returningCustomers,
        deltaNewCustomers: newCustomersInWindow - prevNewCustomers,
        totalBookings: windowBookingsCount,
        completedStays: windowCompletedCount,
        totalRevenue: totalCustomerRevenue,
        totalPaid: totalCustomerPaid,
      },
      customers: enrichedCustomers,
      pagination: {
        page,
        limit,
        totalRecords: totalFilteredCustomers,
        totalPages: Math.ceil(totalFilteredCustomers / limit) || 1,
      },
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
