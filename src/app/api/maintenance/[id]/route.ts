import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import MaintenanceRequest from "@/models/MaintenanceRequest";
import { requireHotelUser, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";

/**
 * GET /api/maintenance/[id]
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

    const request = await MaintenanceRequest.findOne(query)
      .populate("roomId", "roomNumber floor roomType status")
      .populate("reportedBy", "name email role")
      .populate("assignedTo", "name email role")
      .lean();

    if (!request) {
      return NextResponse.json(
        { error: "Maintenance request not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, request });
  } catch (err) {
    return handleAuthError(err);
  }
}
