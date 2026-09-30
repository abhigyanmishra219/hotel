import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import HousekeepingTask from "@/models/HousekeepingTask";
import RoomServiceRequest from "@/models/RoomServiceRequest";
import MaintenanceRequest from "@/models/MaintenanceRequest";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { parseReportDateRange } from "@/lib/reportService";

/**
 * GET /api/reports/staff
 * Staff Operational Activity Report: Housekeeping, Room Service, Maintenance metrics by staff member.
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
    const dateRange = parseReportDateRange(
      searchParams.get("preset"),
      searchParams.get("startDate"),
      searchParams.get("endDate")
    );

    const { startDate, endDate } = dateRange;

    // Fetch all active staff & receptionists belonging to this hotel
    const staffMembers = await User.find({
      hotelId,
      role: { $in: [USER_ROLES.STAFF, USER_ROLES.RECEPTIONIST] },
      isActive: true,
    })
      .select("name email role")
      .lean();

    const staffIds = staffMembers.map((s) => s._id);

    // Aggregate Housekeeping tasks
    const hkAgg = await HousekeepingTask.aggregate([
      {
        $match: {
          hotelId,
          assignedTo: { $in: staffIds },
          createdAt: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: "$assignedTo",
          totalHk: { $sum: 1 },
          completedHk: {
            $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
          },
          pendingHk: {
            $sum: {
              $cond: [{ $in: ["$status", ["PENDING", "ASSIGNED", "IN_PROGRESS"]] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Aggregate Room Service
    const rsAgg = await RoomServiceRequest.aggregate([
      {
        $match: {
          hotelId,
          assignedTo: { $in: staffIds },
          createdAt: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: "$assignedTo",
          totalRs: { $sum: 1 },
          completedRs: {
            $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
          },
          pendingRs: {
            $sum: {
              $cond: [{ $in: ["$status", ["PENDING", "ASSIGNED", "IN_PROGRESS"]] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Aggregate Maintenance
    const mtAgg = await MaintenanceRequest.aggregate([
      {
        $match: {
          hotelId,
          assignedTo: { $in: staffIds },
          createdAt: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: "$assignedTo",
          totalMt: { $sum: 1 },
          resolvedMt: {
            $sum: { $cond: [{ $eq: ["$status", "RESOLVED"] }, 1, 0] },
          },
          openMt: {
            $sum: {
              $cond: [{ $in: ["$status", ["OPEN", "ASSIGNED", "IN_PROGRESS"]] }, 1, 0],
            },
          },
        },
      },
    ]);

    const hkMap = new Map(hkAgg.map((h) => [String(h._id), h]));
    const rsMap = new Map(rsAgg.map((r) => [String(r._id), r]));
    const mtMap = new Map(mtAgg.map((m) => [String(m._id), m]));

    const staffReports = staffMembers.map((staff) => {
      const hk = hkMap.get(String(staff._id));
      const rs = rsMap.get(String(staff._id));
      const mt = mtMap.get(String(staff._id));

      const totalHk = hk?.totalHk || 0;
      const completedHk = hk?.completedHk || 0;
      const pendingHk = hk?.pendingHk || 0;

      const totalRs = rs?.totalRs || 0;
      const completedRs = rs?.completedRs || 0;
      const pendingRs = rs?.pendingRs || 0;

      const totalMt = mt?.totalMt || 0;
      const resolvedMt = mt?.resolvedMt || 0;
      const openMt = mt?.openMt || 0;

      const totalAssigned = totalHk + totalRs + totalMt;
      const totalResolved = completedHk + completedRs + resolvedMt;

      return {
        staffId: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        housekeeping: {
          total: totalHk,
          completed: completedHk,
          pending: pendingHk,
        },
        roomService: {
          total: totalRs,
          completed: completedRs,
          pending: pendingRs,
        },
        maintenance: {
          total: totalMt,
          resolved: resolvedMt,
          open: openMt,
        },
        totalAssigned,
        totalResolved,
        completionRate:
          totalAssigned > 0 ? Math.round((totalResolved / totalAssigned) * 100) : 100,
      };
    });

    return NextResponse.json({
      success: true,
      dateRange: {
        preset: dateRange.preset,
        label: dateRange.label,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      staff: staffReports,
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
