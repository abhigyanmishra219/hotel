import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireFrontDeskUser } from "@/lib/auth";
import Invoice from "@/models/Invoice";
import Customer from "@/models/Customer";
import Room from "@/models/Room";

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireFrontDeskUser(req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const paymentStatus = searchParams.get("paymentStatus") || "ALL";
    const customerId = searchParams.get("customerId");
    const bookingId = searchParams.get("bookingId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    const query: any = {
      hotelId: authUser.hotelId,
    };

    if (paymentStatus && paymentStatus !== "ALL") {
      query.paymentStatus = paymentStatus;
    }

    if (customerId) {
      query.customerId = customerId;
    }

    if (bookingId) {
      query.bookingId = bookingId;
    }

    const dateFilter = searchParams.get("dateFilter");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (dateFilter === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    } else if (dateFilter === "week") {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      query.createdAt = { $gte: start };
    } else if (dateFilter === "month") {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      query.createdAt = { $gte: start };
    } else if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        query.createdAt.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.createdAt.$lte = e;
      }
    }

    if (search) {
      const matchingCustomers = await Customer.find({
        hotelId: authUser.hotelId,
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { customerId: { $regex: search, $options: "i" } },
        ],
      }).select("_id");
      const customerIds = matchingCustomers.map((c) => c._id);

      const matchingRooms = await Room.find({
        hotelId: authUser.hotelId,
        roomNumber: { $regex: search, $options: "i" },
      }).select("_id");
      const roomIds = matchingRooms.map((r) => r._id);

      const BookingModel = (await import("@/models/Booking")).default;
      const matchingBookings = await BookingModel.find({
        hotelId: authUser.hotelId,
        bookingId: { $regex: search, $options: "i" },
      }).select("_id");
      const bookingIds = matchingBookings.map((b) => b._id);

      query.$or = [
        { invoiceId: { $regex: search, $options: "i" } },
        { customerId: { $in: customerIds } },
        { roomId: { $in: roomIds } },
        { bookingId: { $in: bookingIds } },
        { "paymentHistory.transactionRef": { $regex: search, $options: "i" } },
      ];
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder;

    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .populate("customerId", "customerId fullName phone email city")
      .populate("roomId", "roomNumber roomType floor")
      .populate("bookingId", "bookingId checkInDate checkOutDate numberOfNights status")
      .populate("generatedBy", "name email role")
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      success: true,
      invoices,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error("Fetch invoices error:", err);
    if (err.message?.includes("Unauthorized") || err.message?.includes("Forbidden")) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to load invoices." },
      { status: 500 }
    );
  }
}
