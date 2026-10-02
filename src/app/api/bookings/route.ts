import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Customer from "@/models/Customer";
import Room from "@/models/Room";
import Hotel from "@/models/Hotel";
import { requireFrontDeskUser, handleAuthError } from "@/lib/auth";
import {
  normalizeDateToMidnight,
  calculateStayNights,
  checkBookingConflict,
  calculateBookingPricing,
} from "@/lib/bookingService";

/**
 * GET /api/bookings
 * Lists all bookings belonging ONLY to the authenticated user's hotel.
 * Supports: search (bookingId, guest name/phone, roomNumber), status filter, date range, pagination, sorting.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireFrontDeskUser(req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.toUpperCase() || "ALL";
    const dateFilter = searchParams.get("dateFilter")?.toUpperCase() || "ALL";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const roomId = searchParams.get("roomId");
    const customerId = searchParams.get("customerId");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    // STRICT MULTI-TENANT QUERY
    const query: any = {
      hotelId: authUser.hotelId,
    };

    if (status !== "ALL" && ["CONFIRMED", "CANCELLED", "COMPLETED"].includes(status)) {
      query.status = status;
    }

    if (roomId && mongoose.Types.ObjectId.isValid(roomId)) {
      query.roomId = new mongoose.Types.ObjectId(roomId);
    }

    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      query.customerId = new mongoose.Types.ObjectId(customerId);
    }

    // Date Filters
    const now = normalizeDateToMidnight(new Date());
    if (dateFilter === "TODAY") {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      query.checkInDate = { $gte: now, $lt: tomorrow };
    } else if (dateFilter === "UPCOMING") {
      query.checkInDate = { $gte: now };
    } else if (dateFilter === "PAST") {
      query.checkOutDate = { $lt: now };
    } else if (startDate && endDate) {
      query.checkInDate = {
        $gte: normalizeDateToMidnight(startDate),
        $lte: normalizeDateToMidnight(endDate),
      };
    }

    // Search by guest name / phone / bookingId / roomNumber
    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

      // Find matching customers in this hotel
      const matchedCustomers = await Customer.find({
        hotelId: authUser.hotelId,
        $or: [{ fullName: searchRegex }, { phone: searchRegex }, { email: searchRegex }],
      }).select("_id");

      // Find matching rooms in this hotel
      const matchedRooms = await Room.find({
        hotelId: authUser.hotelId,
        roomNumber: searchRegex,
      }).select("_id");

      const orConditions: any[] = [{ bookingId: searchRegex }];

      if (matchedCustomers.length > 0) {
        orConditions.push({ customerId: { $in: matchedCustomers.map((c) => c._id) } });
      }

      if (matchedRooms.length > 0) {
        orConditions.push({ roomId: { $in: matchedRooms.map((r) => r._id) } });
      }

      query.$or = orConditions;
    }

    const sortOptions: any = {};
    if (sortBy === "checkInDate") {
      sortOptions.checkInDate = sortOrder;
    } else if (sortBy === "totalAmount") {
      sortOptions.totalAmount = sortOrder;
    } else if (sortBy === "bookingId") {
      sortOptions.bookingId = sortOrder;
    } else {
      sortOptions.createdAt = sortOrder;
    }

    const total = await Booking.countDocuments(query);
    const skip = (page - 1) * limit;

    const bookings = await Booking.find(query)
      .populate("customerId", "customerId fullName phone email")
      .populate("roomId", "roomNumber roomType pricePerNight floor capacity")
      .populate("createdBy", "name email role")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    const hotel = await Hotel.findById(authUser.hotelId).select("name hotelCode").lean();

    return NextResponse.json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      bookings: bookings.map((b: any) => ({
        ...b,
        hotelName: hotel?.name || "Your Hotel",
      })),
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * POST /api/bookings
 * Creates a new booking strictly isolated to the authenticated hotel.
 * Validates dates, guest capacity, checks room & customer tenant ownership,
 * and executes backend double-booking prevention.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await requireFrontDeskUser(req);
    await connectToDatabase();

    const body = await req.json();
    const {
      customerId,
      roomId,
      checkInDate: rawCheckIn,
      checkInTime = "14:00",
      checkOutDate: rawCheckOut,
      checkOutTime = "11:00",
      adults,
      children = 0,
      discount = 0,
      notes,
      bookingSource = "WALK_IN",
    } = body;

    // 1. Validate required inputs
    if (!customerId || !roomId || !rawCheckIn || !rawCheckOut) {
      return NextResponse.json(
        { error: "Customer, Room, Check-in Date, and Check-out Date are all required" },
        { status: 400 }
      );
    }

    if (!checkInTime) {
      return NextResponse.json(
        { error: "Check-in time is required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(customerId) || !mongoose.Types.ObjectId.isValid(roomId)) {
      return NextResponse.json({ error: "Invalid Customer ID or Room ID format" }, { status: 400 });
    }

    const numAdults = parseInt(String(adults || "1"), 10);
    const numChildren = parseInt(String(children || "0"), 10);

    if (numAdults < 1) {
      return NextResponse.json({ error: "At least 1 adult guest is required" }, { status: 400 });
    }

    const totalGuests = numAdults + numChildren;

    // 2. Validate Dates & Stay Duration
    const checkInDate = normalizeDateToMidnight(rawCheckIn);
    const checkOutDate = normalizeDateToMidnight(rawCheckOut);
    let numberOfNights = 1;

    try {
      numberOfNights = calculateStayNights(checkInDate, checkOutDate);
    } catch (dateErr: any) {
      return NextResponse.json({ error: dateErr.message }, { status: 400 });
    }

    // Combine date + time for checkInAt and checkOutAt
    const [inHours, inMins] = (checkInTime || "14:00").split(":").map(Number);
    const checkInAt = new Date(checkInDate);
    checkInAt.setUTCHours(isNaN(inHours) ? 14 : inHours, isNaN(inMins) ? 0 : inMins, 0, 0);

    const [outHours, outMins] = (checkOutTime || "11:00").split(":").map(Number);
    const checkOutAt = new Date(checkOutDate);
    checkOutAt.setUTCHours(isNaN(outHours) ? 11 : outHours, isNaN(outMins) ? 0 : outMins, 0, 0);

    // 3. Verify Customer belongs to this Hotel
    const customer = await Customer.findOne({
      _id: customerId,
      hotelId: authUser.hotelId,
      isActive: true,
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Selected customer does not exist in your hotel or is inactive" },
        { status: 404 }
      );
    }

    // 4. Verify Room belongs to this Hotel and is active
    const room = await Room.findOne({
      _id: roomId,
      hotelId: authUser.hotelId,
      isActive: true,
    });

    if (!room) {
      return NextResponse.json(
        { error: "Selected room does not exist in your hotel or is deactivated" },
        { status: 404 }
      );
    }

    // 5. Verify Room Capacity
    if (totalGuests > room.capacity) {
      return NextResponse.json(
        {
          error: `Total guest count (${totalGuests}) exceeds maximum capacity of Room ${room.roomNumber} (${room.capacity} guests).`,
        },
        { status: 400 }
      );
    }

    // 6. Double-Booking Prevention: Check for overlapping confirmed bookings
    const { hasConflict, conflictingBooking } = await checkBookingConflict({
      hotelId: authUser.hotelId,
      roomId: room._id,
      checkInDate,
      checkOutDate,
    });

    if (hasConflict) {
      return NextResponse.json(
        {
          error: `Room ${room.roomNumber} is already booked for the selected dates. Please select different dates or choose another room.`,
          conflictDetails: {
            bookingId: conflictingBooking?.bookingId,
            checkIn: conflictingBooking?.checkInDate,
            checkOut: conflictingBooking?.checkOutDate,
          },
        },
        { status: 409 }
      );
    }

    // 7. Calculate Pricing Server-Side (Never trusts client calculations)
    const pricing = calculateBookingPricing({
      pricePerNight: room.pricePerNight,
      numberOfNights,
      discount: typeof discount === "number" ? discount : 0,
    });

    // 8. Generate sequential booking ID
    const count = await Booking.countDocuments({ hotelId: authUser.hotelId });
    const bookingId = `BK-${String(count + 1).padStart(6, "0")}`;

    // 9. Create Booking Record
    const newBooking: any = await Booking.create({
      bookingId,
      hotelId: authUser.hotelId,
      customerId: customer._id,
      roomId: room._id,
      checkInDate,
      checkOutDate,
      checkInAt,
      checkOutAt,
      numberOfGuests: totalGuests,
      adults: numAdults,
      children: numChildren,
      pricePerNight: pricing.pricePerNight, // Preserved snapshot price
      numberOfNights: pricing.numberOfNights,
      roomAmount: pricing.roomAmount,
      discount: pricing.discount,
      tax: pricing.tax,
      totalAmount: pricing.totalAmount,
      status: "CONFIRMED",
      bookingSource: ["WALK_IN", "PHONE", "WEBSITE", "OTHER"].includes(bookingSource)
        ? bookingSource
        : "WALK_IN",
      notes: String(notes || "").trim(),
      createdBy: authUser.userId,
    });

    const populatedBooking = await Booking.findById(newBooking._id)
      .populate("customerId", "customerId fullName phone email")
      .populate("roomId", "roomNumber roomType pricePerNight floor capacity")
      .populate("createdBy", "name email role")
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: `Booking ${newBooking.bookingId} confirmed successfully for ${customer.fullName}`,
        booking: populatedBooking,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return handleAuthError(error);
  }
}
