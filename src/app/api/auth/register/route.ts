import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { createToken } from "@/lib/jwt";
import { USER_ROLES } from "@/types/roles";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, confirmPassword } = body;

    // 1. Validation
    if (!name || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Please provide a valid name" },
        { status: 400 }
      );
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    // 2. Connect to Database
    await connectToDatabase();

    const normalizedEmail = email.toLowerCase().trim();

    // 3. Check for existing user
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // 4. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Create new user with hardcoded SYSTEM_ADMIN role and null hotelId
    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: USER_ROLES.SYSTEM_ADMIN, // Always SYSTEM_ADMIN when created from create account page
      hotelId: null,
    });

    // 6. Generate JWT Token
    const token = createToken({
      userId: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      hotelId: null,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully with SYSTEM_ADMIN role",
        token,
        user: {
          userId: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          hotelId: null,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Account creation error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong while creating account" },
      { status: 500 }
    );
  }
}
