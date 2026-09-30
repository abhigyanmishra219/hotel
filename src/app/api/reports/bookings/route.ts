import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Customer from "@/models/Customer";
import Room from "@/models/Room";
import Invoice from "@/models/Invoice";
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

    const enrichedBookings = bookings.map((b) => {
      const inv = invoiceMap.get(b._id.toString());
      return {
        ...b,
        invoice: inv || null,
        paymentStatus: inv?.paymentStatus || "UNPAID",
      };
    });

    // Optional payment status filter post-enrichment
    let finalBookings = enrichedBookings;
    if (paymentStatus !== "ALL") {
      finalBookings = enrichedBookings.filter((b) => b.paymentStatus === paymentStatus);
    }

    return NextResponse.json({
      success: true,
      dateRange: {
        preset: dateRange.preset,
        label: dateRange.label,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      bookings: finalBookings,
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
