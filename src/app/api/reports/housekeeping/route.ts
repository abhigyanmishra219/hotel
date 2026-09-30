import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import HousekeepingTask from "@/models/HousekeepingTask";
import Room from "@/models/Room";
import User from "@/models/User";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { parseReportDateRange } from "@/lib/reportService";

/**
 * GET /api/reports/housekeeping
 * Operational housekeeping turnaround, task volumes, staff performance metrics.
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

    const statusFilter = searchParams.get("status");
    const priorityFilter = searchParams.get("priority");
    const staffIdParam = searchParams.get("staffId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const { startDate, endDate, prevStartDate, prevEndDate } = dateRange;

    // 1. Overall Task Counts in Evaluation Window
    const baseWindowMatch: any = {
      hotelId,
      createdAt: { $gte: startDate, $lt: endDate },
    };

    const [
      totalTasks,
      completedCount,
      pendingCount,
      inProgressCount,
      cancelledCount,
    ] = await Promise.all([
      HousekeepingTask.countDocuments(baseWindowMatch),
      HousekeepingTask.countDocuments({ ...baseWindowMatch, status: "COMPLETED" }),
      HousekeepingTask.countDocuments({ ...baseWindowMatch, status: { $in: ["PENDING", "ASSIGNED"] } }),
      HousekeepingTask.countDocuments({ ...baseWindowMatch, status: "IN_PROGRESS" }),
      HousekeepingTask.countDocuments({ ...baseWindowMatch, status: "CANCELLED" }),
    ]);

    // Trend delta vs previous period
    const prevTotalTasks = await HousekeepingTask.countDocuments({
      hotelId,
      createdAt: { $gte: prevStartDate, $lt: prevEndDate },
    });

    // 2. Staff Performance Metrics in this window
    const staffAgg = await HousekeepingTask.aggregate([
      {
        $match: {
          hotelId,
          createdAt: { $gte: startDate, $lt: endDate },
          assignedTo: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$assignedTo",
          tasksAssigned: { $sum: 1 },
          tasksCompleted: {
            $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
          },
          tasksPending: {
            $sum: {
              $cond: [{ $in: ["$status", ["PENDING", "ASSIGNED", "IN_PROGRESS"]] }, 1, 0],
            },
          },
          tasksWithDuration: {
            $push: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "COMPLETED"] },
                    { $ne: ["$startedAt", null] },
                    { $ne: ["$completedAt", null] },
                  ],
                },
                { $divide: [{ $subtract: ["$completedAt", "$startedAt"] }, 60000] },
                "$$REMOVE",
              ],
            },
          },
        },
      },
    ]);

    // Fetch staff user details
    const staffUserIds = staffAgg.map((s) => s._id);
    const staffUsers = await User.find({ _id: { $in: staffUserIds } })
      .select("name email")
      .lean();
    const staffUserMap = new Map(staffUsers.map((u) => [String(u._id), u]));

    const staffPerformance = staffAgg.map((item) => {
      const user = staffUserMap.get(String(item._id));
      const durations: number[] = item.tasksWithDuration || [];
      const validDurations = durations.filter((d) => typeof d === "number" && d >= 0);
      const avgMinutes =
        validDurations.length > 0
          ? Math.round(
              validDurations.reduce((acc, curr) => acc + curr, 0) / validDurations.length
            )
          : null;

      return {
        staffId: item._id,
        staffName: user?.name || "Unassigned / Removed",
        staffEmail: user?.email || "",
        tasksAssigned: item.tasksAssigned,
        tasksCompleted: item.tasksCompleted,
        tasksPending: item.tasksPending,
        avgCompletionTimeMinutes: avgMinutes !== null ? `${avgMinutes} mins` : "N/A",
      };
    });

    // 3. Paginated Task List Query
    const queryFilter: any = { ...baseWindowMatch };
    if (statusFilter && statusFilter !== "ALL") {
      queryFilter.status = statusFilter;
    }
    if (priorityFilter && priorityFilter !== "ALL") {
      queryFilter.priority = priorityFilter;
    }
    if (staffIdParam && staffIdParam !== "ALL") {
      queryFilter.assignedTo = new mongoose.Types.ObjectId(staffIdParam);
    }

    const totalFilteredTasks = await HousekeepingTask.countDocuments(queryFilter);
    const tasks = await HousekeepingTask.find(queryFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("roomId", "roomNumber roomType floor")
      .populate("assignedTo", "name email")
      .lean();

    const formattedTasks = tasks.map((t: any) => ({
      _id: t._id,
      taskId: t.taskId,
      roomNumber: t.roomId?.roomNumber || "—",
      roomType: t.roomId?.roomType || "—",
      floor: t.roomId?.floor || 0,
      assignedStaff: t.assignedTo?.name || "Unassigned",
      type: t.type,
      priority: t.priority,
      status: t.status,
      notes: t.notes || "",
      startedAt: t.startedAt,
      completedAt: t.completedAt,
      createdAt: t.createdAt,
    }));

    return NextResponse.json({
      success: true,
      dateRange: {
        preset: dateRange.preset,
        label: dateRange.label,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      summary: {
        totalTasks,
        completed: completedCount,
        pending: pendingCount,
        inProgress: inProgressCount,
        cancelled: cancelledCount,
        deltaTasks: totalTasks - prevTotalTasks,
        completionRate:
          totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0,
      },
      staffPerformance,
      tasks: formattedTasks,
      pagination: {
        page,
        limit,
        totalRecords: totalFilteredTasks,
        totalPages: Math.ceil(totalFilteredTasks / limit) || 1,
      },
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
