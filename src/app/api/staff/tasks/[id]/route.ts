import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import HousekeepingTask from "@/models/HousekeepingTask";
import RoomServiceRequest from "@/models/RoomServiceRequest";
import MaintenanceRequest from "@/models/MaintenanceRequest";
import Room from "@/models/Room";
import { requireStaffUser, handleAuthError } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Helper to find task by _id or taskId across operational collections
 * strictly scoped to the authenticated user's hotel and assignedTo.
 */
async function findStaffTask(id: string, hotelId: mongoose.Types.ObjectId, staffId: mongoose.Types.ObjectId) {
  const isObjId = mongoose.Types.ObjectId.isValid(id);
  const query: any = {
    hotelId,
    assignedTo: staffId,
    ...(isObjId ? { _id: new mongoose.Types.ObjectId(id) } : { taskId: id.toUpperCase() }),
  };

  // 1. Check HousekeepingTask
  let task = await HousekeepingTask.findOne(query)
    .populate("roomId", "roomNumber floor roomType status cleaningStatus")
    .populate("assignedTo", "name email role")
    .populate("createdBy", "name email role");

  if (task) {
    return {
      type: "HOUSEKEEPING",
      model: HousekeepingTask,
      raw: task,
      formatted: {
        _id: task._id,
        taskId: task.taskId,
        category: "HOUSEKEEPING",
        taskType: task.type || "ROOM_CLEANING",
        priority: task.priority || "NORMAL",
        status: task.status,
        roomId: task.roomId,
        roomNumber: (task.roomId as any)?.roomNumber || "N/A",
        roomType: (task.roomId as any)?.roomType || "Standard",
        floor: (task.roomId as any)?.floor || 1,
        notes: task.notes || "",
        instructions: task.notes || `Clean and inspect Room ${(task.roomId as any)?.roomNumber || ""}`,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      },
    };
  }

  // 2. Check RoomServiceRequest
  const rsQuery: any = {
    hotelId,
    assignedTo: staffId,
    ...(isObjId ? { _id: new mongoose.Types.ObjectId(id) } : { requestId: id.toUpperCase() }),
  };
  const rs = await RoomServiceRequest.findOne(rsQuery)
    .populate("roomId", "roomNumber floor roomType status")
    .populate("assignedTo", "name email role");

  if (rs) {
    return {
      type: "ROOM_SERVICE",
      model: RoomServiceRequest,
      raw: rs,
      formatted: {
        _id: rs._id,
        taskId: rs.requestId || `RS-${rs._id.toString().slice(-6).toUpperCase()}`,
        category: "ROOM_SERVICE",
        taskType: "ROOM_SERVICE",
        priority: rs.priority || "NORMAL",
        status: rs.status,
        roomId: rs.roomId,
        roomNumber: (rs.roomId as any)?.roomNumber || "N/A",
        roomType: (rs.roomId as any)?.roomType || "Standard",
        floor: (rs.roomId as any)?.floor || 1,
        notes: rs.notes || "",
        instructions: rs.notes || (rs.items?.map((i: any) => `${i.quantity}x ${i.item}`).join(", ")) || `Deliver room service to Room ${(rs.roomId as any)?.roomNumber || ""}`,
        startedAt: rs.startedAt,
        completedAt: rs.completedAt,
        createdAt: rs.createdAt,
        updatedAt: rs.updatedAt,
      },
    };
  }

  // 3. Check MaintenanceRequest
  const mtQuery: any = {
    hotelId,
    assignedTo: staffId,
    ...(isObjId ? { _id: new mongoose.Types.ObjectId(id) } : { requestId: id.toUpperCase() }),
  };
  const mt = await MaintenanceRequest.findOne(mtQuery)
    .populate("roomId", "roomNumber floor roomType status")
    .populate("assignedTo", "name email role");

  if (mt) {
    return {
      type: "MAINTENANCE",
      model: MaintenanceRequest,
      raw: mt,
      formatted: {
        _id: mt._id,
        taskId: mt.requestId || `MT-${mt._id.toString().slice(-6).toUpperCase()}`,
        category: "MAINTENANCE",
        taskType: "MAINTENANCE",
        priority: mt.priority || "NORMAL",
        status: mt.status === "RESOLVED" ? "COMPLETED" : mt.status === "OPEN" ? "PENDING" : mt.status,
        roomId: mt.roomId,
        roomNumber: (mt.roomId as any)?.roomNumber || "N/A",
        roomType: (mt.roomId as any)?.roomType || "Standard",
        floor: (mt.roomId as any)?.floor || 1,
        notes: mt.notes || mt.issue || "",
        instructions: mt.issue || `Inspect maintenance issue in Room ${(mt.roomId as any)?.roomNumber || ""}`,
        startedAt: mt.startedAt,
        completedAt: mt.resolvedAt,
        createdAt: mt.createdAt,
        updatedAt: mt.updatedAt,
      },
    };
  }

  return null;
}

