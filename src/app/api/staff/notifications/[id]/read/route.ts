import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { requireStaffUser, handleAuthError } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH & POST /api/staff/notifications/[id]/read
 * Marks a single notification as read, verifying hotelId and recipientId ownership.
 */
async function markAsRead(req: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await requireStaffUser(req);
    const { id } = await params;
    await connectToDatabase();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid notification ID format." },
        { status: 400 }
      );
    }

    const hotelId = new mongoose.Types.ObjectId(authUser.hotelId);
    const recipientId = new mongoose.Types.ObjectId(authUser.userId);

    const notification = await Notification.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        hotelId,
        recipientId,
      },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found or access denied." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification marked as read.",
      notification,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(req: NextRequest, context: RouteParams) {
  return markAsRead(req, context);
}

export async function POST(req: NextRequest, context: RouteParams) {
  return markAsRead(req, context);
}
