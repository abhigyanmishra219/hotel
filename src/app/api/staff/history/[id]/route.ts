import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import HousekeepingTask from "@/models/HousekeepingTask";
import RoomServiceRequest from "@/models/RoomServiceRequest";
import MaintenanceRequest from "@/models/MaintenanceRequest";
import { requireStaffUser, handleAuthError } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/staff/history/[id]
 * Retrieves read-only historical details and activity timeline for a completed/cancelled task.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await requireStaffUser(req);
    const { id } = await params;
    await connectToDatabase();

    const hotelId = new mongoose.Types.ObjectId(authUser.hotelId);
    const staffId = new mongoose.Types.ObjectId(authUser.userId);
    const isObjId = mongoose.Types.ObjectId.isValid(id);

    // 1. Check HousekeepingTask
    const hkQuery: any = {
      hotelId,
      assignedTo: staffId,
      ...(isObjId ? { _id: new mongoose.Types.ObjectId(id) } : { taskId: id.toUpperCase() }),
    };
    const hk = await HousekeepingTask.findOne(hkQuery)
      .populate("roomId", "roomNumber floor roomType status")
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role")
      .lean();

    if (hk) {
      const timeline = [
        {
          event: "Task Created",
          timestamp: hk.createdAt,
          description: `Housekeeping task created by ${(hk.createdBy as any)?.name || "System"}.`,
        },
      ];

      if (hk.createdAt) {
        timeline.push({
          event: "Task Assigned",
          timestamp: hk.createdAt,
          description: `Assigned to ${(hk.assignedTo as any)?.name || "Staff"}.`,
        });
      }

      if (hk.startedAt) {
        timeline.push({
          event: "Cleaning Started",
          timestamp: hk.startedAt,
          description: "Room cleaning and turnaround started.",
        });
      }

      if (hk.notes) {
        timeline.push({
          event: "Notes Logged",
          timestamp: hk.updatedAt || hk.startedAt || hk.createdAt,
          description: `Staff notes: "${hk.notes}"`,
        });
      }

      if (hk.completedAt) {
        timeline.push({
          event: "Housekeeping Completed",
          timestamp: hk.completedAt,
          description: "Room marked clean and turnaround finalized.",
        });
      }

      return NextResponse.json({
        success: true,
        task: {
          _id: hk._id,
          taskId: hk.taskId,
          category: "HOUSEKEEPING",
          taskType: hk.type || "ROOM_CLEANING",
          priority: hk.priority || "NORMAL",
          status: hk.status,
          roomId: hk.roomId,
          roomNumber: (hk.roomId as any)?.roomNumber || "N/A",
          floor: (hk.roomId as any)?.floor || "1",
          roomType: (hk.roomId as any)?.roomType || "Standard",
          notes: hk.notes || "",
          instructions: hk.notes || `Housekeeping for Room ${(hk.roomId as any)?.roomNumber || ""}`,
          startedAt: hk.startedAt,
          completedAt: hk.completedAt,
          createdAt: hk.createdAt,
          updatedAt: hk.updatedAt,
          timeline,
        },
      });
    }

    // 2. Check RoomServiceRequest
    const rsQuery: any = {
      hotelId,
      assignedTo: staffId,
      ...(isObjId ? { _id: new mongoose.Types.ObjectId(id) } : { requestId: id.toUpperCase() }),
    };
    const rs = await RoomServiceRequest.findOne(rsQuery)
      .populate("roomId", "roomNumber floor roomType status")
      .populate("assignedTo", "name email role")
      .populate("requestedBy", "name email role")
      .populate({
        path: "bookingId",
        select: "bookingId customerId",
        populate: { path: "customerId", select: "fullName name" },
      })
      .lean();

    if (rs) {
      const timeline = [
        {
          event: "Order Requested",
          timestamp: rs.createdAt,
          description: `Room service request created for Room ${(rs.roomId as any)?.roomNumber || ""}.`,
        },
      ];

      if (rs.startedAt) {
        timeline.push({
          event: "Delivery Started",
          timestamp: rs.startedAt,
          description: "Staff gathered items and initiated delivery.",
        });
      }

      if (rs.notes) {
        timeline.push({
          event: "Notes Logged",
          timestamp: rs.updatedAt || rs.startedAt || rs.createdAt,
          description: `Staff notes: "${rs.notes}"`,
        });
      }

      if (rs.completedAt) {
        timeline.push({
          event: "Delivery Completed",
          timestamp: rs.completedAt,
          description: "All requested items delivered to guest room.",
        });
      }

      return NextResponse.json({
        success: true,
        task: {
          _id: rs._id,
          taskId: rs.requestId || `RS-${rs._id.toString().slice(-6).toUpperCase()}`,
          category: "ROOM_SERVICE",
          taskType: "ROOM_SERVICE",
          priority: rs.priority || "NORMAL",
          status: rs.status,
          roomId: rs.roomId,
          roomNumber: (rs.roomId as any)?.roomNumber || "N/A",
          floor: (rs.roomId as any)?.floor || "1",
          roomType: (rs.roomId as any)?.roomType || "Standard",
          items: rs.items || [],
          guestName: (rs.bookingId as any)?.customerId?.fullName || (rs.bookingId as any)?.customerId?.name || undefined,
          notes: rs.notes || "",
          instructions: (rs.items?.map((i: any) => `${i.quantity}x ${i.item}`).join(", ")) || rs.notes || "Room service delivery",
          startedAt: rs.startedAt,
          completedAt: rs.completedAt,
          createdAt: rs.createdAt,
          updatedAt: rs.updatedAt,
          timeline,
        },
      });
    }

    // 3. Check MaintenanceRequest
    const mtQuery: any = {
      hotelId,
      assignedTo: staffId,
      ...(isObjId ? { _id: new mongoose.Types.ObjectId(id) } : { requestId: id.toUpperCase() }),
    };
    const mt = await MaintenanceRequest.findOne(mtQuery)
      .populate("roomId", "roomNumber floor roomType status")
      .populate("assignedTo", "name email role")
      .lean();

    if (mt) {
      const timeline = [
        {
          event: "Issue Reported",
          timestamp: mt.createdAt,
          description: `Maintenance request logged: ${mt.issue || "Facility maintenance"}.`,
        },
      ];

      if (mt.startedAt) {
        timeline.push({
          event: "Repair Started",
          timestamp: mt.startedAt,
          description: "Work order investigation initiated.",
        });
      }

      if (mt.resolvedAt) {
        timeline.push({
          event: "Issue Resolved",
          timestamp: mt.resolvedAt,
          description: "Facility repair completed.",
        });
      }

      return NextResponse.json({
        success: true,
        task: {
          _id: mt._id,
          taskId: mt.requestId || `MT-${mt._id.toString().slice(-6).toUpperCase()}`,
          category: "MAINTENANCE",
          taskType: "MAINTENANCE",
          priority: mt.priority || "NORMAL",
          status: mt.status === "RESOLVED" ? "COMPLETED" : mt.status,
          roomId: mt.roomId,
          roomNumber: (mt.roomId as any)?.roomNumber || "N/A",
          floor: (mt.roomId as any)?.floor || "1",
          roomType: (mt.roomId as any)?.roomType || "Standard",
          notes: mt.notes || mt.issue || "",
          instructions: mt.issue || "Maintenance inspection",
          startedAt: mt.startedAt,
          completedAt: mt.resolvedAt,
          createdAt: mt.createdAt,
          updatedAt: mt.updatedAt,
          timeline,
        },
      });
    }

    return NextResponse.json(
      { error: "Completed task not found or access denied." },
      { status: 404 }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}
