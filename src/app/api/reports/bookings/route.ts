import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Customer from "@/models/Customer";
import Room from "@/models/Room";
import Invoice from "@/models/Invoice";
import Hotel from "@/models/Hotel";
import { requireFrontDeskUser, handleAuthError } from "@/lib/auth";
import { parseReportDateRange } from "@/lib/reportService";

/**
 * GET /api/reports/bookings
 * Multi-tenant historical booking ledger with search, filtering, and pagination.
 * Authorized for Manager and Receptionist.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireFrontDeskUser(req);
    await connectToDatabase();

    const hotelId = new mongoose.Types.ObjectId(authUser.hotelId);
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.toUpperCase() || "ALL";
    const paymentStatus = searchParams.get("paymentStatus")?.toUpperCase() || "ALL";
    const roomId = searchParams.get("roomId")?.trim();
    const roomType = searchParams.get("roomType")?.trim();
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));

    // Date Range
    const dateRange = parseReportDateRange(
      searchParams.get("preset"),
      searchParams.get("startDate"),
      searchParams.get("endDate")
    );

    const query: Record<string, any> = {
      hotelId,
      createdAt: { $gte: dateRange.startDate, $lt: dateRange.endDate },
    };

    // Booking status filter
    if (status !== "ALL" && ["CONFIRMED", "CHECKED_IN", "COMPLETED", "CANCELLED"].includes(status)) {
      query.status = status;
    }

    // Room ID filter
    if (roomId && mongoose.Types.ObjectId.isValid(roomId)) {
      query.roomId = new mongoose.Types.ObjectId(roomId);
    }

    // Search query (bookingId, guest name, phone, room number)
    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

      const [matchedCustomers, matchedRooms] = await Promise.all([
        Customer.find({
          hotelId,
          $or: [{ fullName: searchRegex }, { phone: searchRegex }, { email: searchRegex }],
        }).select("_id"),
        Room.find({
          hotelId,
          roomNumber: searchRegex,
        }).select("_id"),
      ]);

      const orConditions: any[] = [{ bookingId: searchRegex }];

      if (matchedCustomers.length > 0) {
        orConditions.push({ customerId: { $in: matchedCustomers.map((c) => c._id) } });
      }

      if (matchedRooms.length > 0) {
        orConditions.push({ roomId: { $in: matchedRooms.map((r) => r._id) } });
      }

      query.$and = [
        { createdAt: query.createdAt },
        ...(query.status ? [{ status: query.status }] : []),
        ...(query.roomId ? [{ roomId: query.roomId }] : []),
        { $or: orConditions },
      ];
      delete query.createdAt;
      delete query.status;
      delete query.roomId;
    }

    // Sorting
    const sortOptions: Record<string, any> = {};
    if (sortBy === "totalAmount") {
      sortOptions.totalAmount = sortOrder;
    } else if (sortBy === "checkInDate") {
      sortOptions.checkInDate = sortOrder;
    } else if (sortBy === "checkOutDate") {
      sortOptions.checkOutDate = sortOrder;
    } else {
      sortOptions.createdAt = sortOrder;
    }

    const total = await Booking.countDocuments(query);
    const bookings = await Booking.find(query)
      .populate("customerId", "customerId fullName phone email idType idNumber")
      .populate("roomId", "roomNumber floor roomType pricePerNight capacity status")
      .populate("checkedInBy", "name email")
      .populate("checkedOutBy", "name email")
      .populate("createdBy", "name email")
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Link invoice payments if available
    const bookingIds = bookings.map((b) => b._id);
    const invoices = await Invoice.find({
      hotelId,
      bookingId: { $in: bookingIds },
    })
      .select("bookingId totalAmount amountPaid amountDue paymentStatus invoiceNumber")
      .lean();

    const invoiceMap = new Map(invoices.map((inv) => [inv.bookingId?.toString(), inv]));

    const enrichedBookings = bookings.map((b: any) => {
      const inv = invoiceMap.get(b._id.toString());
      const customer = b.customerId && typeof b.customerId === "object" ? b.customerId : {};
      const room = b.roomId && typeof b.roomId === "object" ? b.roomId : {};
      const totalPrice = b.totalAmount ?? ((b.pricePerNight || 0) * (b.numberOfNights || 1));
      const amountPaid = inv?.amountPaid || 0;
      const amountDue = inv?.amountDue ?? Math.max(0, totalPrice - amountPaid);
      const paymentStatus = inv?.paymentStatus || (amountPaid >= totalPrice && totalPrice > 0 ? "PAID" : amountPaid > 0 ? "PARTIALLY_PAID" : "UNPAID");

      return {
        ...b,
        customer: {
          fullName: customer.fullName || "Guest",
          phone: customer.phone || "—",
          email: customer.email || "",
          city: customer.city || "",
          state: customer.state || "",
        },
        room: {
          roomNumber: room.roomNumber || "N/A",
          roomType: room.roomType || "Standard",
          floor: room.floor || 1,
          pricePerNight: room.pricePerNight || b.pricePerNight || 0,
        },
        totalPrice,
        roomCharges: b.roomAmount || ((b.pricePerNight || 0) * (b.numberOfNights || 1)),
        discount: b.discount || 0,
        taxAmount: b.tax || 0,
        amountPaid,
        checkInAt: b.checkInAt || null,
        checkOutAt: b.checkOutAt || null,
        actualCheckIn: b.actualCheckInAt || b.actualCheckInDate || b.checkedInAt || b.actualCheckIn || null,
        actualCheckOut: b.actualCheckOutAt || b.actualCheckOutDate || b.actualCheckOut || null,
        invoice: inv || null,
        paymentStatus,
      };
    });

    // Optional payment status filter post-enrichment
    let finalBookings = enrichedBookings;
    if (paymentStatus !== "ALL") {
      finalBookings = enrichedBookings.filter((b) => b.paymentStatus === paymentStatus);
    }

    // Fetch hotel property details for document headers
    const hotel = await Hotel.findById(hotelId)
      .select("name address city state country phone email gstNumber hotelCode")
      .lean();

    // Compute status counts and revenue for summary KPI
    const statusCounts = await Booking.aggregate([
      { $match: { hotelId, createdAt: { $gte: dateRange.startDate, $lt: dateRange.endDate } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const totalRevenue = enrichedBookings.reduce((sum: number, b: any) => sum + (Number(b.totalPrice) || 0), 0);

    const summary = {
      total,
      completed: 0,
      checkedIn: 0,
      confirmed: 0,
      cancelled: 0,
      totalRevenue,
    };

    statusCounts.forEach((s) => {
      if (s._id === "COMPLETED") summary.completed = s.count;
      else if (s._id === "CHECKED_IN") summary.checkedIn = s.count;
      else if (s._id === "CONFIRMED") summary.confirmed = s.count;
      else if (s._id === "CANCELLED") summary.cancelled = s.count;
    });

    return NextResponse.json({
      success: true,
      hotel,
      dateRange: {
        preset: dateRange.preset,
        label: dateRange.label,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      bookings: finalBookings,
      summary,
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
