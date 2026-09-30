import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import { requireStaffUser, handleAuthError } from "@/lib/auth";
import { normalizeDateToMidnight } from "@/lib/bookingService";

/**
 * POST /api/staff/attendance/check-out
 * Staff member clocks out for the day.
 * Enforces active CHECKED_IN requirement and computes duration.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await requireStaffUser(req);
    await connectToDatabase();

    const hotelId = new mongoose.Types.ObjectId(authUser.hotelId);
    const staffId = new mongoose.Types.ObjectId(authUser.userId);

    const todayDate = normalizeDateToMidnight(new Date());

    const attendance = await Attendance.findOne({
      hotelId,
      staffId,
      date: todayDate,
    });

    if (!attendance) {
      return NextResponse.json(
        { error: "No clock-in record found for today. Please clock in before clocking out." },
        { status: 400 }
      );
    }

    if (attendance.status === "CHECKED_OUT") {
      return NextResponse.json(
        { error: "You have already clocked out for today." },
        { status: 409 }
      );
    }

    if (attendance.status !== "CHECKED_IN") {
      return NextResponse.json(
        { error: "Cannot clock out with current attendance status." },
        { status: 400 }
      );
    }

    const checkOutTime = new Date();
    const workingMinutes = Math.max(
      0,
      Math.round((checkOutTime.getTime() - attendance.checkIn.getTime()) / (60 * 1000))
    );

    attendance.status = "CHECKED_OUT";
    attendance.checkOut = checkOutTime;
    attendance.workingMinutes = workingMinutes;
    await attendance.save();

    return NextResponse.json({
      success: true,
      message: "Successfully clocked out for today.",
      attendance: {
        _id: attendance._id,
        status: attendance.status,
        date: attendance.date,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        workingMinutes: attendance.workingMinutes,
        updatedAt: attendance.updatedAt,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
