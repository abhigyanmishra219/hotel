import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import HousekeepingTask from "@/models/HousekeepingTask";
import Room from "@/models/Room";
import User from "@/models/User";
import { requireHotelUser, requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import {
  HOUSEKEEPING_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "@/types/housekeeping";

/**
 * GET /api/housekeeping
 * Retrieves housekeeping tasks strictly scoped to the authenticated user's hotel.
 * - If role is STAFF: Returns only tasks assigned to the authenticated staff member.
 * - If role is MANAGER / RECEPTIONIST: Returns all tasks for the hotel with filtering.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireHotelUser(req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status")?.trim();
    const priority = searchParams.get("priority")?.trim();
    const type = searchParams.get("type")?.trim();
    const roomId = searchParams.get("roomId")?.trim();
    const assignedTo = searchParams.get("assignedTo")?.trim();
    const search = searchParams.get("search")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    // STRICT MULTI-TENANT QUERY
    const query: Record<string, any> = {
      hotelId: new mongoose.Types.ObjectId(authUser.hotelId),
    };

    // Role-based staff filtering
    if (authUser.role === USER_ROLES.STAFF) {
      query.assignedTo = new mongoose.Types.ObjectId(authUser.userId);
    } else if (assignedTo && assignedTo !== "ALL" && mongoose.Types.ObjectId.isValid(assignedTo)) {
      query.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }

    // Filter by status
    if (status && status !== "ALL" && (TASK_STATUSES as readonly string[]).includes(status)) {
      query.status = status;
    }

    // Filter by priority
    if (priority && priority !== "ALL" && (TASK_PRIORITIES as readonly string[]).includes(priority)) {
      query.priority = priority;
    }

    // Filter by type
    if (type && type !== "ALL" && (HOUSEKEEPING_TYPES as readonly string[]).includes(type)) {
      query.type = type;
    }

    // Filter by room
    if (roomId && roomId !== "ALL" && mongoose.Types.ObjectId.isValid(roomId)) {
      query.roomId = new mongoose.Types.ObjectId(roomId);
    }

    // Text search by taskId, room number, notes, or staff name
    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      // Find matching rooms
      const matchedRooms = await Room.find({
        hotelId: authUser.hotelId,
        roomNumber: searchRegex,
      }).select("_id");

      // Find matching staff members
      const matchedStaff = await User.find({
        hotelId: authUser.hotelId,
        role: USER_ROLES.STAFF,
        name: searchRegex,
      }).select("_id");

      const orConds: any[] = [
        { taskId: searchRegex },
        { notes: searchRegex },
      ];

      if (matchedRooms.length > 0) {
        orConds.push({ roomId: { $in: matchedRooms.map((r) => r._id) } });
      }

      if (matchedStaff.length > 0) {
        orConds.push({ assignedTo: { $in: matchedStaff.map((s) => s._id) } });
      }

      query.$or = orConds;
    }

    const total = await HousekeepingTask.countDocuments(query);
    const tasks = await HousekeepingTask.find(query)
      .populate("roomId", "roomNumber floor roomType status")
      .populate("assignedTo", "name email role")
      .populate("bookingId", "bookingId customerId checkInDate checkOutDate")
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      tasks,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    return handleAuthError(err);
  }
}

/**
 * POST /api/housekeeping
 * Creates a new housekeeping task. Permitted for MANAGER and RECEPTIONIST.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await requireRole([USER_ROLES.MANAGER, USER_ROLES.RECEPTIONIST], req);
    if (!authUser.hotelId) {
      return NextResponse.json({ error: "User is not assigned to a hotel property." }, { status: 403 });
    }

    await connectToDatabase();
    const body = await req.json();
    const { roomId, type = "ROOM_CLEANING", priority = "MEDIUM", assignedTo, notes = "" } = body;

    if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
      return NextResponse.json({ error: "Valid roomId is required" }, { status: 400 });
    }

    // 1. Verify Room belongs to manager's hotel
    const room = await Room.findOne({
      _id: roomId,
      hotelId: authUser.hotelId,
    });

    if (!room) {
      return NextResponse.json(
        { error: "Room not found or does not belong to your hotel" },
        { status: 404 }
      );
    }

    // 2. Validate Type & Priority
    if (!(HOUSEKEEPING_TYPES as readonly string[]).includes(type)) {
      return NextResponse.json({ error: "Invalid housekeeping task type" }, { status: 400 });
    }

    if (!(TASK_PRIORITIES as readonly string[]).includes(priority)) {
      return NextResponse.json({ error: "Invalid task priority" }, { status: 400 });
    }

    // 3. Verify Staff assignee if provided
    let assignedUserId: mongoose.Types.ObjectId | undefined = undefined;
    let initialStatus = "PENDING";

    if (assignedTo) {
      if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
        return NextResponse.json({ error: "Invalid assignedTo staff ID format" }, { status: 400 });
      }

      const staffUser = await User.findOne({
        _id: assignedTo,
        hotelId: authUser.hotelId,
        role: USER_ROLES.STAFF,
        isActive: true,
      });

      if (!staffUser) {
        return NextResponse.json(
          { error: "Assigned staff member not found in your hotel or is inactive" },
          { status: 400 }
        );
      }

      assignedUserId = staffUser._id as mongoose.Types.ObjectId;
      initialStatus = "ASSIGNED";
    }

    // 4. Duplicate task check (idempotency)
    const existingActiveTask = await HousekeepingTask.findOne({
      hotelId: authUser.hotelId,
      roomId: room._id,
      type,
      status: { $in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] },
    });

    if (existingActiveTask) {
      return NextResponse.json(
        {
          error: `An active ${type} task (${existingActiveTask.taskId}) already exists for Room ${room.roomNumber}.`,
          task: existingActiveTask,
        },
        { status: 409 }
      );
    }

    // 5. Create Task
    const newTask: any = await HousekeepingTask.create({
      hotelId: authUser.hotelId,
      roomId: room._id,
      assignedTo: assignedUserId,
      type,
      priority,
      status: initialStatus as any,
      notes: String(notes).trim(),
      createdBy: authUser.userId,
    });

    // 6. Update room status to CLEANING if room is currently AVAILABLE
    if (room.status === "AVAILABLE") {
      await Room.findByIdAndUpdate(room._id, { status: "CLEANING" });
    }

    const populated = await HousekeepingTask.findById(newTask._id)
      .populate("roomId", "roomNumber floor roomType status")
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role")
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: `Housekeeping task ${newTask.taskId} created successfully for Room ${room.roomNumber}.`,
        task: populated,
      },
      { status: 201 }
    );
  } catch (err) {
    return handleAuthError(err);
  }
}
