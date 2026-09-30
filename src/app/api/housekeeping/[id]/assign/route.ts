import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import HousekeepingTask from "@/models/HousekeepingTask";
import User from "@/models/User";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";

/**
 * POST /api/housekeeping/[id]/assign
 * Manager assigns or reassigns a housekeeping task to a staff member.
 */
export async function POST(
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

    if (task.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Cannot reassign an already completed housekeeping task." },
        { status: 400 }
      );
    }

    if (task.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot reassign a cancelled housekeeping task." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { staffId, notes } = body;

    if (!staffId || !mongoose.Types.ObjectId.isValid(staffId)) {
      return NextResponse.json(
        { error: "Valid staffId is required for assignment" },
        { status: 400 }
      );
    }

    // Verify staff belongs to the same hotel and has role STAFF
    const staffUser = await User.findOne({
      _id: staffId,
      hotelId: authUser.hotelId,
      role: USER_ROLES.STAFF,
      isActive: true,
    });

    if (!staffUser) {
      return NextResponse.json(
        { error: "Staff member not found in your hotel or is inactive" },
        { status: 404 }
      );
    }

    task.assignedTo = staffUser._id as mongoose.Types.ObjectId;
    if (task.status === "PENDING") {
      task.status = "ASSIGNED";
    }
    if (notes) {
      task.notes = `${task.notes ? task.notes + " | " : ""}${String(notes).trim()}`;
    }

    await task.save();

    const populated = await HousekeepingTask.findById(task._id)
      .populate("roomId", "roomNumber floor roomType status")
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role")
      .lean();

    return NextResponse.json({
      success: true,
      message: `Task ${task.taskId} successfully assigned to ${staffUser.name}.`,
      task: populated,
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
