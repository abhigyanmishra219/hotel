import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import MaintenanceRequest from "@/models/MaintenanceRequest";
import HousekeepingTask from "@/models/HousekeepingTask";
import Booking from "@/models/Booking";
import Room from "@/models/Room";
import { requireHotelUser, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";

/**
 * POST /api/maintenance/[id]/resolve
 * Staff or Manager resolves a maintenance issue and safely transitions room status.
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
        : { requestId: id.toUpperCase() }),
    };

    if (authUser.role === USER_ROLES.STAFF) {
      query.$or = [
        { assignedTo: new mongoose.Types.ObjectId(authUser.userId) },
        { reportedBy: new mongoose.Types.ObjectId(authUser.userId) },
      ];
    }

    const request = await MaintenanceRequest.findOne(query);
    if (!request) {
      return NextResponse.json(
        { error: "Maintenance request not found or access denied." },
        { status: 404 }
      );
    }

    if (request.status === "RESOLVED") {
      return NextResponse.json(
        { error: "Maintenance request has already been resolved." },
        { status: 400 }
      );
    }

    request.status = "RESOLVED";
    request.resolvedAt = new Date();
    if (!request.startedAt) {
      request.startedAt = new Date();
    }
    await request.save();

    // Safe Room Next-Status Determination:
    const room = await Room.findById(request.roomId);
    let nextRoomStatus = "AVAILABLE";

    if (room) {
      if (room.status === "OUT_OF_SERVICE") {
        nextRoomStatus = "OUT_OF_SERVICE";
      } else {
        // 1. Check other active maintenance issues
        const otherMaintenance = await MaintenanceRequest.findOne({
          hotelId: authUser.hotelId,
          roomId: room._id,
          _id: { $ne: request._id },
          status: { $in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] },
        });

        if (otherMaintenance) {
          nextRoomStatus = "MAINTENANCE";
        } else {
          // 2. Check active checked-in booking
          const activeStay = await Booking.findOne({
            hotelId: authUser.hotelId,
            roomId: room._id,
            status: "CHECKED_IN",
          });

          if (activeStay) {
            nextRoomStatus = "OCCUPIED";
          } else {
            // 3. Check active cleaning / housekeeping task
            const activeCleaning = await HousekeepingTask.findOne({
              hotelId: authUser.hotelId,
              roomId: room._id,
              status: { $in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] },
            });

            if (activeCleaning) {
              nextRoomStatus = "CLEANING";
            } else {
              nextRoomStatus = "AVAILABLE";
            }
          }
        }
      }

      await Room.findByIdAndUpdate(room._id, { status: nextRoomStatus });
    }

    const populated = await MaintenanceRequest.findById(request._id)
      .populate("roomId", "roomNumber floor roomType status")
      .populate("reportedBy", "name email role")
      .populate("assignedTo", "name email role")
      .lean();

    return NextResponse.json({
      success: true,
      message: `Maintenance resolved for Room ${(populated?.roomId as any)?.roomNumber || ""}. Room status is now ${nextRoomStatus}.`,
      request: populated,
      roomStatus: nextRoomStatus,
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
