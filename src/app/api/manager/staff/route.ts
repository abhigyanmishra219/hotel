import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Hotel from "@/models/Hotel";
import { authenticateManager, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { generateTemporaryPassword } from "@/types/staff";
import {
  assertStaffLimit,
  checkStaffLimit,
  handleSubscriptionEnforcementError,
} from "@/lib/subscription-enforcement";

/**
 * GET /api/manager/staff
 * Lists all staff members belonging ONLY to the authenticated Manager's hotel.
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

    // STRICT MULTI-TENANT QUERY: Must match authenticated hotelId and role = STAFF
    const query: any = {
      hotelId: authManager.hotelId,
      role: USER_ROLES.STAFF,
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

    const staffMembers = await User.find(query)
      .select("_id name email phone role hotelId isActive mustChangePassword createdAt updatedAt")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    // Fetch live counts for Manager dashboard/filter summaries
    const [activeCount, inactiveCount, quota] = await Promise.all([
      User.countDocuments({
        hotelId: authManager.hotelId,
        role: USER_ROLES.STAFF,
        isActive: true,
      }),
      User.countDocuments({
        hotelId: authManager.hotelId,
        role: USER_ROLES.STAFF,
        isActive: false,
      }),
      checkStaffLimit(authManager.hotelId).catch(() => ({
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
      staff: staffMembers.map((s: any) => ({
        ...s,
        hotelName: hotel?.name || "Your Hotel",
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
 * POST /api/manager/staff
 * Creates a new Staff account for the authenticated Manager's hotel.
 * Automatically assigns role = STAFF and hotelId = authManager.hotelId.
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

    // 2. Enforce Subscription Staff Limit
    await assertStaffLimit(authManager.hotelId);

    // 3. Check for existing user with this email
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return NextResponse.json(
        { error: `An account with email '${cleanEmail}' already exists` },
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

    // 5. Create Staff User strictly isolated to Manager's hotelId and role = STAFF
    const newStaff: any = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phone: phone ? String(phone).trim() : "",
      password: hashedPassword,
      role: USER_ROLES.STAFF, // Strictly server-enforced
      hotelId: authManager.hotelId, // Strictly server-enforced
      mustChangePassword: true, // First login must reset password
      isActive: true,
    });

    const updatedQuota = await checkStaffLimit(authManager.hotelId).catch(() => ({
      allowed: true,
      current: 1,
      max: -1,
      planName: "Standard",
    }));

    return NextResponse.json(
      {
        success: true,
        message: `Staff member '${newStaff.name}' created successfully`,
        user: {
          _id: newStaff._id,
          name: newStaff.name,
          email: newStaff.email,
          phone: newStaff.phone,
          role: newStaff.role,
          hotelId: newStaff.hotelId,
          isActive: newStaff.isActive,
          mustChangePassword: newStaff.mustChangePassword,
          createdAt: newStaff.createdAt,
        },
        temporaryPassword: rawPassword, // Returned ONCE for manager presentation
        quota: updatedQuota,
      },
      { status: 201 }
    );
  } catch (error: any) {
    const subError = handleSubscriptionEnforcementError(error);
    if (subError) return subError;
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }
    return handleAuthError(error);
  }
}
