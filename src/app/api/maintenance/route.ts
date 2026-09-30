import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import MaintenanceRequest from "@/models/MaintenanceRequest";
import Room from "@/models/Room";
import User from "@/models/User";
import { requireHotelUser, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { MAINTENANCE_STATUSES } from "@/types/maintenance";
import { TASK_PRIORITIES } from "@/types/housekeeping";

/**
 * GET /api/maintenance
 * Retrieves maintenance requests for authenticated hotel.
 * - Staff sees only assigned or self-reported requests.
 * - Manager & Receptionist see all requests with filters.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireHotelUser(req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status")?.trim();
    const priority = searchParams.get("priority")?.trim();
    const roomId = searchParams.get("roomId")?.trim();
    const assignedTo = searchParams.get("assignedTo")?.trim();
    const search = searchParams.get("search")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    const query: Record<string, any> = {
      hotelId: new mongoose.Types.ObjectId(authUser.hotelId),
    };

    if (authUser.role === USER_ROLES.STAFF) {
      query.$or = [
        { assignedTo: new mongoose.Types.ObjectId(authUser.userId) },
        { reportedBy: new mongoose.Types.ObjectId(authUser.userId) },
      ];
    } else if (assignedTo && assignedTo !== "ALL" && mongoose.Types.ObjectId.isValid(assignedTo)) {
      query.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }

    if (status && status !== "ALL" && (MAINTENANCE_STATUSES as readonly string[]).includes(status)) {
      query.status = status;
    }

    if (priority && priority !== "ALL" && (TASK_PRIORITIES as readonly string[]).includes(priority)) {
      query.priority = priority;
    }

    if (roomId && roomId !== "ALL" && mongoose.Types.ObjectId.isValid(roomId)) {
      query.roomId = new mongoose.Types.ObjectId(roomId);
    }

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const matchedRooms = await Room.find({
        hotelId: authUser.hotelId,
        roomNumber: searchRegex,
      }).select("_id");

      const orConds: any[] = [
        { requestId: searchRegex },
        { issue: searchRegex },
        { notes: searchRegex },
      ];

      if (matchedRooms.length > 0) {
        orConds.push({ roomId: { $in: matchedRooms.map((r) => r._id) } });
      }

      query.$and = [
        ...(query.$or ? [{ $or: query.$or }] : []),
        { $or: orConds },
      ];
      delete query.$or;
    }

    const total = await MaintenanceRequest.countDocuments(query);
    const requests = await MaintenanceRequest.find(query)
      .populate("roomId", "roomNumber floor roomType status")
      .populate("reportedBy", "name email role")
      .populate("assignedTo", "name email role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      requests,
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
 * POST /api/maintenance
 * Reports a new maintenance issue for a room in the hotel.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await requireHotelUser(req);
    await connectToDatabase();

    const body = await req.json();
    const { roomId, issue, priority = "MEDIUM", notes = "", assignedTo } = body;

    if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
      return NextResponse.json({ error: "Valid roomId is required" }, { status: 400 });
    }

    if (!issue || !String(issue).trim()) {
      return NextResponse.json({ error: "Maintenance issue description is required" }, { status: 400 });
    }

    // 1. Verify Room belongs to hotel
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

    // 2. Validate staff assignee if provided (Manager only)
    let assignedUserId: mongoose.Types.ObjectId | undefined = undefined;
    let initialStatus = "OPEN";

    if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
      const staffUser = await User.findOne({
        _id: assignedTo,
        hotelId: authUser.hotelId,
        role: USER_ROLES.STAFF,
        isActive: true,
      });

      if (staffUser) {
        assignedUserId = staffUser._id as mongoose.Types.ObjectId;
        initialStatus = "ASSIGNED";
      }
    }

    const newRequest: any = await MaintenanceRequest.create({
      hotelId: authUser.hotelId,
      roomId: room._id,
      reportedBy: authUser.userId,
      assignedTo: assignedUserId,
      issue: String(issue).trim(),
      priority: (TASK_PRIORITIES as readonly string[]).includes(priority) ? priority : "MEDIUM",
      status: initialStatus as any,
      notes: String(notes || "").trim(),
    });

    // 3. If room is not currently OCCUPIED, transition room to MAINTENANCE
    if (room.status !== "OCCUPIED" && room.status !== "OUT_OF_SERVICE") {
      await Room.findByIdAndUpdate(room._id, { status: "MAINTENANCE" });
    }

    const populated = await MaintenanceRequest.findById(newRequest._id)
      .populate("roomId", "roomNumber floor roomType status")
      .populate("reportedBy", "name email role")
      .populate("assignedTo", "name email role")
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: `Maintenance request ${newRequest.requestId} reported for Room ${room.roomNumber}.`,
        request: populated,
      },
      { status: 201 }
    );
  } catch (err) {
    return handleAuthError(err);
  }
}
