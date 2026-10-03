import { NextRequest, NextResponse } from "next/server";
import { requireStaff, handleAuthError } from "@/lib/authorization/staff";

/**
 * GET /api/staff/profile
 * Returns the authenticated staff member's account information and assigned hotel property.
 * Strictly avoids exposing internal MongoDB ObjectIds / hotelId to the frontend UI.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, hotel, dbUser } = await requireStaff(req);

    return NextResponse.json({
      success: true,
      user: {
        userId: user.userId,
        name: dbUser?.name || user.name,
        email: dbUser?.email || user.email,
        role: dbUser?.role || user.role,
        shift: (dbUser as any)?.shift || "09:00 AM - 06:00 PM (General Shift)",
      },
      hotel: {
        name: hotel.name,
        address: hotel.address,
        city: hotel.city,
        state: hotel.state,
        country: hotel.country,
        phone: hotel.phone,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
