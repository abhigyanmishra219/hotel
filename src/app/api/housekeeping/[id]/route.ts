import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import HousekeepingTask from "@/models/HousekeepingTask";
import { requireHotelUser, requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { TASK_PRIORITIES, HOUSEKEEPING_TYPES } from "@/types/housekeeping";

/**
 * GET /api/housekeeping/[id]
 * Retrieves a single housekeeping task by taskId or _id.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireHotelUser(req);
    const { id } = await params;
    await connectToDatabase();

    const query: Record<string, any> = {
      hotelId: authUser.hotelId,
    };

    if (mongoose.Types.ObjectId.isValid(id)) {
      query._id = new mongoose.Types.ObjectId(id);
    } else {
      query.taskId = id.toUpperCase();
    }

    // Staff can only view their own assigned task
    if (authUser.role === USER_ROLES.STAFF) {
      query.assignedTo = new mongoose.Types.ObjectId(authUser.userId);
    }

    const task = await HousekeepingTask.findOne(query)
      .populate("roomId", "roomNumber floor roomType status")
      .populate("assignedTo", "name email role")
      .populate("bookingId", "bookingId customerId checkInDate checkOutDate")
      .populate("createdBy", "name email role")
      .lean();

    if (!task) {
      return NextResponse.json(
        { error: "Housekeeping task not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, task });
  } catch (err) {
    return handleAuthError(err);
  }
}

/**
 * PATCH /api/housekeeping/[id]
 * Update task details (Manager only).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireRole([USER_ROLES.MANAGER, USER_ROLES.RECEPTIONIST], req);
    const { id } = await params;
    await connectToDatabase();

    const query: Record<string, any> = {
      hotelId: authUser.hotelId,
      ...(mongoose.Types.ObjectId.isValid(id)
        ? { _id: new mongoose.Types.ObjectId(id) }
        : { taskId: id.toUpperCase() }),
    };

    const task = await HousekeepingTask.findOne(query);
    if (!task) {
      return NextResponse.json(
        { error: "Housekeeping task not found in your hotel" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { priority, type, notes, status } = body;

    if (priority && (TASK_PRIORITIES as readonly string[]).includes(priority)) {
      task.priority = priority;
    }

    if (type && (HOUSEKEEPING_TYPES as readonly string[]).includes(type)) {
      task.type = type;
    }

    if (typeof notes === "string") {
      task.notes = notes.trim();
    }

    // Manager can cancel task
    if (status === "CANCELLED" && task.status !== "COMPLETED") {
      task.status = "CANCELLED";
    }

    await task.save();

    const populated = await HousekeepingTask.findById(task._id)
      .populate("roomId", "roomNumber floor roomType status")
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Housekeeping task updated successfully",
      task: populated,
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
