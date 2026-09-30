import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import MaintenanceRequest from "@/models/MaintenanceRequest";
import Room from "@/models/Room";
import User from "@/models/User";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { parseReportDateRange } from "@/lib/reportService";

/**
 * GET /api/reports/maintenance
 * Maintenance incidents, resolution rates, frequently affected rooms.
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
    const roomIdParam = searchParams.get("roomId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const { startDate, endDate, prevStartDate, prevEndDate } = dateRange;

    // 1. Overall Maintenance Incidents in Window
    const baseWindowMatch: any = {
      hotelId,
      createdAt: { $gte: startDate, $lt: endDate },
    };

    const [
      totalRequests,
      openCount,
      assignedCount,
      inProgressCount,
      resolvedCount,
      cancelledCount,
    ] = await Promise.all([
      MaintenanceRequest.countDocuments(baseWindowMatch),
      MaintenanceRequest.countDocuments({ ...baseWindowMatch, status: "OPEN" }),
      MaintenanceRequest.countDocuments({ ...baseWindowMatch, status: "ASSIGNED" }),
      MaintenanceRequest.countDocuments({ ...baseWindowMatch, status: "IN_PROGRESS" }),
      MaintenanceRequest.countDocuments({ ...baseWindowMatch, status: "RESOLVED" }),
      MaintenanceRequest.countDocuments({ ...baseWindowMatch, status: "CANCELLED" }),
    ]);

    const prevTotalRequests = await MaintenanceRequest.countDocuments({
      hotelId,
      createdAt: { $gte: prevStartDate, $lt: prevEndDate },
    });

    // 2. Most Frequently Affected Rooms
    const affectedRoomsAgg = await MaintenanceRequest.aggregate([
      { $match: { hotelId, createdAt: { $gte: startDate, $lt: endDate } } },
      {
        $group: {
          _id: "$roomId",
          incidentCount: { $sum: 1 },
          resolvedCount: {
            $sum: { $cond: [{ $eq: ["$status", "RESOLVED"] }, 1, 0] },
          },
          openCount: {
            $sum: { $cond: [{ $in: ["$status", ["OPEN", "ASSIGNED", "IN_PROGRESS"]] }, 1, 0] },
          },
        },
      },
      { $sort: { incidentCount: -1 } },
      { $limit: 8 },
    ]);

    const roomIds = affectedRoomsAgg.map((a) => a._id);
    const rooms = await Room.find({ _id: { $in: roomIds } })
      .select("roomNumber roomType floor")
      .lean();
    const roomMap = new Map(rooms.map((r) => [String(r._id), r]));

    const affectedRooms = affectedRoomsAgg.map((item) => {
      const room = roomMap.get(String(item._id));
      return {
        roomId: item._id,
        roomNumber: room?.roomNumber || "Unknown",
        roomType: room?.roomType || "—",
        floor: room?.floor || 0,
        incidentCount: item.incidentCount,
        resolvedCount: item.resolvedCount,
        openCount: item.openCount,
      };
    });

    // 3. Paginated Incidents Query
    const queryFilter: any = { ...baseWindowMatch };
    if (statusFilter && statusFilter !== "ALL") {
      queryFilter.status = statusFilter;
    }
    if (priorityFilter && priorityFilter !== "ALL") {
      queryFilter.priority = priorityFilter;
    }
    if (roomIdParam && roomIdParam !== "ALL") {
      queryFilter.roomId = new mongoose.Types.ObjectId(roomIdParam);
    }

    const totalFiltered = await MaintenanceRequest.countDocuments(queryFilter);
    const requests = await MaintenanceRequest.find(queryFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("roomId", "roomNumber roomType floor")
      .populate("reportedBy", "name")
      .populate("assignedTo", "name")
      .lean();

    const formattedRequests = requests.map((m: any) => ({
      _id: m._id,
      requestId: m.requestId,
      roomNumber: m.roomId?.roomNumber || "—",
      roomType: m.roomId?.roomType || "—",
      floor: m.roomId?.floor || 0,
      reportedBy: m.reportedBy?.name || "Staff",
      assignedStaff: m.assignedTo?.name || "Unassigned",
      issue: m.issue,
      priority: m.priority,
      status: m.status,
      notes: m.notes || "",
      startedAt: m.startedAt,
      resolvedAt: m.resolvedAt,
      createdAt: m.createdAt,
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
        totalRequests,
        open: openCount,
        assigned: assignedCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
        cancelled: cancelledCount,
        deltaRequests: totalRequests - prevTotalRequests,
        resolutionRate:
          totalRequests > 0 ? Math.round((resolvedCount / totalRequests) * 100) : 0,
      },
      affectedRooms,
      requests: formattedRequests,
      pagination: {
        page,
        limit,
        totalRecords: totalFiltered,
        totalPages: Math.ceil(totalFiltered / limit) || 1,
      },
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
