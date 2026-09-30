import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import HousekeepingTask from "@/models/HousekeepingTask";
import RoomServiceRequest from "@/models/RoomServiceRequest";
import MaintenanceRequest from "@/models/MaintenanceRequest";
import Room from "@/models/Room";
import { requireStaffUser, handleAuthError } from "@/lib/auth";
import { normalizeDateToMidnight } from "@/lib/bookingService";

/**
 * GET /api/staff/history
 * Returns completed & cancelled operational tasks for the authenticated Staff member.
 * Scoped strictly to hotelId = authUser.hotelId and assignedTo = authUser.userId.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireStaffUser(req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type")?.trim().toUpperCase() || "ALL";
    const status = searchParams.get("status")?.trim().toUpperCase() || "ALL";
    const dateRange = searchParams.get("date")?.trim().toUpperCase() || "ALL_TIME";
    const search = searchParams.get("search")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));

    const hotelId = new mongoose.Types.ObjectId(authUser.hotelId);
    const staffId = new mongoose.Types.ObjectId(authUser.userId);

    // Calculate Date Range Bounds
    const now = new Date();
    const todayMidnight = normalizeDateToMidnight(now);
    let dateFilter: Record<string, any> | null = null;

    if (dateRange === "TODAY") {
      const tomorrowMidnight = new Date(todayMidnight.getTime() + 24 * 60 * 60 * 1000);
      dateFilter = { $gte: todayMidnight, $lt: tomorrowMidnight };
    } else if (dateRange === "YESTERDAY") {
      const yesterdayMidnight = new Date(todayMidnight.getTime() - 24 * 60 * 60 * 1000);
      dateFilter = { $gte: yesterdayMidnight, $lt: todayMidnight };
    } else if (dateRange === "LAST_7_DAYS") {
      const sevenDaysAgo = new Date(todayMidnight.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { $gte: sevenDaysAgo };
    }

    // Base query scoped to authenticated tenant and staff user
    const baseQuery: Record<string, any> = {
      hotelId,
      assignedTo: staffId,
    };

    // Filter by completed or cancelled statuses
    if (status === "ALL") {
      baseQuery.status = { $in: ["COMPLETED", "CANCELLED", "RESOLVED"] };
    } else if (status === "COMPLETED") {
      baseQuery.status = { $in: ["COMPLETED", "RESOLVED"] };
    } else if (status === "CANCELLED") {
      baseQuery.status = "CANCELLED";
    }

    // Room number search matching
    let matchedRoomIds: mongoose.Types.ObjectId[] = [];
    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const rooms = await Room.find({ hotelId, roomNumber: searchRegex }).select("_id").lean();
      matchedRoomIds = rooms.map((r: any) => r._id);
    }

    const hkQuery = { ...baseQuery };
    const rsQuery = { ...baseQuery };
    const mtQuery = { ...baseQuery };

    if (dateFilter) {
      hkQuery.$or = [{ completedAt: dateFilter }, { updatedAt: dateFilter }];
      rsQuery.$or = [{ completedAt: dateFilter }, { updatedAt: dateFilter }];
      mtQuery.$or = [{ resolvedAt: dateFilter }, { updatedAt: dateFilter }];
    }

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const orConds: any[] = [{ taskId: searchRegex }, { notes: searchRegex }];
      if (matchedRoomIds.length > 0) {
        orConds.push({ roomId: { $in: matchedRoomIds } });
      }
      hkQuery.$and = [...(hkQuery.$and || []), { $or: orConds }];
      rsQuery.$and = [...(rsQuery.$and || []), { $or: [{ requestId: searchRegex }, ...orConds] }];
      mtQuery.$and = [...(mtQuery.$and || []), { $or: [{ requestId: searchRegex }, ...orConds] }];
    }

    const fetchHK = type === "ALL" || type === "HOUSEKEEPING";
    const fetchRS = type === "ALL" || type === "ROOM_SERVICE";
    const fetchMT = type === "ALL" || type === "MAINTENANCE";

    const [hkTasks, rsTasks, mtTasks] = await Promise.all([
      fetchHK
        ? HousekeepingTask.find(hkQuery)
            .populate("roomId", "roomNumber floor roomType status")
            .populate("assignedTo", "name email role")
            .lean()
        : [],
      fetchRS
        ? RoomServiceRequest.find(rsQuery)
            .populate("roomId", "roomNumber floor roomType status")
            .populate("assignedTo", "name email role")
            .lean()
        : [],
      fetchMT
        ? MaintenanceRequest.find(mtQuery)
            .populate("roomId", "roomNumber floor roomType status")
            .populate("assignedTo", "name email role")
            .lean()
        : [],
    ]);

    const allHistoryTasks = [
      ...hkTasks.map((t: any) => ({
        _id: t._id,
        taskId: t.taskId,
        category: "HOUSEKEEPING",
        taskType: t.type || "ROOM_CLEANING",
        priority: t.priority || "NORMAL",
        status: t.status,
        roomId: t.roomId,
        roomNumber: t.roomId?.roomNumber || "N/A",
        floor: t.roomId?.floor || "1",
        roomType: t.roomId?.roomType || "Standard",
        notes: t.notes || "",
        instructions: t.notes || `Housekeeping for Room ${t.roomId?.roomNumber || ""}`,
        startedAt: t.startedAt,
        completedAt: t.completedAt || t.updatedAt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      ...rsTasks.map((t: any) => ({
        _id: t._id,
        taskId: t.requestId || `RS-${t._id.toString().slice(-6).toUpperCase()}`,
        category: "ROOM_SERVICE",
        taskType: "ROOM_SERVICE",
        priority: t.priority || "NORMAL",
        status: t.status,
        roomId: t.roomId,
        roomNumber: t.roomId?.roomNumber || "N/A",
        floor: t.roomId?.floor || "1",
        roomType: t.roomId?.roomType || "Standard",
        notes: t.notes || "",
        instructions: (t.items?.map((i: any) => `${i.quantity}x ${i.item}`).join(", ")) || t.notes || "Room service delivery",
        startedAt: t.startedAt,
        completedAt: t.completedAt || t.updatedAt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      ...mtTasks.map((t: any) => ({
        _id: t._id,
        taskId: t.requestId || `MT-${t._id.toString().slice(-6).toUpperCase()}`,
        category: "MAINTENANCE",
        taskType: "MAINTENANCE",
        priority: t.priority || "NORMAL",
        status: t.status === "RESOLVED" ? "COMPLETED" : t.status,
        roomId: t.roomId,
        roomNumber: t.roomId?.roomNumber || "N/A",
        floor: t.roomId?.floor || "1",
        roomType: t.roomId?.roomType || "Standard",
        notes: t.notes || t.issue || "",
        instructions: t.issue || "Maintenance inspection",
        startedAt: t.startedAt,
        completedAt: t.resolvedAt || t.updatedAt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    ];

    // Sort by completedAt descending
    allHistoryTasks.sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime());

    const total = allHistoryTasks.length;
    const paginated = allHistoryTasks.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      success: true,
      tasks: paginated,
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
