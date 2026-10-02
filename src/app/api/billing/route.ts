import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireFrontDeskUser } from "@/lib/auth";
import Booking from "@/models/Booking";
import Invoice from "@/models/Invoice";
import Customer from "@/models/Customer";
import Room from "@/models/Room";
import Hotel from "@/models/Hotel";

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireFrontDeskUser(req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const paymentStatus = searchParams.get("paymentStatus") || "ALL";
    const stayStatus = searchParams.get("stayStatus") || "ALL";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));

    // 1. Resolve search query to IDs if searching
    let matchingCustomerIds: any[] | null = null;
    let matchingRoomIds: any[] | null = null;
    let matchingBookingMongoIds: any[] | null = null;

    if (search) {
      const customers = await Customer.find({
        hotelId: authUser.hotelId,
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { customerId: { $regex: search, $options: "i" } },
        ],
      }).select("_id");
      matchingCustomerIds = customers.map((c) => c._id);

      const rooms = await Room.find({
        hotelId: authUser.hotelId,
        roomNumber: { $regex: search, $options: "i" },
      }).select("_id");
      matchingRoomIds = rooms.map((r) => r._id);

      const bookings = await Booking.find({
        hotelId: authUser.hotelId,
        bookingId: { $regex: search, $options: "i" },
      }).select("_id");
      matchingBookingMongoIds = bookings.map((b) => b._id);
    }

    // 2. FETCH ACTIVE / OPEN FOLIOS (Stays currently in-house or confirmed reservations)
    const openBookingQuery: any = {
      hotelId: authUser.hotelId,
      status: stayStatus === "ALL" 
        ? { $in: ["CHECKED_IN", "CONFIRMED"] } 
        : stayStatus,
    };

    if (search) {
      openBookingQuery.$or = [
        { bookingId: { $regex: search, $options: "i" } },
        { customerId: { $in: matchingCustomerIds } },
        { roomId: { $in: matchingRoomIds } },
      ];
    }

    const activeBookings = await Booking.find(openBookingQuery)
      .populate("customerId", "customerId fullName phone email city")
      .populate("roomId", "roomNumber roomType floor pricePerNight")
      .sort({ checkInDate: 1, createdAt: -1 })
      .lean();

    // Fetch existing Invoices for these active bookings (if advance payments / interim invoices were recorded)
    const activeBookingIds = activeBookings.map((b) => b._id);
    const existingInvoicesForActive = await Invoice.find({
      hotelId: authUser.hotelId,
      bookingId: { $in: activeBookingIds },
    }).lean();

    const invoiceByBookingId = new Map<string, any>();
    existingInvoicesForActive.forEach((inv) => {
      invoiceByBookingId.set(String(inv.bookingId), inv);
    });

    // Map active bookings into real-time Open Folios
    let openFolios = activeBookings.map((b: any) => {
      const inv = invoiceByBookingId.get(String(b._id));

      let totalCharges = 0;
      let totalPaid = 0;
      let balance = 0;
      let status: "UNPAID" | "PARTIALLY_PAID" | "PAID" = "UNPAID";
      let additionalCharges: any[] = [];
      let paymentHistory: any[] = [];
      let invoiceId: string | null = null;
      let invoiceDbId: string | null = null;

      if (inv) {
        totalCharges = inv.totalAmount;
        totalPaid = inv.amountPaid || 0;
        balance = inv.amountDue ?? Math.max(0, totalCharges - totalPaid);
        status = inv.paymentStatus;
        additionalCharges = inv.additionalCharges || [];
        paymentHistory = inv.paymentHistory || [];
        invoiceId = inv.invoiceId;
        invoiceDbId = String(inv._id);
      } else {
        const roomAmount = b.roomAmount || ((b.pricePerNight || 0) * (b.numberOfNights || 1));
        const discount = b.discount || 0;
        const taxable = Math.max(0, roomAmount - discount);
        const tax = b.tax || Math.round(taxable * 0.12);
        totalCharges = taxable + tax;
        totalPaid = 0;
        balance = totalCharges;
        status = "UNPAID";
      }

      return {
        _id: String(b._id),
        bookingId: b.bookingId,
        bookingStatus: b.status, // "CHECKED_IN" | "CONFIRMED"
        guestName: b.customerId?.fullName || "Guest",
        guestPhone: b.customerId?.phone || "",
        guestEmail: b.customerId?.email || "",
        customerId: b.customerId?._id ? String(b.customerId._id) : null,
        roomNumber: b.roomId?.roomNumber || "N/A",
        roomType: b.roomId?.roomType || "Standard",
        roomId: b.roomId?._id ? String(b.roomId._id) : null,
        checkInDate: b.checkInDate,
        checkOutDate: b.checkOutDate,
        numberOfNights: b.numberOfNights || 1,
        pricePerNight: b.pricePerNight || 0,
        totalCharges,
        totalPaid,
        balance,
        paymentStatus: status,
        additionalCharges,
        paymentHistory,
        hasInvoice: !!inv,
        invoiceId,
        invoiceDbId,
        notes: b.notes || "",
      };
    });

    // Filter open folios by payment status if requested
    if (paymentStatus && paymentStatus !== "ALL") {
      openFolios = openFolios.filter((f) => f.paymentStatus === paymentStatus);
    }

    // 3. FETCH FINALIZED INVOICES (From Invoice collection)
    const finalizedInvoiceQuery: any = {
      hotelId: authUser.hotelId,
    };

    if (paymentStatus && paymentStatus !== "ALL") {
      finalizedInvoiceQuery.paymentStatus = paymentStatus;
    }

    if (search) {
      finalizedInvoiceQuery.$or = [
        { invoiceId: { $regex: search, $options: "i" } },
        { customerId: { $in: matchingCustomerIds } },
        { roomId: { $in: matchingRoomIds } },
        { bookingId: { $in: matchingBookingMongoIds } },
        { "paymentHistory.transactionRef": { $regex: search, $options: "i" } },
      ];
    }

    const totalFinalized = await Invoice.countDocuments(finalizedInvoiceQuery);
    const finalizedInvoicesRaw = await Invoice.find(finalizedInvoiceQuery)
      .populate("customerId", "customerId fullName phone email city")
      .populate("roomId", "roomNumber roomType floor")
      .populate("bookingId", "bookingId checkInDate checkOutDate numberOfNights status")
      .populate("generatedBy", "name email role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const finalizedInvoices = finalizedInvoicesRaw.map((inv: any) => ({
      _id: String(inv._id),
      invoiceId: inv.invoiceId,
      bookingRef: inv.bookingId?.bookingId || "N/A",
      bookingDbId: inv.bookingId?._id ? String(inv.bookingId._id) : null,
      bookingStatus: inv.bookingId?.status || "COMPLETED",
      guestName: inv.customerId?.fullName || "Guest",
      guestPhone: inv.customerId?.phone || "",
      roomNumber: inv.roomId?.roomNumber || "N/A",
      roomType: inv.roomId?.roomType || "",
      invoiceDate: inv.createdAt,
      totalAmount: inv.totalAmount,
      amountPaid: inv.amountPaid || 0,
      amountDue: inv.amountDue ?? Math.max(0, inv.totalAmount - (inv.amountPaid || 0)),
      paymentStatus: inv.paymentStatus,
      paymentMethod: inv.paymentMethod || "CASH",
      numberOfNights: inv.numberOfNights || 1,
      pricePerNight: inv.pricePerNight || 0,
      roomAmount: inv.roomAmount || 0,
      additionalCharges: inv.additionalCharges || [],
      discount: inv.discount || 0,
      tax: inv.tax || 0,
      paymentHistory: inv.paymentHistory || [],
      generatedBy: inv.generatedBy,
    }));

    // 4. Property Summary Metrics
    const totalOpenBalance = openFolios.reduce((acc, f) => acc + (f.balance || 0), 0);
    const totalOpenCharges = openFolios.reduce((acc, f) => acc + (f.totalCharges || 0), 0);
    const totalOpenPaid = openFolios.reduce((acc, f) => acc + (f.totalPaid || 0), 0);
    const totalFinalizedPaid = finalizedInvoices.reduce((acc, f) => acc + (f.amountPaid || 0), 0);

    return NextResponse.json({
      success: true,
      openFolios,
      finalizedInvoices,
      pagination: {
        total: totalFinalized,
        page,
        limit,
        totalPages: Math.ceil(totalFinalized / limit) || 1,
      },
      summary: {
        openFoliosCount: openFolios.length,
        finalizedInvoicesCount: totalFinalized,
        totalOpenBalance,
        totalOpenCharges,
        totalOpenPaid,
        totalCollected: totalOpenPaid + totalFinalizedPaid,
      },
    });
  } catch (err: any) {
    console.error("Fetch billing ledger error:", err);
    if (err.message?.includes("Unauthorized") || err.message?.includes("Forbidden")) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to load billing ledger." },
      { status: 500 }
    );
  }
}
