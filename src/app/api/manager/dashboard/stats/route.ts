import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { requireManager, handleAuthError } from "@/lib/authorization/manager";
import HotelSubscription from "@/models/HotelSubscription";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import Room from "@/models/Room";
import User from "@/models/User";
import Booking from "@/models/Booking";
import Customer from "@/models/Customer";
import { USER_ROLES } from "@/types/roles";
import { normalizeDateToMidnight } from "@/lib/bookingService";

/**
 * GET /api/manager/dashboard/stats
 * Secure multi-tenant endpoint for the Manager Dashboard.
 * Returns live dynamic metrics from MongoDB for Rooms, Staff, Receptionists, Bookings, and Customers.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, hotelId, hotel } = await requireManager(req);
    await connectToDatabase();

    // 1. Fetch current active subscription and associated plan
    const activeSub = await HotelSubscription.findOne({
      hotelId,
      isCurrent: true,
    })
      .populate({
        path: "planId",
        model: SubscriptionPlan,
      })
      .lean();

    const planData: any = activeSub?.planId || null;

    // 2. Fetch Room metrics from database for this specific hotel
    const [
      totalActiveRooms,
      availableRooms,
      occupiedRooms,
      cleaningRooms,
      maintenanceRooms,
      outOfServiceRooms,
      inactiveRooms,
    ] = await Promise.all([
      Room.countDocuments({ hotelId, isActive: true }),
      Room.countDocuments({ hotelId, status: "AVAILABLE", isActive: true }),
      Room.countDocuments({ hotelId, status: "OCCUPIED", isActive: true }),
      Room.countDocuments({ hotelId, status: "CLEANING", isActive: true }),
      Room.countDocuments({ hotelId, status: "MAINTENANCE", isActive: true }),
      Room.countDocuments({ hotelId, status: "OUT_OF_SERVICE", isActive: true }),
      Room.countDocuments({ hotelId, isActive: false }),
    ]);

    // Dynamic Occupancy calculation: (Occupied active rooms / Total active rooms) * 100
    const occupancyRate =
      totalActiveRooms > 0
        ? Math.round((occupiedRooms / totalActiveRooms) * 100)
        : 0;

    // 3. Fetch Staff and Receptionist counts for this hotel
    const [
      activeStaff,
      inactiveStaff,
      activeReceptionists,
      inactiveReceptionists,
    ] = await Promise.all([
      User.countDocuments({
        hotelId,
        role: USER_ROLES.STAFF,
        isActive: true,
      }),
      User.countDocuments({
        hotelId,
        role: USER_ROLES.STAFF,
        isActive: false,
      }),
      User.countDocuments({
        hotelId,
        role: USER_ROLES.RECEPTIONIST,
        isActive: true,
      }),
      User.countDocuments({
        hotelId,
        role: USER_ROLES.RECEPTIONIST,
        isActive: false,
      }),
    ]);

    const totalStaff = activeStaff + inactiveStaff;
    const totalReceptionists = activeReceptionists + inactiveReceptionists;

    // 4. Live Booking & Customer & Invoice metrics from database
    const todayMidnight = normalizeDateToMidnight(new Date());
    const tomorrowMidnight = new Date(todayMidnight.getTime() + 24 * 60 * 60 * 1000);

    const [
      activeBookings,
      confirmedBookings,
      activeStays,
      completedBookings,
      cancelledBookings,
      todayCheckIns,
      todayCheckOuts,
      totalCustomers,
    ] = await Promise.all([
      Booking.countDocuments({ hotelId, status: { $in: ["CONFIRMED", "CHECKED_IN"] } }),
      Booking.countDocuments({ hotelId, status: "CONFIRMED" }),
      Booking.countDocuments({ hotelId, status: "CHECKED_IN" }),
      Booking.countDocuments({ hotelId, status: "COMPLETED" }),
      Booking.countDocuments({ hotelId, status: "CANCELLED" }),
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
      Customer.countDocuments({ hotelId, isActive: true }),
    ]);

    // Financial calculations from Invoices
    const Invoice = (await import("@/models/Invoice")).default;
    const HousekeepingTask = (await import("@/models/HousekeepingTask")).default;
    const RoomServiceRequest = (await import("@/models/RoomServiceRequest")).default;
    const MaintenanceRequest = (await import("@/models/MaintenanceRequest")).default;

    const [
      invoices,
      pendingHousekeeping,
      inProgressHousekeeping,
      completedHousekeepingToday,
      pendingRoomService,
      inProgressRoomService,
      openMaintenance,
      inProgressMaintenance,
    ] = await Promise.all([
      Invoice.find({ hotelId }).select("amountPaid amountDue paymentStatus paymentHistory totalAmount createdAt").lean(),
      HousekeepingTask.countDocuments({ hotelId, status: { $in: ["PENDING", "ASSIGNED"] } }),
      HousekeepingTask.countDocuments({ hotelId, status: "IN_PROGRESS" }),
      HousekeepingTask.countDocuments({
        hotelId,
        status: "COMPLETED",
        completedAt: { $gte: todayMidnight, $lt: tomorrowMidnight },
      }),
      RoomServiceRequest.countDocuments({ hotelId, status: { $in: ["PENDING", "ASSIGNED"] } }),
      RoomServiceRequest.countDocuments({ hotelId, status: "IN_PROGRESS" }),
      MaintenanceRequest.countDocuments({ hotelId, status: { $in: ["OPEN", "ASSIGNED"] } }),
      MaintenanceRequest.countDocuments({ hotelId, status: "IN_PROGRESS" }),
    ]);

    let totalRevenue = 0;
    let outstandingDue = 0;
    let todayRevenue = 0;
    let unpaidInvoices = 0;

    for (const inv of invoices) {
      totalRevenue += (inv.amountPaid || 0);
      outstandingDue += (inv.amountDue || 0);
      if (inv.paymentStatus !== "PAID") unpaidInvoices += 1;

      if (Array.isArray(inv.paymentHistory)) {
        for (const p of inv.paymentHistory) {
          const pDate = new Date(p.recordedAt || inv.createdAt);
          if (pDate >= todayMidnight && pDate < tomorrowMidnight) {
            todayRevenue += (p.amount || 0);
          }
        }
      }
    }

    const isHotelInactive = hotel.status === "INACTIVE" || hotel.status === "SUSPENDED";

    return NextResponse.json({
      success: true,
      manager: {
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
        phone: hotel.phone || "Not configured",
        address: hotel.address || "Address not provided",
        city: hotel.city || "N/A",
        state: hotel.state || "N/A",
        country: hotel.country || "USA",
        status: hotel.status || "ACTIVE",
        isInactive: isHotelInactive,
        createdAt: hotel.createdAt,
      },
      subscription: {
        status: activeSub?.status || "ACTIVE",
        paymentStatus: activeSub?.paymentStatus || "PAID",
        startDate: activeSub?.startDate || null,
        endDate: activeSub?.endDate || null,
        planName: planData?.name || "Standard Plan",
        monthlyPrice: planData?.monthlyPrice ?? 0,
        yearlyPrice: planData?.yearlyPrice ?? 0,
        features: planData?.features || ["Room Management", "Front Desk", "Billing"],
        maxRooms: planData?.maxRooms ?? 50,
        maxStaff: planData?.maxStaff ?? 10,
        maxReceptionists: planData?.maxReceptionists ?? 3,
      },
      stats: {
        rooms: {
          total: totalActiveRooms,
          available: availableRooms,
          occupied: occupiedRooms,
          cleaning: cleaningRooms,
          maintenance: maintenanceRooms,
          outOfService: outOfServiceRooms,
          inactive: inactiveRooms,
          occupancyRate,
        },
        staff: {
          totalStaff,
          activeStaff,
          inactiveStaff,
          staffCount: activeStaff,
          receptionistCount: activeReceptionists,
          total: totalStaff + totalReceptionists,
        },
        receptionists: {
          total: totalReceptionists,
          active: activeReceptionists,
          inactive: inactiveReceptionists,
        },
        bookings: {
          active: activeBookings,
          confirmed: confirmedBookings,
          activeStays: activeStays,
          completed: completedBookings,
          cancelled: cancelledBookings,
          todayCheckIns,
          todayCheckOuts,
        },
        financials: {
          todayRevenue,
          totalRevenue,
          outstandingDue,
          unpaidInvoices,
          totalInvoices: invoices.length,
        },
        customers: {
          total: totalCustomers,
        },
        operations: {
          pendingHousekeeping,
          inProgressHousekeeping,
          completedHousekeepingToday,
          pendingRoomService,
          inProgressRoomService,
          openMaintenance,
          inProgressMaintenance,
        },
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
