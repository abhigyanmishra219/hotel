import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";
import Hotel from "@/models/Hotel";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { AUDIT_ACTIONS } from "@/types/audit";

export async function GET(req: NextRequest) {
  try {
    // 1. Security Check: Only SYSTEM_ADMIN can view security audit logs
    await requireRole(USER_ROLES.SYSTEM_ADMIN, req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const action = searchParams.get("action")?.trim();
    const hotelId = searchParams.get("hotelId")?.trim();
    const startDate = searchParams.get("startDate")?.trim();
    const endDate = searchParams.get("endDate")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    // Filter by specific Action
    if (action && action !== "ALL") {
      query.action = action;
    }

    // Filter by specific Hotel
    if (hotelId && hotelId !== "ALL") {
      if (hotelId === "PLATFORM") {
        query.hotelId = null;
      } else if (mongoose.Types.ObjectId.isValid(hotelId)) {
        query.hotelId = new mongoose.Types.ObjectId(hotelId);
      }
    }

    // Filter by Date Range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Search query across description, action, entity, entityId
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: "i" } },
        { action: { $regex: search, $options: "i" } },
        { entity: { $regex: search, $options: "i" } },
        { entityId: { $regex: search, $options: "i" } },
      ];
    }

    // Execute queries in parallel
    const [total, logs, availableHotels] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name email role")
        .populate("hotelId", "hotelCode name city")
        .lean(),
      Hotel.find({}, "hotelCode name").sort({ name: 1 }).lean(),
    ]);

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      availableActions: Object.values(AUDIT_ACTIONS),
      availableHotels,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
