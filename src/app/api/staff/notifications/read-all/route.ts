import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { requireStaffUser, handleAuthError } from "@/lib/auth";

/**
 * PATCH & POST /api/staff/notifications/read-all
 * Marks all unread notifications as read for the authenticated staff user.
 */
async function markAllAsRead(req: NextRequest) {
  try {
    const authUser = await requireStaffUser(req);
    await connectToDatabase();

    const hotelId = new mongoose.Types.ObjectId(authUser.hotelId);
    const recipientId = new mongoose.Types.ObjectId(authUser.userId);

    const result = await Notification.updateMany(
      {
        hotelId,
        recipientId,
        isRead: false,
      },
      { isRead: true }
    );

    return NextResponse.json({
      success: true,
      message: "All notifications marked as read.",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(req: NextRequest) {
  return markAllAsRead(req);
}

export async function POST(req: NextRequest) {
  return markAllAsRead(req);
}