/**
 * GET /api/staff/tasks/[id]
 * Retrieves details for a specific task assigned to the authenticated staff member.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await requireStaffUser(req);
    const { id } = await params;
    await connectToDatabase();

    const hotelId = new mongoose.Types.ObjectId(authUser.hotelId);
    const staffId = new mongoose.Types.ObjectId(authUser.userId);

    const taskResult = await findStaffTask(id, hotelId, staffId);

    if (!taskResult) {
      return NextResponse.json(
        { error: "Task not found or not assigned to your account." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      task: taskResult.formatted,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * PATCH /api/staff/tasks/[id]
 * Updates task status (START, COMPLETE) and operational notes.
 * Enforces strict ownership and valid status transitions.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await requireStaffUser(req);
    const { id } = await params;
    await connectToDatabase();

    const hotelId = new mongoose.Types.ObjectId(authUser.hotelId);
    const staffId = new mongoose.Types.ObjectId(authUser.userId);

    const taskResult = await findStaffTask(id, hotelId, staffId);

    if (!taskResult) {
      return NextResponse.json(
        { error: "Task not found or not assigned to your account." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { action, status: targetStatus, notes } = body;
    const task = taskResult.raw;
    const currentStatus = task.status;

    // Reject unauthorized field modifications
    if (body.hotelId || body.assignedTo || body.createdBy || body.role) {
      return NextResponse.json(
        { error: "Unauthorized attempt to modify protected task properties." },
        { status: 403 }
      );
    }

    // Handle START action or status transition to IN_PROGRESS
    if (action === "START" || targetStatus === "IN_PROGRESS") {
      if (currentStatus === "COMPLETED" || currentStatus === "RESOLVED") {
        return NextResponse.json(
          { error: "Cannot restart an already completed task." },
          { status: 400 }
        );
      }
      if (currentStatus === "CANCELLED") {
        return NextResponse.json(
          { error: "Cannot start a cancelled task." },
          { status: 400 }
        );
      }
      if (currentStatus === "IN_PROGRESS") {
        return NextResponse.json(
          { error: "Task is already in progress." },
          { status: 400 }
        );
      }

      task.status = "IN_PROGRESS";
      task.startedAt = new Date();
      if (notes && typeof notes === "string") {
        task.notes = notes.trim();
      }

      await task.save();

      // Update room status if Housekeeping
      if (taskResult.type === "HOUSEKEEPING" && task.roomId) {
        const room = await Room.findById(task.roomId);
        if (room && room.status !== "OCCUPIED" && room.status !== "OUT_OF_SERVICE") {
          await Room.findByIdAndUpdate(task.roomId, { status: "CLEANING" });
        }
      }

      return NextResponse.json({
        success: true,
        message: "Task started successfully.",
        task: {
          ...taskResult.formatted,
          status: "IN_PROGRESS",
          startedAt: task.startedAt,
          notes: task.notes,
        },
      });
    }

    // Handle COMPLETE action or status transition to COMPLETED
    if (action === "COMPLETE" || targetStatus === "COMPLETED" || targetStatus === "RESOLVED") {
      if (currentStatus === "COMPLETED" || currentStatus === "RESOLVED") {
        return NextResponse.json(
          { error: "Task is already completed." },
          { status: 400 }
        );
      }
      if (currentStatus === "CANCELLED") {
        return NextResponse.json(
          { error: "Cannot complete a cancelled task." },
          { status: 400 }
        );
      }

      const completedTime = new Date();
      task.status = taskResult.type === "MAINTENANCE" ? "RESOLVED" : "COMPLETED";
      if (taskResult.type === "MAINTENANCE") {
        (task as any).resolvedAt = completedTime;
      } else {
        (task as any).completedAt = completedTime;
      }
      if (!task.startedAt) {
        task.startedAt = completedTime;
      }
      if (notes && typeof notes === "string") {
        task.notes = notes.trim();
      }

      await task.save();

      // If Housekeeping, update room status safely
      if (taskResult.type === "HOUSEKEEPING" && task.roomId) {
        const room = await Room.findById(task.roomId);
        if (room) {
          if (room.status !== "OCCUPIED" && room.status !== "OUT_OF_SERVICE") {
            const activeMaintenance = await MaintenanceRequest.findOne({
              hotelId,
              roomId: room._id,
              status: { $in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] },
            });
            const nextStatus = activeMaintenance ? "MAINTENANCE" : "AVAILABLE";
            await Room.findByIdAndUpdate(room._id, { status: nextStatus, cleaningStatus: "CLEAN" });
          } else {
            await Room.findByIdAndUpdate(room._id, { cleaningStatus: "CLEAN" });
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: "Task completed successfully.",
        task: {
          ...taskResult.formatted,
          status: "COMPLETED",
          completedAt: completedTime,
          notes: task.notes,
        },
      });
    }

    // Update notes only
    if (notes !== undefined && typeof notes === "string") {
      task.notes = notes.trim();
      await task.save();

      return NextResponse.json({
        success: true,
        message: "Task notes updated successfully.",
        task: {
          ...taskResult.formatted,
          notes: task.notes,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid status transition or action requested." },
      { status: 400 }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}
