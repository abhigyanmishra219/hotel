import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import HousekeepingTask from "@/models/HousekeepingTask";
import RoomServiceRequest from "@/models/RoomServiceRequest";
import MaintenanceRequest from "@/models/MaintenanceRequest";
import { requireStaffUser, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { normalizeDateToMidnight } from "@/lib/bookingService";

/**
 * GET /api/staff/dashboard/stats
 * Real-time operational metrics for the authenticated staff member's dashboard.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireStaffUser(req);
    await connectToDatabase();

    const hotelId = new mongoose.Types.ObjectId(authUser.hotelId);
    const staffId = new mongoose.Types.ObjectId(authUser.userId);

    const todayMidnight = normalizeDateToMidnight(new Date());
    const tomorrowMidnight = new Date(todayMidnight.getTime() + 24 * 60 * 60 * 1000);

    // 1. Housekeeping Metrics
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

    // 2. Room Service Metrics
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

    // 3. Maintenance Metrics
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

    // 4. Combined totals
    const totalPending = hkPending + rsPending + mtPending;
    const totalInProgress = hkInProgress + rsInProgress + mtInProgress;
    const totalCompletedToday = hkCompletedToday + rsCompletedToday + mtResolvedToday;
    const totalAssigned = hkTotal + rsTotal + mtTotal;

    // 5. Recent Active Tasks (Top 5)
    const recentTasks = await HousekeepingTask.find({
      hotelId,
      assignedTo: staffId,
      status: { $in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] },
    })
      .populate("roomId", "roomNumber floor roomType status")
      .sort({ priority: -1, createdAt: -1 })
      .limit(5)
      .lean();

    return NextResponse.json({
      success: true,
      staff: {
        userId: authUser.userId,
        name: authUser.name,
        email: authUser.email,
        role: authUser.role,
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
      recentTasks,
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
