import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Room from "@/models/Room";
import Booking from "@/models/Booking";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { parseReportDateRange } from "@/lib/reportService";

/**
 * GET /api/reports/occupancy
 * Real-time Snapshot and Historical Sellable Room-Nights Occupancy Analytics.
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

    const { startDate, endDate } = dateRange;

    // 1. Current Snapshot of All Hotel Rooms
    const allRooms = await Room.find({ hotelId, isActive: true }).lean();
    const totalRooms = allRooms.length;

    let availableCount = 0;
    let occupiedCount = 0;
    let cleaningCount = 0;
    let maintenanceCount = 0;
    let outOfServiceCount = 0;

    const roomTypeMap: Record<string, { total: number; occupied: number; rooms: any[] }> = {};

    for (const r of allRooms) {
      const type = r.roomType || "DELUXE";
      if (!roomTypeMap[type]) {
        roomTypeMap[type] = { total: 0, occupied: 0, rooms: [] };
      }
      roomTypeMap[type].total += 1;
      roomTypeMap[type].rooms.push(r);

      if (r.status === "AVAILABLE") availableCount++;
      else if (r.status === "OCCUPIED") {
        occupiedCount++;
        roomTypeMap[type].occupied += 1;
      } else if (r.status === "CLEANING") cleaningCount++;
      else if (r.status === "MAINTENANCE") maintenanceCount++;
      else if (r.status === "OUT_OF_SERVICE") outOfServiceCount++;
    }

    // Current Sellable Rooms Snapshot
    const currentSellableRooms = Math.max(0, totalRooms - outOfServiceCount);
    const currentOccupancyRate =
      currentSellableRooms > 0 ? Math.round((occupiedCount / currentSellableRooms) * 100) : 0;

    // 2. Historical Occupancy Rate Calculation over the date range:
    // Window duration in days:
    const diffTime = endDate.getTime() - startDate.getTime();
    const windowDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // Total available sellable room nights across the window
    const availableSellableRoomNights = currentSellableRooms * windowDays;

    // Find all bookings that overlapped with [startDate, endDate] and were not cancelled
    const overlappingBookings = await Booking.find({
      hotelId,
      status: { $in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] },
      checkInDate: { $lt: endDate },
      checkOutDate: { $gt: startDate },
    }).lean();

    let totalOccupiedRoomNights = 0;

    for (const b of overlappingBookings) {
      const stayStart = new Date(Math.max(new Date(b.checkInDate).getTime(), startDate.getTime()));
      const stayEnd = new Date(Math.min(new Date(b.checkOutDate).getTime(), endDate.getTime()));
      const nights = Math.max(1, Math.ceil((stayEnd.getTime() - stayStart.getTime()) / (1000 * 60 * 60 * 24)));
      totalOccupiedRoomNights += nights;
    }

    const historicalOccupancyRate =
      availableSellableRoomNights > 0
        ? Math.min(100, Math.round((totalOccupiedRoomNights / availableSellableRoomNights) * 100))
        : 0;

    // 3. Room Type Breakdown
    const roomTypeStats = Object.entries(roomTypeMap).map(([type, d]) => ({
      roomType: type,
      totalRooms: d.total,
      occupiedRooms: d.occupied,
      bookingsCount: 0,
      occupiedNights: 0,
      revenue: 0,
      occupancyRate: d.total > 0 ? Math.round((d.occupied / d.total) * 100) : 0,
    }));

    return NextResponse.json({
      success: true,
      dateRange: {
        preset: dateRange.preset,
        label: dateRange.label,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        windowDays,
      },
      currentSnapshot: {
        totalRooms,
        sellableRooms: currentSellableRooms,
        available: availableCount,
        occupied: occupiedCount,
        occupiedRooms: occupiedCount,
        cleaning: cleaningCount,
        maintenance: maintenanceCount,
        outOfService: outOfServiceCount,
        outOfServiceRooms: outOfServiceCount,
        currentOccupancyRate,
        occupancyRate: currentOccupancyRate,
      },
      historical: {
        windowDays,
        sellableRoomNights: availableSellableRoomNights,
        totalOccupiedNights: totalOccupiedRoomNights,
        occupancyRate: historicalOccupancyRate,
      },
      historicalPerformance: {
        windowDays,
        availableSellableRoomNights,
        totalOccupiedRoomNights,
        historicalOccupancyRate,
      },
      roomTypeStats,
      roomTypeBreakdown: roomTypeStats,
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
