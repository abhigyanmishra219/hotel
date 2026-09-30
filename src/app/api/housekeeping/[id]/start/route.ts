import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import HousekeepingTask from "@/models/HousekeepingTask";
import Room from "@/models/Room";
import { requireHotelUser, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";

/**
 * POST /api/housekeeping/[id]/start
 * Staff (or Manager) begins cleaning on an assigned task.
 * Sets task.status = 'IN_PROGRESS', task.startedAt = now.
 * Ensures room.status remains/becomes 'CLEANING'.
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

    if (task.status === "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Task is already in progress." },
        { status: 400 }
      );
    }

    if (task.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Task has already been completed." },
        { status: 400 }
      );
    }

    if (task.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot start a cancelled task." },
        { status: 400 }
      );
    }

    task.status = "IN_PROGRESS";
    task.startedAt = new Date();
    await task.save();

    // Ensure Room is in CLEANING status
    await Room.findByIdAndUpdate(task.roomId, { status: "CLEANING" });

    const populated = await HousekeepingTask.findById(task._id)
      .populate("roomId", "roomNumber floor roomType status")
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role")
      .lean();

    return NextResponse.json({
      success: true,
      message: `Started cleaning for Room ${(populated?.roomId as any)?.roomNumber || ""}.`,
      task: populated,
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
