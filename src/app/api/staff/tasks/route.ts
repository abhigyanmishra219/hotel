import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import HousekeepingTask from "@/models/HousekeepingTask";
import RoomServiceRequest from "@/models/RoomServiceRequest";
import MaintenanceRequest from "@/models/MaintenanceRequest";
import Room from "@/models/Room";
import { requireStaffUser, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";

/**
 * GET /api/staff/tasks
 * Returns ONLY operational tasks assigned to the authenticated Staff member for their hotel.
 * Strictly enforces hotelId = authUser.hotelId and assignedTo = authUser.userId.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireStaffUser(req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status")?.trim().toUpperCase();
    const type = searchParams.get("type")?.trim().toUpperCase();
    const priority = searchParams.get("priority")?.trim().toUpperCase();
    const search = searchParams.get("search")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));

    const hotelId = new mongoose.Types.ObjectId(authUser.hotelId);
    const staffId = new mongoose.Types.ObjectId(authUser.userId);

    // Build base query strictly locked to authenticated user and hotel
    const baseQuery: Record<string, any> = {
      hotelId,
      assignedTo: staffId,
    };

    if (status && status !== "ALL") {
      if (status === "PENDING") {
        baseQuery.status = { $in: ["PENDING", "ASSIGNED", "OPEN"] };
      } else {
        baseQuery.status = status;
      }
    }

    if (priority && priority !== "ALL") {
      baseQuery.priority = priority;
    }

    // Room search match
    let matchedRoomIds: mongoose.Types.ObjectId[] = [];
    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const rooms = await Room.find({ hotelId, roomNumber: searchRegex }).select("_id").lean();
      matchedRoomIds = rooms.map((r: any) => r._id);
    }

    // Fetch tasks across task collections based on type filter
    const fetchHK = !type || type === "ALL" || type === "HOUSEKEEPING";
    const fetchRS = !type || type === "ALL" || type === "ROOM_SERVICE";
    const fetchMT = !type || type === "ALL" || type === "MAINTENANCE";

    const hkQuery = { ...baseQuery };
    const rsQuery = { ...baseQuery };
    const mtQuery = { ...baseQuery };

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const orConds: any[] = [{ taskId: searchRegex }, { notes: searchRegex }];
      if (matchedRoomIds.length > 0) {
        orConds.push({ roomId: { $in: matchedRoomIds } });
      }
      hkQuery.$or = orConds;
      rsQuery.$or = orConds;
      mtQuery.$or = orConds;
    }

    // Parallel metric counts
    const [
      hkPendingCount,
      hkInProgressCount,
      hkCompletedCount,
      hkTotalCount,
      rsPendingCount,
      rsInProgressCount,
      rsCompletedCount,
      rsTotalCount,
      mtPendingCount,
      mtInProgressCount,
      mtCompletedCount,
      mtTotalCount,
    ] = await Promise.all([
      HousekeepingTask.countDocuments({ hotelId, assignedTo: staffId, status: { $in: ["PENDING", "ASSIGNED"] } }),
      HousekeepingTask.countDocuments({ hotelId, assignedTo: staffId, status: "IN_PROGRESS" }),
      HousekeepingTask.countDocuments({ hotelId, assignedTo: staffId, status: "COMPLETED" }),
      HousekeepingTask.countDocuments({ hotelId, assignedTo: staffId }),
      RoomServiceRequest.countDocuments({ hotelId, assignedTo: staffId, status: { $in: ["PENDING", "ASSIGNED"] } }),
      RoomServiceRequest.countDocuments({ hotelId, assignedTo: staffId, status: "IN_PROGRESS" }),
      RoomServiceRequest.countDocuments({ hotelId, assignedTo: staffId, status: "COMPLETED" }),
      RoomServiceRequest.countDocuments({ hotelId, assignedTo: staffId }),
      MaintenanceRequest.countDocuments({ hotelId, assignedTo: staffId, status: { $in: ["OPEN", "ASSIGNED"] } }),
      MaintenanceRequest.countDocuments({ hotelId, assignedTo: staffId, status: "IN_PROGRESS" }),
      MaintenanceRequest.countDocuments({ hotelId, assignedTo: staffId, status: "RESOLVED" }),
      MaintenanceRequest.countDocuments({ hotelId, assignedTo: staffId }),
    ]);

    const totalPending = hkPendingCount + rsPendingCount + mtPendingCount;
    const totalInProgress = hkInProgressCount + rsInProgressCount + mtInProgressCount;
    const totalCompleted = hkCompletedCount + rsCompletedCount + mtCompletedCount;
    const grandTotal = hkTotalCount + rsTotalCount + mtTotalCount;

    // Retrieve tasks
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

    // Format all tasks into unified contract
    const allUnifiedTasks = [
      ...hkTasks.map((t: any) => ({
        _id: t._id,
        taskId: t.taskId,
        category: "HOUSEKEEPING",
        taskType: t.type || "ROOM_CLEANING",
        priority: t.priority || "NORMAL",
        status: t.status,
        roomId: t.roomId,
        roomNumber: t.roomId?.roomNumber || "N/A",
        roomType: t.roomId?.roomType || "Standard",
        notes: t.notes || "",
        instructions: t.notes || `Perform housekeeping for Room ${t.roomId?.roomNumber || ""}`,
        startedAt: t.startedAt,
        completedAt: t.completedAt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      ...rsTasks.map((t: any) => ({
        _id: t._id,
        taskId: t.requestId || t.taskId || `RS-${t._id.toString().slice(-6).toUpperCase()}`,
        category: "ROOM_SERVICE",
        taskType: "ROOM_SERVICE",
        priority: t.priority || "NORMAL",
        status: t.status,
        roomId: t.roomId,
        roomNumber: t.roomId?.roomNumber || "N/A",
        roomType: t.roomId?.roomType || "Standard",
        notes: t.notes || "",
        instructions: t.notes || (t.items?.map((i: any) => `${i.quantity}x ${i.item}`).join(", ")) || `Deliver room service to Room ${t.roomId?.roomNumber || ""}`,
        startedAt: t.startedAt,
        completedAt: t.completedAt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      ...mtTasks.map((t: any) => ({
        _id: t._id,
        taskId: t.requestId || t.taskId || `MT-${t._id.toString().slice(-6).toUpperCase()}`,
        category: "MAINTENANCE",
        taskType: "MAINTENANCE",
        priority: t.priority || "NORMAL",
        status: t.status === "RESOLVED" ? "COMPLETED" : t.status === "OPEN" ? "PENDING" : t.status,
        roomId: t.roomId,
        roomNumber: t.roomId?.roomNumber || "N/A",
        roomType: t.roomId?.roomType || "Standard",
        notes: t.notes || t.issue || "",
        instructions: t.issue || `Inspect maintenance issue in Room ${t.roomId?.roomNumber || ""}`,
        startedAt: t.startedAt,
        completedAt: t.resolvedAt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    ];

    // Sort by createdAt descending
    allUnifiedTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = allUnifiedTasks.length;
    const paginatedTasks = allUnifiedTasks.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      success: true,
      summary: {
        pending: totalPending,
        inProgress: totalInProgress,
        completed: totalCompleted,
        total: grandTotal,
      },
      tasks: paginatedTasks,
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
