import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Hotel from "@/models/Hotel";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireRole(USER_ROLES.SYSTEM_ADMIN, req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const role = searchParams.get("role")?.trim();
    const hotelId = searchParams.get("hotelId")?.trim();
    const status = searchParams.get("status")?.trim();

    const query: Record<string, any> = {};

    if (role && ["SYSTEM_ADMIN", "MANAGER", "RECEPTIONIST", "STAFF"].includes(role)) {
      query.role = role;
    }

    if (hotelId && mongoose.Types.ObjectId.isValid(hotelId)) {
      query.hotelId = hotelId;
    }

    if (status === "ACTIVE") query.isActive = true;
    if (status === "DISABLED") query.isActive = false;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .populate("hotelId", "name hotelCode status")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      count: users.length,
      users,
      currentUserId: authUser.userId,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await requireRole(USER_ROLES.SYSTEM_ADMIN, req);
    await connectToDatabase();

    const body = await req.json();
    const { userId, action } = body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Valid userId is required" },
        { status: 400 }
      );
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Safety constraint: Protect current logged in admin and prevent disabling the only admin
    if (action === "toggle-status") {
      if (targetUser._id.toString() === authUser.userId) {
        return NextResponse.json(
          { error: "Security restriction: You cannot deactivate your own System Admin account" },
          { status: 400 }
        );
      }

      if (targetUser.role === USER_ROLES.SYSTEM_ADMIN && targetUser.isActive) {
        const activeAdminCount = await User.countDocuments({
          role: USER_ROLES.SYSTEM_ADMIN,
          isActive: true,
        });

        if (activeAdminCount <= 1) {
          return NextResponse.json(
            { error: "Security restriction: Cannot deactivate the sole remaining active System Admin" },
            { status: 400 }
          );
        }
      }

      targetUser.isActive = !targetUser.isActive;
      await targetUser.save();

      return NextResponse.json({
        success: true,
        message: `User ${targetUser.name} is now ${targetUser.isActive ? "ACTIVE" : "DISABLED"}`,
        isActive: targetUser.isActive,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return handleAuthError(error);
  }
}
