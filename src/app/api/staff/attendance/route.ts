import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import User from "@/models/User";
import { requireStaffUser, handleAuthError } from "@/lib/auth";
import { normalizeDateToMidnight } from "@/lib/bookingService";

/**
 * Helper to format duration in hours and minutes
 */
function formatDuration(minutes?: number): string {
  if (minutes === undefined || minutes === null || minutes <= 0) return "0m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * GET /api/staff/attendance
 * Returns today's live working attendance state and attendance history.
 * Strictly scoped to hotelId = authUser.hotelId and staffId = authUser.userId.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireStaffUser(req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const dateRange = searchParams.get("date")?.trim().toUpperCase() || "ALL_TIME";
    const status = searchParams.get("status")?.trim().toUpperCase() || "ALL";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));

    const hotelId = new mongoose.Types.ObjectId(authUser.hotelId);
    const staffId = new mongoose.Types.ObjectId(authUser.userId);

    const todayDate = normalizeDateToMidnight(new Date());

    // 1. Fetch user record for assigned shift information
    const staffUser = await User.findById(staffId).select("name shift role").lean();
    const assignedShift = staffUser?.shift || "09:00 AM - 06:00 PM (General Shift)";

    // 2. Fetch Today's Attendance record
    const todayRecord = await Attendance.findOne({
      hotelId,
      staffId,
      date: todayDate,
    }).lean();

    let todayStatus = "NOT_STARTED";
    let workingMinutesToday = 0;

    if (todayRecord) {
      todayStatus = todayRecord.status;
      if (todayRecord.status === "CHECKED_IN") {
        workingMinutesToday = Math.max(
          0,
          Math.round((Date.now() - new Date(todayRecord.checkIn).getTime()) / (60 * 1000))
        );
      } else if (todayRecord.status === "CHECKED_OUT") {
        workingMinutesToday = todayRecord.workingMinutes || 0;
      }
    }

    const todaySummary = {
      status: todayStatus,
      date: todayDate,
      checkIn: todayRecord?.checkIn || null,
      checkOut: todayRecord?.checkOut || null,
      workingMinutes: workingMinutesToday,
      workingDurationFormatted: formatDuration(workingMinutesToday),
      shift: assignedShift,
    };

    // 3. Build query for attendance history
    const historyQuery: Record<string, any> = {
      hotelId,
      staffId,
    };

    if (status !== "ALL") {
      historyQuery.status = status;
    }

    if (dateRange === "TODAY") {
      historyQuery.date = todayDate;
    } else if (dateRange === "LAST_7_DAYS") {
      const sevenDaysAgo = new Date(todayDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      historyQuery.date = { $gte: sevenDaysAgo };
    } else if (dateRange === "THIS_MONTH") {
      const firstDayOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
      historyQuery.date = { $gte: firstDayOfMonth };
    }

    const [total, records] = await Promise.all([
      Attendance.countDocuments(historyQuery),
      Attendance.find(historyQuery)
        .sort({ date: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    const formattedHistory = records.map((rec) => {
      let durationMins = rec.workingMinutes || 0;
      if (rec.status === "CHECKED_IN" && rec.checkIn) {
        durationMins = Math.max(0, Math.round((Date.now() - new Date(rec.checkIn).getTime()) / (60 * 1000)));
      }

      return {
        _id: rec._id,
        date: rec.date,
        status: rec.status,
        checkIn: rec.checkIn,
        checkOut: rec.checkOut,
        workingMinutes: durationMins,
        workingDurationFormatted: formatDuration(durationMins),
        notes: rec.notes || "",
        createdAt: rec.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      today: todaySummary,
      history: formattedHistory,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
