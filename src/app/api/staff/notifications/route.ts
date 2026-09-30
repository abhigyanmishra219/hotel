import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { requireStaffUser, handleAuthError } from "@/lib/auth";

/**
 * GET /api/staff/notifications
 * Retrieves notifications strictly scoped to authenticated user and hotel.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireStaffUser(req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

    const hotelId = new mongoose.Types.ObjectId(authUser.hotelId);
    const recipientId = new mongoose.Types.ObjectId(authUser.userId);

    const query: Record<string, any> = {
      hotelId,
      recipientId,
    };

    if (unreadOnly) {
      query.isRead = false;
    }

    const [unreadCount, total, notifications] = await Promise.all([
      Notification.countDocuments({ hotelId, recipientId, isRead: false }),
      Notification.countDocuments(query),
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      unreadCount,
      notifications,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * POST /api/staff/notifications
 * Internal helper to create operational notification scoped to hotel.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await requireStaffUser(req);
    await connectToDatabase();

    const body = await req.json();
    const { recipientId, type, title, message, relatedTaskId, relatedTaskType } = body;

    if (!recipientId || !title || !message) {
      return NextResponse.json(
        { error: "recipientId, title, and message are required." },
        { status: 400 }
      );
    }

    const notification = await Notification.create({
      hotelId: new mongoose.Types.ObjectId(authUser.hotelId),
      recipientId: new mongoose.Types.ObjectId(recipientId),
      type: type || "TASK_ASSIGNED",
      title: String(title).trim(),
      message: String(message).trim(),
      relatedTaskId: relatedTaskId ? String(relatedTaskId).trim() : undefined,
      relatedTaskType: relatedTaskType || undefined,
      isRead: false,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Notification created successfully.",
        notification,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}
