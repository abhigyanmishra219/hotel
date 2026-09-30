import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import HousekeepingTask from "@/models/HousekeepingTask";
import Room from "@/models/Room";
import MaintenanceRequest from "@/models/MaintenanceRequest";
import { requireHotelUser, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";

/**
 * POST /api/housekeeping/[id]/complete
 * Staff marks room cleaning task ready and completed.
 * Validates active stay and maintenance conflicts before setting room to AVAILABLE.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireHotelUser(req);
    const { id } = await params;
    await connectToDatabase();

    const query: Record<string, any> = {
      hotelId: authUser.hotelId,
      ...(mongoose.Types.ObjectId.isValid(id)
        ? { _id: new mongoose.Types.ObjectId(id) }
        : { taskId: id.toUpperCase() }),
    };

    // If STAFF, verify assigned to this staff member
    if (authUser.role === USER_ROLES.STAFF) {
      query.assignedTo = new mongoose.Types.ObjectId(authUser.userId);
    }

    const task = await HousekeepingTask.findOne(query);
    if (!task) {
      return NextResponse.json(
        { error: "Housekeeping task not found or not assigned to you." },
        { status: 404 }
      );
    }

    if (task.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Housekeeping task has already been completed." },
        { status: 409 }
      );
    }

    if (task.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot complete a cancelled task." },
        { status: 400 }
      );
    }

    if (task.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Task must be started (in progress) before it can be marked as completed." },
        { status: 400 }
      );
    }

    // 1. Mark task completed
    task.status = "COMPLETED";
    task.completedAt = new Date();
    if (!task.startedAt) {
      task.startedAt = new Date();
    }
    await task.save();

    // 2. Safe Room Transition Logic:
    // Check if room is blocked by active maintenance or out of service
    const room = await Room.findById(task.roomId);
    let nextRoomStatus = "AVAILABLE";

    if (room) {
      if (room.status === "OCCUPIED") {
        nextRoomStatus = "OCCUPIED";
      } else if (room.status === "OUT_OF_SERVICE") {
        nextRoomStatus = "OUT_OF_SERVICE";
      } else {
        const activeMaintenance = await MaintenanceRequest.findOne({
          hotelId: authUser.hotelId,
          roomId: room._id,
          status: { $in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] },
        });

        if (activeMaintenance) {
          nextRoomStatus = "MAINTENANCE";
        }
      }

      await Room.findByIdAndUpdate(room._id, { status: nextRoomStatus });
    }

    const populated = await HousekeepingTask.findById(task._id)
      .populate("roomId", "roomNumber floor roomType status")
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role")
      .lean();

    return NextResponse.json({
      success: true,
      message: `Cleaning completed. Room ${(populated?.roomId as any)?.roomNumber || ""} is now marked as ${nextRoomStatus}.`,
      task: populated,
      roomStatus: nextRoomStatus,
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
