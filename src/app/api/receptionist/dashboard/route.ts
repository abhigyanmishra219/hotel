import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { requireReceptionist, handleAuthError } from "@/lib/authorization/receptionist";
import Room from "@/models/Room";
import Booking from "@/models/Booking";
import Customer from "@/models/Customer";
import Invoice from "@/models/Invoice";
import HousekeepingTask from "@/models/HousekeepingTask";
import RoomServiceRequest from "@/models/RoomServiceRequest";
import HotelSubscription from "@/models/HotelSubscription";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import { normalizeDateToMidnight } from "@/lib/bookingService";

/**
 * GET /api/receptionist/dashboard
 * Multi-tenant front-desk operational dashboard data aggregation.
 * Strictly scoped to authenticatedUser.hotelId.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, hotelId, hotel } = await requireReceptionist(req);
    await connectToDatabase();

    const todayMidnight = normalizeDateToMidnight(new Date());
    const tomorrowMidnight = new Date(todayMidnight.getTime() + 24 * 60 * 60 * 1000);

    // 1. Room Availability Breakdown
    const [
      totalActiveRooms,
      availableRooms,
      occupiedRooms,
      reservedRooms,
      cleaningRooms,
      maintenanceRooms,
      outOfServiceRooms,
    ] = await Promise.all([
      Room.countDocuments({ hotelId, isActive: true }),
      Room.countDocuments({ hotelId, status: "AVAILABLE", isActive: true }),
      Room.countDocuments({ hotelId, status: "OCCUPIED", isActive: true }),
      Room.countDocuments({ hotelId, status: "RESERVED", isActive: true }),
      Room.countDocuments({ hotelId, status: "CLEANING", isActive: true }),
      Room.countDocuments({ hotelId, status: "MAINTENANCE", isActive: true }),
      Room.countDocuments({ hotelId, status: "OUT_OF_SERVICE", isActive: true }),
    ]);

    // 2. Booking Key Statistics
    const [
      todayBookingsCount,
      todayCheckInsCount,
      todayCheckOutsCount,
      activeBookingsCount,
    ] = await Promise.all([
      Booking.countDocuments({
        hotelId,
        createdAt: { $gte: todayMidnight, $lt: tomorrowMidnight },
      }),
      Booking.countDocuments({
        hotelId,
        status: { $in: ["CONFIRMED", "CHECKED_IN"] },
        checkInDate: { $gte: todayMidnight, $lt: tomorrowMidnight },
      }),
      Booking.countDocuments({
        hotelId,
        status: { $in: ["CONFIRMED", "CHECKED_IN"] },
        checkOutDate: { $gte: todayMidnight, $lt: tomorrowMidnight },
      }),
      Booking.countDocuments({
        hotelId,
        status: { $in: ["CONFIRMED", "CHECKED_IN"] },
      }),
    ]);

    // 3. Financial / Invoices & Revenue Metrics (Backed by actual Database data)
    const [
      unpaidInvoices,
      totalInvoicesCount,
      paidInvoicesCount,
      allInvoicesWithPaymentsToday,
    ] = await Promise.all([
      Invoice.find({
        hotelId,
        paymentStatus: { $in: ["UNPAID", "PARTIALLY_PAID"] },
        amountDue: { $gt: 0 },
      })
        .populate({ path: "customerId", model: Customer, select: "fullName phone email" })
        .populate({ path: "roomId", model: Room, select: "roomNumber roomType" })
        .populate({ path: "bookingId", model: Booking, select: "bookingId status checkInDate checkOutDate" })
        .sort({ amountDue: -1 })
        .limit(10)
        .lean(),
      Invoice.countDocuments({ hotelId }),
      Invoice.countDocuments({ hotelId, paymentStatus: "PAID" }),
      Invoice.find({
        hotelId,
        "paymentHistory.recordedAt": { $gte: todayMidnight, $lt: tomorrowMidnight },
      }).select("paymentHistory").lean(),
    ]);

    const pendingPaymentsCount = unpaidInvoices.length;
    const pendingPaymentsTotal = unpaidInvoices.reduce(
      (acc, inv) => acc + (inv.amountDue || 0),
      0
    );

    let todayRevenue = 0;
    for (const inv of allInvoicesWithPaymentsToday) {
      if (inv.paymentHistory) {
        for (const p of inv.paymentHistory) {
          const recAt = new Date(p.recordedAt);
          if (recAt >= todayMidnight && recAt < tomorrowMidnight) {
            todayRevenue += (p.amount || 0);
          }
        }
      }
    }

    // 4. Today's Check-ins detailed list
    const todayCheckInsList = await Booking.find({
      hotelId,
      status: { $in: ["CONFIRMED", "CHECKED_IN"] },
      checkInDate: { $gte: todayMidnight, $lt: tomorrowMidnight },
    })
      .populate({ path: "customerId", model: Customer, select: "fullName phone email idType idNumber" })
      .populate({ path: "roomId", model: Room, select: "roomNumber roomType floor" })
      .sort({ checkInDate: 1, createdAt: 1 })
      .limit(15)
      .lean();

    // 5. Today's Check-outs detailed list with matching invoices
    const todayCheckOutsList = await Booking.find({
      hotelId,
      status: { $in: ["CONFIRMED", "CHECKED_IN"] },
      checkOutDate: { $gte: todayMidnight, $lt: tomorrowMidnight },
    })
      .populate({ path: "customerId", model: Customer, select: "fullName phone email" })
      .populate({ path: "roomId", model: Room, select: "roomNumber roomType floor" })
      .sort({ checkOutDate: 1, createdAt: 1 })
      .limit(15)
      .lean();

    // Fetch invoice mapping for today's check-outs to show accurate balance due
    const checkoutBookingIds = todayCheckOutsList.map((b) => b._id);
    const checkoutInvoices = await Invoice.find({
      hotelId,
      bookingId: { $in: checkoutBookingIds },
    })
      .select("bookingId totalAmount amountPaid amountDue paymentStatus")
      .lean();

    const invoiceByBookingId = new Map(
      checkoutInvoices.map((inv) => [inv.bookingId.toString(), inv])
    );

    const enrichedTodayCheckOuts = todayCheckOutsList.map((b: any) => {
      const inv = invoiceByBookingId.get(b._id.toString());
      return {
        ...b,
        invoice: inv || {
          totalAmount: b.totalAmount,
          amountPaid: 0,
          amountDue: b.totalAmount,
          paymentStatus: "UNPAID",
        },
      };
    });

    // 6. Recent Bookings (latest 8)
    const recentBookingsList = await Booking.find({ hotelId })
      .populate({ path: "customerId", model: Customer, select: "fullName phone email" })
      .populate({ path: "roomId", model: Room, select: "roomNumber roomType" })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    // 7. Upcoming Check-ins (after today, next 5)
    const upcomingCheckInsList = await Booking.find({
      hotelId,
      status: "CONFIRMED",
      checkInDate: { $gte: tomorrowMidnight },
    })
      .populate({ path: "customerId", model: Customer, select: "fullName phone email" })
      .populate({ path: "roomId", model: Room, select: "roomNumber roomType" })
      .sort({ checkInDate: 1 })
      .limit(5)
      .lean();

    // 8. Upcoming Check-outs (after today, next 5)
    const upcomingCheckOutsList = await Booking.find({
      hotelId,
      status: "CHECKED_IN",
      checkOutDate: { $gte: tomorrowMidnight },
    })
      .populate({ path: "customerId", model: Customer, select: "fullName phone email" })
      .populate({ path: "roomId", model: Room, select: "roomNumber roomType" })
      .sort({ checkOutDate: 1 })
      .limit(5)
      .lean();

    // 9. Operational Previews: Housekeeping & Room Service
    const [housekeepingPreview, roomServicePreview, activeSub] = await Promise.all([
      HousekeepingTask.find({
        hotelId,
        status: { $in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] },
      })
        .populate({ path: "roomId", model: Room, select: "roomNumber roomType floor" })
        .sort({ priority: -1, createdAt: -1 })
        .limit(5)
        .lean(),
      RoomServiceRequest.find({
        hotelId,
        status: { $in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] },
      })
        .populate({ path: "roomId", model: Room, select: "roomNumber roomType floor" })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      HotelSubscription.findOne({ hotelId, isCurrent: true })
        .populate({ path: "planId", model: SubscriptionPlan, select: "name maxRooms" })
        .lean(),
    ]);

    const isHotelInactive = hotel.status === "INACTIVE" || hotel.status === "SUSPENDED";
    const planData: any = activeSub?.planId || null;

    return NextResponse.json({
      success: true,
      receptionist: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      hotel: {
        _id: hotel._id,
        hotelCode: hotel.hotelCode || `HOT-${String(hotel._id).slice(-6).toUpperCase()}`,
        name: hotel.name,
        email: hotel.email,
        phone: hotel.phone || "",
        address: hotel.address || "",
        city: hotel.city || "",
        state: hotel.state || "",
        country: hotel.country || "USA",
        status: hotel.status || "ACTIVE",
        isInactive: isHotelInactive,
      },
      subscription: {
        status: activeSub?.status || "ACTIVE",
        planName: planData?.name || "Standard Plan",
        maxRooms: planData?.maxRooms ?? totalActiveRooms,
      },
      stats: {
        todayBookings: todayBookingsCount,
        todayCheckIns: todayCheckInsCount,
        todayCheckOuts: todayCheckOutsCount,
        activeBookings: activeBookingsCount,
        availableRooms,
        occupiedRooms,
        cleaningRooms,
        pendingPaymentsCount,
        pendingPaymentsTotal,
        todayRevenue,
        totalInvoices: totalInvoicesCount,
        paidInvoices: paidInvoicesCount,
      },
      roomStatus: {
        AVAILABLE: availableRooms,
        OCCUPIED: occupiedRooms,
        RESERVED: reservedRooms,
        CLEANING: cleaningRooms,
        MAINTENANCE: maintenanceRooms,
        OUT_OF_SERVICE: outOfServiceRooms,
        totalActiveRooms,
      },
      todayCheckIns: todayCheckInsList,
      todayCheckOuts: enrichedTodayCheckOuts,
      pendingPayments: unpaidInvoices,
      recentBookings: recentBookingsList,
      upcomingCheckIns: upcomingCheckInsList,
      upcomingCheckOuts: upcomingCheckOutsList,
      housekeepingPreview,
      roomServicePreview,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
