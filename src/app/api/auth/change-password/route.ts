import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Hotel from "@/models/Hotel";
import { requireAuth, handleAuthError } from "@/lib/auth";
import { createToken } from "@/lib/jwt";
import { logAudit } from "@/lib/audit";
import { rateLimit, rateLimitExceededResponse } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce Rate Limiting (5 password change attempts per minute per IP)
    const rateLimitCheck = rateLimit(req, {
      maxRequests: 5,
      windowSeconds: 60,
      prefix: "auth_change_pw",
    });

    if (!rateLimitCheck.success) {
      return rateLimitExceededResponse(rateLimitCheck);
    }

    // 2. Authenticate user from JWT (cookie or Authorization header)
    const authUser = await requireAuth(req);

    if (!authUser.userId) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid user session" },
        { status: 401 }
      );
    }

    // 3. Parse request body - ONLY accept currentPassword, newPassword, confirmPassword
    // Explicitly ignore any userId, role, or hotelId in the request body
    const body = await req.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // 4. Validate New Password
    if (!newPassword || typeof newPassword !== "string") {
      return NextResponse.json(
        { error: "New password is required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New passwords do not match." },
        { status: 400 }
      );
    }

    // 5. Connect DB and find authenticated user
    await connectToDatabase();
    const user = await User.findById(authUser.userId).select("+password");

    if (!user) {
      return NextResponse.json(
        { error: "User account not found." },
        { status: 404 }
      );
    }

    if (user.isActive === false) {
      return NextResponse.json(
        { error: "Account is deactivated. Please contact your system administrator." },
        { status: 403 }
      );
    }

    // 6. Verify Current Password
    // FIRST LOGIN: Current temporary password does NOT need to be entered if mustChangePassword is true
    // NORMAL DASHBOARD: Current password IS required
    if (!user.mustChangePassword) {
      if (!currentPassword || typeof currentPassword !== "string" || !currentPassword.trim()) {
        return NextResponse.json(
          { error: "Current password is required." },
          { status: 400 }
        );
      }

      if (!user.password) {
        return NextResponse.json(
          { error: "Account password is not set." },
          { status: 500 }
        );
      }

      const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentValid) {
        return NextResponse.json(
          { error: "Current password is incorrect." },
          { status: 400 }
        );
      }
    } else if (currentPassword) {
      // If user is in first-login mode but optionally submitted currentPassword, verify it
      if (user.password) {
        const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentValid) {
          return NextResponse.json(
            { error: "Current password is incorrect." },
            { status: 400 }
          );
        }
      }
    }

    // 7. Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 8. Update user password and clear mustChangePassword flag
    const wasFirstLogin = Boolean(user.mustChangePassword);
    user.password = hashedPassword;
    user.mustChangePassword = false;
    await user.save();

    const hotelIdStr = user.hotelId ? user.hotelId.toString() : null;
    let hotelName: string | null = null;
    if (user.hotelId) {
      const hotelDoc = await Hotel.findById(user.hotelId).select("name").lean();
      if (hotelDoc) hotelName = hotelDoc.name;
    }

    // 9. Audit log password change
    await logAudit({
      userId: user._id,
      hotelId: user.hotelId || null,
      action: "USER_PASSWORD_CHANGED",
      entity: "User",
      entityId: user._id.toString(),
      description: wasFirstLogin
        ? `Password updated for user '${user.name}' (${user.email}) - first-login requirement fulfilled`
        : `Password changed for user '${user.name}' (${user.email}) from dashboard`,
      metadata: {
        role: user.role,
      },
    });

    // 10. Generate fresh JWT token with mustChangePassword = false
    const token = createToken({
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      hotelId: hotelIdStr,
      hotelName,
      mustChangePassword: false,
    });

    const response = NextResponse.json({
      success: true,
      message: "Password changed successfully.",
      token,
      user: {
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        hotelId: hotelIdStr,
        hotelName,
        mustChangePassword: false,
      },
    });

    // 11. Update the auth cookie with the fresh token
    response.cookies.set("hotel_auth_token", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    return handleAuthError(error);
  }
}
