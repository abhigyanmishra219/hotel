import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { createToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
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

    if (user.isActive === false) {
      return NextResponse.json(
        { error: "This user account is deactivated. Please contact your system administrator." },
        { status: 403 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const hotelIdStr = user.hotelId ? user.hotelId.toString() : null;

    // Generate JWT Token with hotelId
    const token = createToken({
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      hotelId: hotelIdStr,
    });

    return NextResponse.json({
      success: true,
      message: "Logged in successfully",
      token,
      user: {
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        hotelId: hotelIdStr,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to log in" },
      { status: 500 }
    );
  }
}
