import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Hotel from "@/models/Hotel";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";

export async function GET(req: NextRequest) {
  try {
    await requireRole(USER_ROLES.SYSTEM_ADMIN, req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status")?.trim();

    const query: Record<string, any> = {
      role: USER_ROLES.MANAGER,
    };

    if (status === "ACTIVE") query.isActive = true;
    if (status === "DISABLED") query.isActive = false;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const managers = await User.find(query)
      .populate("hotelId", "name hotelCode status city state")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      count: managers.length,
      managers,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
