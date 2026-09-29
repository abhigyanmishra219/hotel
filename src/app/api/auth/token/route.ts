import { NextRequest, NextResponse } from "next/server";
import { createToken, verifyToken } from "@/lib/jwt";
import { isValidRole, VALID_ROLES, UserRole, USER_ROLES } from "@/types/roles";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, role, userId, hotelId } = body;

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: "Name, email, and role are required" },
        { status: 400 }
      );
    }

    if (!isValidRole(role)) {
      return NextResponse.json(
        {
          error: `Invalid role: '${role}'. Allowed roles are: ${VALID_ROLES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (role !== USER_ROLES.SYSTEM_ADMIN && !hotelId) {
      return NextResponse.json(
        { error: `hotelId is required for role '${role}'` },
        { status: 400 }
      );
    }

    // Generate JWT Token with strict UserRole and hotelId
    const token = createToken({
      userId: userId || "user_" + Date.now(),
      name,
      email,
      role: role as UserRole,
      hotelId: hotelId || null,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        userId,
        name,
        email,
        role,
        hotelId: hotelId || null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  if (!token) {
    return NextResponse.json(
      { error: "No token provided in Authorization header" },
      { status: 401 }
    );
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    user: decoded,
  });
}
