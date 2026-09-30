import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import { requireStaffUser, handleAuthError } from "@/lib/auth";
import { normalizeDateToMidnight } from "@/lib/bookingService";

/**
 * POST /api/staff/attendance/check-in
 * Staff member clocks in for the current working day.
 * Generates server timestamp and enforces unique daily clock-in per staff.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await requireStaffUser(req);
    await connectToDatabase();

    const hotelId = new mongoose.Types.ObjectId(authUser.hotelId);
    const staffId = new mongoose.Types.ObjectId(authUser.userId);

    const todayDate = normalizeDateToMidnight(new Date());

    // Check for existing attendance record today
    const existing = await Attendance.findOne({
      hotelId,
      staffId,
      date: todayDate,
    });

    if (existing) {
      if (existing.status === "CHECKED_IN") {
        return NextResponse.json(
          { error: "You are already clocked in for today." },
          { status: 409 }
        );
      }
      if (existing.status === "CHECKED_OUT") {
        return NextResponse.json(
          { error: "You have already completed attendance for today." },
          { status: 409 }
        );
      }
    }

    const serverNow = new Date();

    const attendance = await Attendance.create({
      hotelId,
      staffId,
      date: todayDate,
      status: "CHECKED_IN",
      checkIn: serverNow,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Successfully clocked in for today.",
        attendance: {
          _id: attendance._id,
          status: attendance.status,
          date: attendance.date,
          checkIn: attendance.checkIn,
          createdAt: attendance.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}
