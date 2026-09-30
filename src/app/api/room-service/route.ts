import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import RoomServiceRequest from "@/models/RoomServiceRequest";
import Room from "@/models/Room";
import Booking from "@/models/Booking";
import User from "@/models/User";
import { requireHotelUser, requireFrontDeskUser, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { ROOM_SERVICE_STATUSES } from "@/types/roomService";
import { TASK_PRIORITIES } from "@/types/housekeeping";

/**
 * GET /api/room-service
 * Lists room-service requests for authenticated hotel.
 * - Staff sees only assigned requests.
 * - Manager & Receptionist see all with filters.
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
      query.assignedTo = new mongoose.Types.ObjectId(authUser.userId);
    } else if (assignedTo && assignedTo !== "ALL" && mongoose.Types.ObjectId.isValid(assignedTo)) {
      query.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }

    if (status && status !== "ALL" && (ROOM_SERVICE_STATUSES as readonly string[]).includes(status)) {
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
        { notes: searchRegex },
        { "items.item": searchRegex },
      ];

      if (matchedRooms.length > 0) {
        orConds.push({ roomId: { $in: matchedRooms.map((r) => r._id) } });
      }

      query.$or = orConds;
    }

    const total = await RoomServiceRequest.countDocuments(query);
    const requests = await RoomServiceRequest.find(query)
      .populate("roomId", "roomNumber floor roomType status")
      .populate("bookingId", "bookingId customerId")
      .populate("requestedBy", "name email role")
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
 * POST /api/room-service
 * Manager or Receptionist creates a new room service request for an active checked-in guest.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await requireFrontDeskUser(req);
    await connectToDatabase();

    const body = await req.json();
    const { roomId, items, notes = "", priority = "MEDIUM", assignedTo } = body;

    if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
      return NextResponse.json({ error: "Valid roomId is required" }, { status: 400 });
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

    // 2. Validate active CHECKED_IN stay for this room
    const activeBooking = await Booking.findOne({
      hotelId: authUser.hotelId,
      roomId: room._id,
      status: "CHECKED_IN",
    });

    if (!activeBooking) {
      return NextResponse.json(
        {
          error: `Room ${room.roomNumber} does not currently have an active checked-in guest. Room service can only be requested for occupied rooms.`,
        },
        { status: 400 }
      );
    }

    // 3. Validate items
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one service item is required (e.g. Extra Water, Towels)" },
        { status: 400 }
      );
    }

    const cleanItems = items
      .map((it: any) => ({
        item: String(it.item || "").trim(),
        quantity: Math.max(1, parseInt(String(it.quantity || "1"), 10) || 1),
      }))
      .filter((it) => it.item.length > 0);

    if (cleanItems.length === 0) {
      return NextResponse.json(
        { error: "Item descriptions cannot be empty" },
        { status: 400 }
      );
    }

    // 4. Validate staff assignee if provided (Manager only)
    let assignedUserId: mongoose.Types.ObjectId | undefined = undefined;
    let initialStatus = "PENDING";

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

    const newRequest: any = await RoomServiceRequest.create({
      hotelId: authUser.hotelId,
      roomId: room._id,
      bookingId: activeBooking._id,
      requestedBy: authUser.userId,
      assignedTo: assignedUserId,
      items: cleanItems,
      notes: String(notes || "").trim(),
      priority: (TASK_PRIORITIES as readonly string[]).includes(priority) ? priority : "MEDIUM",
      status: initialStatus as any,
    });

    const populated = await RoomServiceRequest.findById(newRequest._id)
      .populate("roomId", "roomNumber floor roomType")
      .populate("bookingId", "bookingId customerId")
      .populate("requestedBy", "name email role")
      .populate("assignedTo", "name email role")
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: `Room service request ${newRequest.requestId} created for Room ${room.roomNumber}.`,
        request: populated,
      },
      { status: 201 }
    );
  } catch (err) {
    return handleAuthError(err);
  }
}
