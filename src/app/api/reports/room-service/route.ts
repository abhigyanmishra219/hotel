import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import RoomServiceRequest from "@/models/RoomServiceRequest";
import Room from "@/models/Room";
import User from "@/models/User";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { parseReportDateRange } from "@/lib/reportService";

/**
 * GET /api/reports/room-service
 * Room service request volumes, fulfillment metrics, item breakdowns, staff performance.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireRole(
      [USER_ROLES.MANAGER, USER_ROLES.RECEPTIONIST, USER_ROLES.SYSTEM_ADMIN],
      req
    );
    if (!authUser.hotelId) {
      return NextResponse.json({ error: "User is not assigned to a hotel property" }, { status: 403 });
    }

    await connectToDatabase();
    const hotelId = new mongoose.Types.ObjectId(authUser.hotelId);

    const { searchParams } = new URL(req.url);
    const dateRange = parseReportDateRange(
      searchParams.get("preset"),
      searchParams.get("startDate"),
      searchParams.get("endDate")
    );

    const statusFilter = searchParams.get("status");
    const roomIdParam = searchParams.get("roomId");
    const staffIdParam = searchParams.get("staffId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const { startDate, endDate, prevStartDate, prevEndDate } = dateRange;

    // 1. Overall Room Service Volume in Window
    const baseWindowMatch: any = {
      hotelId,
      createdAt: { $gte: startDate, $lt: endDate },
    };

    const [
      totalRequests,
      completedCount,
      pendingCount,
      inProgressCount,
      cancelledCount,
    ] = await Promise.all([
      RoomServiceRequest.countDocuments(baseWindowMatch),
      RoomServiceRequest.countDocuments({ ...baseWindowMatch, status: "COMPLETED" }),
      RoomServiceRequest.countDocuments({ ...baseWindowMatch, status: { $in: ["PENDING", "ASSIGNED"] } }),
      RoomServiceRequest.countDocuments({ ...baseWindowMatch, status: "IN_PROGRESS" }),
      RoomServiceRequest.countDocuments({ ...baseWindowMatch, status: "CANCELLED" }),
    ]);

    const prevTotalRequests = await RoomServiceRequest.countDocuments({
      hotelId,
      createdAt: { $gte: prevStartDate, $lt: prevEndDate },
    });

    // 2. Most requested items aggregate
    const popularItemsAgg = await RoomServiceRequest.aggregate([
      { $match: { hotelId, createdAt: { $gte: startDate, $lt: endDate } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.item",
          orderCount: { $sum: "$items.quantity" },
        },
      },
      { $sort: { orderCount: -1 } },
      { $limit: 10 },
    ]);

    const popularItems = popularItemsAgg.map((item) => ({
      name: item._id,
      quantityOrdered: item.orderCount,
    }));

    // 3. Paginated Request Query
    const queryFilter: any = { ...baseWindowMatch };
    if (statusFilter && statusFilter !== "ALL") {
      queryFilter.status = statusFilter;
    }
    if (roomIdParam && roomIdParam !== "ALL") {
      queryFilter.roomId = new mongoose.Types.ObjectId(roomIdParam);
    }
    if (staffIdParam && staffIdParam !== "ALL") {
      queryFilter.assignedTo = new mongoose.Types.ObjectId(staffIdParam);
    }

    const totalFiltered = await RoomServiceRequest.countDocuments(queryFilter);
    const requests = await RoomServiceRequest.find(queryFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("roomId", "roomNumber roomType")
      .populate("assignedTo", "name email")
      .lean();

    const formattedRequests = requests.map((r: any) => ({
      _id: r._id,
      requestId: r.requestId,
      roomNumber: r.roomId?.roomNumber || "—",
      roomType: r.roomId?.roomType || "—",
      assignedStaff: r.assignedTo?.name || "Unassigned",
      items: r.items || [],
      priority: r.priority,
      status: r.status,
      notes: r.notes || "",
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      createdAt: r.createdAt,
    }));

    return NextResponse.json({
      success: true,
      dateRange: {
        preset: dateRange.preset,
        label: dateRange.label,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      summary: {
        totalRequests,
        completed: completedCount,
        pending: pendingCount,
        inProgress: inProgressCount,
        cancelled: cancelledCount,
        deltaRequests: totalRequests - prevTotalRequests,
        completionRate:
          totalRequests > 0 ? Math.round((completedCount / totalRequests) * 100) : 0,
      },
      popularItems,
      requests: formattedRequests,
      pagination: {
        page,
        limit,
        totalRecords: totalFiltered,
        totalPages: Math.ceil(totalFiltered / limit) || 1,
      },
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
