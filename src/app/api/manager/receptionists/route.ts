import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Hotel from "@/models/Hotel";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import HotelSubscription from "@/models/HotelSubscription";
import { authenticateManager, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { generateTemporaryPassword } from "@/types/staff";
import {
  assertReceptionistLimit,
  checkReceptionistLimit,
  handleSubscriptionEnforcementError,
} from "@/lib/subscription-enforcement";

/**
 * GET /api/manager/receptionists
 * Lists all receptionists belonging ONLY to the authenticated Manager's hotel.
 * Supports: search (name, email, phone), status filter (ACTIVE, INACTIVE, ALL), sorting, pagination.
 */
export async function GET(req: NextRequest) {
  try {
    const authManager = await authenticateManager(req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.toUpperCase() || "ALL";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    // STRICT MULTI-TENANT QUERY: Must match authenticated hotelId and role = RECEPTIONIST
    const query: any = {
      hotelId: authManager.hotelId,
      role: USER_ROLES.RECEPTIONIST,
    };

    // Filter by Active Status
    if (status === "ACTIVE") {
      query.isActive = true;
    } else if (status === "INACTIVE") {
      query.isActive = false;
    }

    // Search by Name, Email, or Phone (case-insensitive)
    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    const sortOptions: any = {};
    if (sortBy === "name") {
      sortOptions.name = sortOrder;
    } else if (sortBy === "email") {
      sortOptions.email = sortOrder;
    } else if (sortBy === "isActive") {
      sortOptions.isActive = sortOrder;
    } else {
      sortOptions.createdAt = sortOrder;
    }

    const total = await User.countDocuments(query);
    const skip = (page - 1) * limit;

    const receptionists = await User.find(query)
      .select("_id name email phone role hotelId isActive mustChangePassword createdAt updatedAt")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    // Fetch live counts for Manager dashboard / filter summaries
    const [activeCount, inactiveCount, quota] = await Promise.all([
      User.countDocuments({
        hotelId: authManager.hotelId,
        role: USER_ROLES.RECEPTIONIST,
        isActive: true,
      }),
      User.countDocuments({
        hotelId: authManager.hotelId,
        role: USER_ROLES.RECEPTIONIST,
        isActive: false,
      }),
      checkReceptionistLimit(authManager.hotelId).catch(() => ({
        allowed: true,
        current: 0,
        max: -1,
        planName: "Standard",
      })),
    ]);

    // Retrieve Hotel details for display
    const hotel = await Hotel.findById(authManager.hotelId).select("name hotelCode").lean();

    return NextResponse.json({
      success: true,
      total,
      activeCount,
      inactiveCount,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      receptionists: receptionists.map((r: any) => ({
        ...r,
        hotelName: hotel?.name || "Your Hotel",
        hotelCode: hotel?.hotelCode || "HOT-000000",
      })),
      quota,
    });
  } catch (error: any) {
    const subError = handleSubscriptionEnforcementError(error);
    if (subError) return subError;
    return handleAuthError(error);
  }
}

/**
 * POST /api/manager/receptionists
 * Creates a new Receptionist account for the authenticated Manager's hotel.
 * Automatically assigns role = RECEPTIONIST and hotelId = authManager.hotelId.
 * Sets mustChangePassword = true for first login requirement.
 */
export async function POST(req: NextRequest) {
  try {
    const authManager = await authenticateManager(req);
    await connectToDatabase();

    const body = await req.json();
    const { name, email, phone, password } = body;

    // 1. Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Full Name is required" }, { status: 400 });
    }

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Email address is required" }, { status: 400 });
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    const cleanEmail = email.toLowerCase().trim();
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // 2. Enforce Subscription Receptionist Limit
    await assertReceptionistLimit(authManager.hotelId);

    // 3. Check for existing user with this email
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // 4. Determine Password (generate secure temporary password if not provided)
    const rawPassword =
      password && String(password).trim().length >= 6
        ? String(password).trim()
        : generateTemporaryPassword();

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    // 5. Create Receptionist User strictly isolated to Manager's hotelId and role = RECEPTIONIST
    const newReceptionist: any = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phone: phone ? String(phone).trim() : "",
      password: hashedPassword,
      role: USER_ROLES.RECEPTIONIST, // Strictly server-enforced
      hotelId: authManager.hotelId, // Strictly server-enforced
      mustChangePassword: true, // First login must reset password
      isActive: true,
    });

    const updatedQuota = await checkReceptionistLimit(authManager.hotelId).catch(() => ({
      allowed: true,
      current: 1,
      max: -1,
      planName: "Standard",
    }));

    return NextResponse.json(
      {
        success: true,
        message: `Receptionist '${newReceptionist.name}' created successfully`,
        user: {
          _id: newReceptionist._id,
          name: newReceptionist.name,
          email: newReceptionist.email,
          phone: newReceptionist.phone,
          role: newReceptionist.role,
          hotelId: newReceptionist.hotelId,
          isActive: newReceptionist.isActive,
          mustChangePassword: newReceptionist.mustChangePassword,
          createdAt: newReceptionist.createdAt,
        },
        temporaryPassword: rawPassword, // Returned ONCE for manager presentation
        quota: updatedQuota,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Receptionist creation error:", error);
    const subError = handleSubscriptionEnforcementError(error);
    if (subError) return subError;

    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors || {})
        .map((e: any) => e.message)
        .filter(Boolean);
      return NextResponse.json(
        { success: false, error: messages[0] || "Validation failed." },
        { status: 400 }
      );
    }

    return handleAuthError(error);
  }
}
