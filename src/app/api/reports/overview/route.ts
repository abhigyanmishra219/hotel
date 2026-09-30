import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Invoice from "@/models/Invoice";
import Room from "@/models/Room";
import HousekeepingTask from "@/models/HousekeepingTask";
import RoomServiceRequest from "@/models/RoomServiceRequest";
import MaintenanceRequest from "@/models/MaintenanceRequest";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { parseReportDateRange } from "@/lib/reportService";

/**
 * GET /api/reports/overview
 * Executive Overview & Master Operational Summary strictly for authenticated hotel manager.
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

    // 1. Current Window Bookings Metrics
    const [
      totalBookings,
      completedStays,
      cancelledBookings,
      confirmedBookings,
      checkedInStays,
    ] = await Promise.all([
      Booking.countDocuments({
        hotelId,
        createdAt: { $gte: startDate, $lt: endDate },
      }),
      Booking.countDocuments({
        hotelId,
        status: "COMPLETED",
        createdAt: { $gte: startDate, $lt: endDate },
      }),
      Booking.countDocuments({
        hotelId,
        status: "CANCELLED",
        createdAt: { $gte: startDate, $lt: endDate },
      }),
      Booking.countDocuments({
        hotelId,
        status: "CONFIRMED",
        createdAt: { $gte: startDate, $lt: endDate },
      }),
      Booking.countDocuments({
        hotelId,
        status: "CHECKED_IN",
        createdAt: { $gte: startDate, $lt: endDate },
      }),
    ]);

    // 2. Previous Window Bookings (for trend delta)
    const [prevTotalBookings, prevCompletedStays] = await Promise.all([
      Booking.countDocuments({
        hotelId,
        createdAt: { $gte: prevStartDate, $lt: prevEndDate },
      }),
      Booking.countDocuments({
        hotelId,
        status: "COMPLETED",
        createdAt: { $gte: prevStartDate, $lt: prevEndDate },
      }),
    ]);

    // 3. Current Window Financials from Invoices
    const currentInvoices = await Invoice.find({
      hotelId,
      createdAt: { $gte: startDate, $lt: endDate },
    })
      .select("totalAmount amountPaid amountDue paymentStatus")
      .lean();

    let totalRevenue = 0;
    let collectedRevenue = 0;
    let outstandingDue = 0;

    for (const inv of currentInvoices) {
      totalRevenue += inv.totalAmount || 0;
      collectedRevenue += inv.amountPaid || 0;
      outstandingDue += inv.amountDue || 0;
    }

    // 4. Previous Window Financials (for trend delta)
    const prevInvoices = await Invoice.find({
      hotelId,
      createdAt: { $gte: prevStartDate, $lt: prevEndDate },
    })
      .select("totalAmount amountPaid")
      .lean();

    let prevTotalRevenue = 0;
    let prevCollectedRevenue = 0;
    for (const inv of prevInvoices) {
      prevTotalRevenue += inv.totalAmount || 0;
      prevCollectedRevenue += inv.amountPaid || 0;
    }

    // 5. Room Operational Snapshot (Current Sellable vs Occupied)
    const [
      allActiveRooms,
      availableRooms,
      occupiedRooms,
      cleaningRooms,
      maintenanceRooms,
      outOfServiceRooms,
    ] = await Promise.all([
      Room.countDocuments({ hotelId, isActive: true }),
      Room.countDocuments({ hotelId, status: "AVAILABLE", isActive: true }),
      Room.countDocuments({ hotelId, status: "OCCUPIED", isActive: true }),
      Room.countDocuments({ hotelId, status: "CLEANING", isActive: true }),
      Room.countDocuments({ hotelId, status: "MAINTENANCE", isActive: true }),
      Room.countDocuments({ hotelId, status: "OUT_OF_SERVICE", isActive: true }),
    ]);

    // Sellable room calculation: exclude out of service rooms
    const sellableRooms = Math.max(0, allActiveRooms - outOfServiceRooms);
    const currentOccupancyRate =
      sellableRooms > 0 ? Math.round((occupiedRooms / sellableRooms) * 100) : 0;

    // 6. Operations Status Snapshot
    const [
      pendingHousekeeping,
      inProgressHousekeeping,
      completedHousekeeping,
      pendingRoomService,
      completedRoomService,
      openMaintenance,
    ] = await Promise.all([
      HousekeepingTask.countDocuments({
        hotelId,
        status: { $in: ["PENDING", "ASSIGNED"] },
      }),
      HousekeepingTask.countDocuments({
        hotelId,
        status: "IN_PROGRESS",
      }),
      HousekeepingTask.countDocuments({
        hotelId,
        status: "COMPLETED",
        createdAt: { $gte: startDate, $lt: endDate },
      }),
      RoomServiceRequest.countDocuments({
        hotelId,
        status: { $in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] },
      }),
      RoomServiceRequest.countDocuments({
        hotelId,
        status: "COMPLETED",
        createdAt: { $gte: startDate, $lt: endDate },
      }),
      MaintenanceRequest.countDocuments({
        hotelId,
        status: { $in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] },
      }),
    ]);

    // 7. Guests & Customers Snapshot
    const Customer = (await import("@/models/Customer")).default;
    const [totalCustomers, activeGuests, checkedOutGuests, newCustomers] = await Promise.all([
      Customer.countDocuments({ hotelId, isActive: true }),
      Booking.countDocuments({ hotelId, status: "CHECKED_IN" }),
      Booking.countDocuments({ hotelId, status: "COMPLETED", createdAt: { $gte: startDate, $lt: endDate } }),
      Customer.countDocuments({ hotelId, createdAt: { $gte: startDate, $lt: endDate } }),
    ]);

    // Trend calculations
    const revenueDelta = totalRevenue - prevTotalRevenue;
    const bookingsDelta = totalBookings - prevTotalBookings;

    return NextResponse.json({
      success: true,
      dateRange: {
        preset: dateRange.preset,
        label: dateRange.label,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      metrics: {
        bookings: {
          total: totalBookings,
          completed: completedStays,
          cancelled: cancelledBookings,
          confirmed: confirmedBookings,
          checkedIn: checkedInStays,
          delta: bookingsDelta,
          prevPeriodTotal: prevTotalBookings,
        },
        financials: {
          totalRevenue,
          collectedRevenue,
          outstandingDue,
          totalInvoices: currentInvoices.length,
          deltaRevenue: revenueDelta,
          prevPeriodRevenue: prevTotalRevenue,
        },
        occupancy: {
          totalRooms: allActiveRooms,
          sellableRooms,
          availableRooms,
          occupiedRooms,
          cleaningRooms,
          maintenanceRooms,
          outOfServiceRooms,
          currentOccupancyRate,
        },
        guests: {
          totalCustomers,
          activeGuests,
          checkedOutGuests,
          newCustomers,
        },
        operations: {
          pendingHousekeeping,
          inProgressHousekeeping,
          completedHousekeeping,
          pendingRoomService,
          completedRoomService,
          openMaintenance,
        },
      },
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
