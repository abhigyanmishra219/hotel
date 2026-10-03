import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Hotel from "@/models/Hotel";
import HousekeepingTask from "@/models/HousekeepingTask";
import RoomServiceRequest from "@/models/RoomServiceRequest";
import MaintenanceRequest from "@/models/MaintenanceRequest";
import Attendance from "@/models/Attendance";
import User from "@/models/User";
import { requireStaffUser, handleAuthError } from "@/lib/auth";
import { normalizeDateToMidnight } from "@/lib/bookingService";

/**
 * GET /api/staff/dashboard
 * Complete Staff Portal Dashboard overview including hotel info, task summary metrics, and assigned workload.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireStaffUser(req);
    await connectToDatabase();

    const hotelId = new mongoose.Types.ObjectId(authUser.hotelId);
    const staffId = new mongoose.Types.ObjectId(authUser.userId);

    // 1. Fetch Hotel details (Strictly tenant-isolated by authenticated user's hotelId)
    const hotel = await Hotel.findById(hotelId).select("name hotelCode status address contactEmail contactPhone").lean();
    if (!hotel) {
      return NextResponse.json(
        { error: "Assigned hotel property not found." },
        { status: 404 }
      );
    }

    if (hotel.status === "INACTIVE" || hotel.status === "SUSPENDED") {
      return NextResponse.json(
        { error: `Hotel property '${hotel.name}' is ${hotel.status}. Operational access is restricted.` },
        { status: 403 }
      );
    }

    const todayMidnight = normalizeDateToMidnight(new Date());
    const tomorrowMidnight = new Date(todayMidnight.getTime() + 24 * 60 * 60 * 1000);

    // 2. Query Housekeeping Tasks for this Staff member
    const [
      hkPending,
      hkInProgress,
      hkCompletedToday,
      hkTotal,
    ] = await Promise.all([
      HousekeepingTask.countDocuments({
        hotelId,
        assignedTo: staffId,
        status: { $in: ["PENDING", "ASSIGNED"] },
      }),
      HousekeepingTask.countDocuments({
        hotelId,
        assignedTo: staffId,
        status: "IN_PROGRESS",
      }),
      HousekeepingTask.countDocuments({
        hotelId,
        assignedTo: staffId,
        status: "COMPLETED",
        completedAt: { $gte: todayMidnight, $lt: tomorrowMidnight },
      }),
      HousekeepingTask.countDocuments({
        hotelId,
        assignedTo: staffId,
      }),
    ]);

    // 3. Query Room Service Requests for this Staff member
    const [
      rsPending,
      rsInProgress,
      rsCompletedToday,
      rsTotal,
    ] = await Promise.all([
      RoomServiceRequest.countDocuments({
        hotelId,
        assignedTo: staffId,
        status: { $in: ["PENDING", "ASSIGNED"] },
      }),
      RoomServiceRequest.countDocuments({
        hotelId,
        assignedTo: staffId,
        status: "IN_PROGRESS",
      }),
      RoomServiceRequest.countDocuments({
        hotelId,
        assignedTo: staffId,
        status: "COMPLETED",
        completedAt: { $gte: todayMidnight, $lt: tomorrowMidnight },
      }),
      RoomServiceRequest.countDocuments({
        hotelId,
        assignedTo: staffId,
      }),
    ]);

    // 4. Query Maintenance Requests for this Staff member
    const [
      mtPending,
      mtInProgress,
      mtResolvedToday,
      mtTotal,
    ] = await Promise.all([
      MaintenanceRequest.countDocuments({
        hotelId,
        assignedTo: staffId,
        status: { $in: ["OPEN", "ASSIGNED"] },
      }),
      MaintenanceRequest.countDocuments({
        hotelId,
        assignedTo: staffId,
        status: "IN_PROGRESS",
      }),
      MaintenanceRequest.countDocuments({
        hotelId,
        assignedTo: staffId,
        status: "RESOLVED",
        resolvedAt: { $gte: todayMidnight, $lt: tomorrowMidnight },
      }),
      MaintenanceRequest.countDocuments({
        hotelId,
        assignedTo: staffId,
      }),
    ]);

    // Aggregate summary metrics
    const totalPending = hkPending + rsPending + mtPending;
    const totalInProgress = hkInProgress + rsInProgress + mtInProgress;
    const totalCompletedToday = hkCompletedToday + rsCompletedToday + mtResolvedToday;
    const totalAssigned = hkTotal + rsTotal + mtTotal;

    // 5. Query Today's Attendance & Shift
    const staffUser = await User.findById(staffId).select("shift").lean();
    const assignedShift = staffUser?.shift || "09:00 AM - 06:00 PM (General Shift)";

    const todayRecord = await Attendance.findOne({
      hotelId,
      staffId,
      date: todayMidnight,
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

    const formatDuration = (mins?: number) => {
      if (!mins || mins <= 0) return "0m";
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      if (h === 0) return `${m}m`;
      if (m === 0) return `${h}h`;
      return `${h}h ${m}m`;
    };

    const todayAttendance = {
      status: todayStatus,
      date: todayMidnight,
      checkIn: todayRecord?.checkIn || null,
      checkOut: todayRecord?.checkOut || null,
      workingMinutes: workingMinutesToday,
      workingDurationFormatted: formatDuration(workingMinutesToday),
      shift: assignedShift,
    };

    // 6. Query Recent Active Tasks for today (Top 6)
    const recentTasks = await HousekeepingTask.find({
      hotelId,
      assignedTo: staffId,
      status: { $in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] },
    })
      .populate("roomId", "roomNumber floor roomType status")
      .sort({ priority: -1, createdAt: -1 })
      .limit(6)
      .lean();

    return NextResponse.json({
      success: true,
      todayAttendance,
      staff: {
        userId: authUser.userId,
        name: authUser.name,
        email: authUser.email,
        role: authUser.role,
        shift: assignedShift,
      },
      hotel: {
        name: hotel.name,
        status: hotel.status,
      },
      summary: {
        pending: totalPending,
        inProgress: totalInProgress,
        completed: totalCompletedToday,
        totalAssigned,
      },
      stats: {
        totalAssigned,
        totalPending,
        totalInProgress,
        totalCompletedToday,
        housekeeping: {
          pending: hkPending,
          inProgress: hkInProgress,
          completedToday: hkCompletedToday,
          total: hkTotal,
        },
        roomService: {
          pending: rsPending,
          inProgress: rsInProgress,
          completedToday: rsCompletedToday,
          total: rsTotal,
        },
        maintenance: {
          pending: mtPending,
          inProgress: mtInProgress,
          completedToday: mtResolvedToday,
          total: mtTotal,
        },
      },
      recentTasks: (recentTasks || []).map((t: any) => ({
        _id: t._id,
        taskId: t.taskId,
        type: t.type,
        priority: t.priority,
        status: t.status,
        roomNumber: t.roomId?.roomNumber || "N/A",
        roomType: t.roomId?.roomType || "Standard",
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
