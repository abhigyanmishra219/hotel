import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Hotel from "@/models/Hotel";
import { createToken } from "@/lib/jwt";
import { rateLimit, rateLimitExceededResponse } from "@/lib/rateLimit";
import { logAudit } from "@/lib/audit";
import { USER_ROLES } from "@/types/roles";

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce Rate Limiting (5 login attempts per minute per IP)
    const rateLimitCheck = rateLimit(req, {
      maxRequests: 5,
      windowSeconds: 60,
      prefix: "auth_login",
    });

    if (!rateLimitCheck.success) {
      return rateLimitExceededResponse(rateLimitCheck);
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select("+password");

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // 2. Check if User account is active
    if (user.isActive === false) {
      const isStaffOrReceptionist =
        user.role === USER_ROLES.STAFF || user.role === USER_ROLES.RECEPTIONIST;
      return NextResponse.json(
        {
          error: isStaffOrReceptionist
            ? "Your account is inactive. Please contact your hotel manager."
            : "This user account is deactivated. Please contact your system administrator.",
        },
        { status: 403 }
      );
    }

    // 3. Verify Password Hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // 4. Verify Hotel Status for Hotel Staff / Managers
    if (user.role !== USER_ROLES.SYSTEM_ADMIN && user.hotelId) {
      const hotel = await Hotel.findById(user.hotelId).select("status name").lean();
      if (!hotel) {
        return NextResponse.json(
          { error: "Assigned hotel property not found." },
          { status: 403 }
        );
      }
      if (hotel.status === "INACTIVE" || hotel.status === "SUSPENDED") {
        return NextResponse.json(
          {
            error: `Hotel property '${hotel.name}' is currently ${hotel.status}. Hotel operations are temporarily restricted. Please contact support.`,
          },
          { status: 403 }
        );
      }
    }

    const hotelIdStr = user.hotelId ? user.hotelId.toString() : null;
    const mustChangePassword = Boolean(user.mustChangePassword);

    // 5. Generate JWT Token
    const token = createToken({
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      hotelId: hotelIdStr,
      mustChangePassword,
    });

    // 6. Record Audit Log for successful login
    await logAudit({
      userId: user._id,
      hotelId: user.hotelId || null,
      action: "USER_LOGIN",
      entity: "User",
      entityId: user._id,
      description: `User '${user.name}' (${user.role}) logged in successfully.`,
      metadata: {
        role: user.role,
        email: user.email,
      },
    });

    const response = NextResponse.json({
      success: true,
      message: "Logged in successfully",
      token,
      user: {
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        hotelId: hotelIdStr,
        mustChangePassword,
      },
    });

    response.cookies.set("hotel_auth_token", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to log in" },
      { status: 500 }
    );
  }
}
