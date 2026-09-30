import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Room from "@/models/Room";
import Booking from "@/models/Booking";
import Invoice from "@/models/Invoice";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { parseReportDateRange } from "@/lib/reportService";

/**
 * GET /api/reports/rooms
 * Room Performance and Room-Type Revenue Utilization Report.
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

    // 1. Fetch all hotel rooms
    const allRooms = await Room.find({ hotelId }).sort({ roomNumber: 1 }).lean();

    // 2. Fetch all bookings in date window
    const bookings = await Booking.find({
      hotelId,
      createdAt: { $gte: startDate, $lt: endDate },
    }).lean();

    // 3. Fetch all invoices in date window
    const invoices = await Invoice.find({
      hotelId,
      createdAt: { $gte: startDate, $lt: endDate },
    }).select("roomId totalAmount amountPaid").lean();

    // Aggregations per room
    const roomPerformanceMap = new Map<string, {
      _id: string;
      roomNumber: string;
      roomType: string;
      floor: string;
      pricePerNight: number;
      status: string;
      isActive: boolean;
      totalBookings: number;
      completedStays: number;
      occupiedNights: number;
      totalRevenue: number;
      amountPaid: number;
    }>();

    for (const r of allRooms) {
      roomPerformanceMap.set(r._id.toString(), {
        _id: r._id.toString(),
        roomNumber: r.roomNumber,
        roomType: r.roomType || "DELUXE",
        floor: r.floor || "1",
        pricePerNight: r.pricePerNight || 0,
        status: r.status,
        isActive: r.isActive ?? true,
        totalBookings: 0,
        completedStays: 0,
        occupiedNights: 0,
        totalRevenue: 0,
        amountPaid: 0,
      });
    }

    for (const b of bookings) {
      const entry = roomPerformanceMap.get(b.roomId?.toString());
      if (entry) {
        entry.totalBookings += 1;
        if (b.status === "COMPLETED") entry.completedStays += 1;
        if (b.numberOfNights) entry.occupiedNights += b.numberOfNights;
      }
    }

    for (const inv of invoices) {
      if (inv.roomId) {
        const entry = roomPerformanceMap.get(inv.roomId.toString());
        if (entry) {
          entry.totalRevenue += inv.totalAmount || 0;
          entry.amountPaid += inv.amountPaid || 0;
        }
      }
    }

    const roomPerformanceList = Array.from(roomPerformanceMap.values()).sort(
      (a, b) => b.totalRevenue - a.totalRevenue || b.totalBookings - a.totalBookings
    );

    // Grouping by Room Type
    const roomTypeSummaryMap: Record<string, {
      roomType: string;
      totalRooms: number;
      totalBookings: number;
      completedStays: number;
      occupiedNights: number;
      totalRevenue: number;
    }> = {};

    for (const r of roomPerformanceList) {
      if (!roomTypeSummaryMap[r.roomType]) {
        roomTypeSummaryMap[r.roomType] = {
          roomType: r.roomType,
          totalRooms: 0,
          totalBookings: 0,
          completedStays: 0,
          occupiedNights: 0,
          totalRevenue: 0,
        };
      }

      const t = roomTypeSummaryMap[r.roomType];
      t.totalRooms += 1;
      t.totalBookings += r.totalBookings;
      t.completedStays += r.completedStays;
      t.occupiedNights += r.occupiedNights;
      t.totalRevenue += r.totalRevenue;
    }

    const roomTypePerformance = Object.values(roomTypeSummaryMap).sort(
      (a, b) => b.totalRevenue - a.totalRevenue
    );

    return NextResponse.json({
      success: true,
      dateRange: {
        preset: dateRange.preset,
        label: dateRange.label,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      rooms: roomPerformanceList,
      roomTypes: roomTypePerformance,
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
