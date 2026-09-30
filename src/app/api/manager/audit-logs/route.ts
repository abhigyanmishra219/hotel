import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { AUDIT_ACTIONS } from "@/types/audit";
import { sanitizePagination, sanitizeRegex } from "@/lib/apiValidation";

/**
 * GET /api/manager/audit-logs
 * Secure, hotel-isolated audit log endpoint for Hotel Managers.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireRole([USER_ROLES.MANAGER, USER_ROLES.SYSTEM_ADMIN], req);
    if (!authUser.hotelId) {
      return NextResponse.json({ error: "User is not assigned to a hotel property" }, { status: 403 });
    }

    await connectToDatabase();
    const hotelId = new mongoose.Types.ObjectId(authUser.hotelId);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const action = searchParams.get("action")?.trim();
    const startDate = searchParams.get("startDate")?.trim();
    const endDate = searchParams.get("endDate")?.trim();

    const { page, limit, skip } = sanitizePagination(
      searchParams.get("page"),
      searchParams.get("limit"),
      100
    );

    const query: Record<string, any> = { hotelId };

    // Filter by specific Action
    if (action && action !== "ALL") {
      query.action = action;
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

    // Search query across description, entity, entityId
    if (search) {
      const safeSearch = sanitizeRegex(search);
      query.$or = [
        { description: { $regex: safeSearch, $options: "i" } },
        { action: { $regex: safeSearch, $options: "i" } },
        { entity: { $regex: safeSearch, $options: "i" } },
        { entityId: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name email role")
        .lean(),
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
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
