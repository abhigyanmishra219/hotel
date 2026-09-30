import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Hotel, { IHotel } from "@/models/Hotel";
import User, { IUser } from "@/models/User";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import HotelSubscription from "@/models/HotelSubscription";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { logAudit } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/types/audit";

export async function GET(req: NextRequest) {
  try {
    // 1. Authorize: Only SYSTEM_ADMIN can view all hotels
    await requireRole(USER_ROLES.SYSTEM_ADMIN, req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status")?.trim();

    const query: Record<string, any> = {};

    if (status && ["ACTIVE", "INACTIVE", "SUSPENDED"].includes(status)) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { hotelCode: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
      ];
    }

    const hotels = await Hotel.find(query).sort({ createdAt: -1 }).lean();

    // Attach Manager and Subscription information to each hotel
    const hotelIds = hotels.map((h) => h._id);
    const [managers, hotelSubscriptions] = await Promise.all([
      User.find({
        hotelId: { $in: hotelIds },
        role: USER_ROLES.MANAGER,
      })
        .select("name email role hotelId isActive createdAt")
        .lean(),
      HotelSubscription.find({
        hotelId: { $in: hotelIds },
        isCurrent: true,
      })
        .populate("planId")
        .lean(),
    ]);

    const managerMap = new Map<string, any>();
    managers.forEach((m) => {
      if (m.hotelId) {
        managerMap.set(m.hotelId.toString(), m);
      }
    });

    const subMap = new Map<string, any>();
    hotelSubscriptions.forEach((s: any) => {
      if (s.hotelId) {
        subMap.set(s.hotelId.toString(), s);
      }
    });

    const enrichedHotels = hotels.map((hotel) => ({
      ...hotel,
      manager: managerMap.get(hotel._id.toString()) || null,
      subscription: subMap.get(hotel._id.toString()) || null,
    }));

    return NextResponse.json({
      success: true,
      count: enrichedHotels.length,
      hotels: enrichedHotels,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authorize: Only SYSTEM_ADMIN can create hotels
    const adminUser = await requireRole(USER_ROLES.SYSTEM_ADMIN, req);
    await connectToDatabase();

    const body = await req.json();
    const {
      name,
      email,
      phone,
      address,
      city,
      state,
      country,
      managerName,
      managerEmail,
      managerPassword,
      planId,
      billingCycle = "MONTHLY",
    } = body;

    // 2. Validate Hotel Fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Hotel name is required" },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "Hotel email is required" },
        { status: 400 }
      );
    }

    // 3. If Manager details are provided, pre-validate Manager Email
    if (managerEmail) {
      const existingUser = await User.findOne({
        email: managerEmail.toLowerCase().trim(),
      });
      if (existingUser) {
        return NextResponse.json(
          { error: `User with email '${managerEmail}' already exists` },
          { status: 409 }
        );
      }
    }

    // 4. Validate Subscription Plan if selected
    let selectedPlan: any = null;
    if (planId) {
      if (!mongoose.Types.ObjectId.isValid(planId)) {
        return NextResponse.json(
          { error: "Invalid subscription plan ID format" },
          { status: 400 }
        );
      }
      selectedPlan = await SubscriptionPlan.findById(planId);
      if (!selectedPlan) {
        return NextResponse.json(
          { error: "Selected subscription plan does not exist" },
          { status: 404 }
        );
      }
      if (selectedPlan.status !== "ACTIVE") {
        return NextResponse.json(
          { error: `Cannot assign inactive subscription plan '${selectedPlan.name}'. Please choose an active plan.` },
          { status: 400 }
        );
      }
    }

    // 5. Create Hotel (hotelCode will be auto-generated e.g. HOT-000001)
    const newHotel = await Hotel.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim(),
      address: address?.trim(),
      city: city?.trim(),
      state: state?.trim(),
      country: country?.trim() || "USA",
      status: "ACTIVE",
    });

    let createdManager = null;
    let tempPassword = null;

    // 6. Create Initial Manager if provided
    if (managerName && managerEmail) {
      // Generate secure temporary password if not explicitly supplied
      tempPassword = managerPassword && managerPassword.length >= 6
        ? managerPassword
        : `Mgr@${crypto.randomBytes(4).toString("hex")}`;

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(tempPassword, salt);

      const managerDoc = await User.create({
        name: managerName.trim(),
        email: managerEmail.toLowerCase().trim(),
        password: hashedPassword,
        role: USER_ROLES.MANAGER,
        hotelId: newHotel._id,
        mustChangePassword: true,
        isActive: true,
      });

      createdManager = {
        userId: managerDoc._id.toString(),
        name: managerDoc.name,
        email: managerDoc.email,
        role: managerDoc.role,
        hotelId: newHotel._id.toString(),
        mustChangePassword: true,
        isActive: managerDoc.isActive,
      };

      // Log Manager Creation Audit
      await logAudit({
        userId: adminUser.userId,
        hotelId: newHotel._id,
        action: AUDIT_ACTIONS.MANAGER_CREATED,
        entity: "User",
        entityId: managerDoc._id.toString(),
        description: `General Manager '${managerDoc.name}' (${managerDoc.email}) provisioned for ${newHotel.name}`,
        metadata: {
          managerName: managerDoc.name,
          managerEmail: managerDoc.email,
          role: managerDoc.role,
          hotelCode: newHotel.hotelCode,
        },
      });
    }

    // 7. Assign Subscription Plan if provided
    let createdSubscription = null;
    if (selectedPlan) {
      const startDate = new Date();
      const durationDays = billingCycle === "YEARLY" ? 365 : 30;
      const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

      const newSub = await HotelSubscription.create({
        hotelId: newHotel._id,
        planId: selectedPlan._id,
        status: "ACTIVE",
        startDate,
        endDate,
        paymentStatus: "PAID",
        isCurrent: true,
        changeReason: `Initial '${selectedPlan.name}' subscription plan assigned upon hotel registration`,
      });

      createdSubscription = await HotelSubscription.findById(newSub._id)
        .populate("planId")
        .lean();

      // Log Subscription Assigned Audit
      await logAudit({
        userId: adminUser.userId,
        hotelId: newHotel._id,
        action: AUDIT_ACTIONS.SUBSCRIPTION_ASSIGNED,
        entity: "HotelSubscription",
        entityId: newSub._id.toString(),
        description: `Initial subscription '${selectedPlan.name}' (ACTIVE) assigned to '${newHotel.name}'`,
        metadata: {
          planName: selectedPlan.name,
          planId: selectedPlan._id.toString(),
          billingCycle,
          features: selectedPlan.features,
          maxRooms: selectedPlan.maxRooms,
          maxStaff: selectedPlan.maxStaff,
          maxReceptionists: selectedPlan.maxReceptionists,
        },
      });
    }

    // Log Hotel Creation Audit
    await logAudit({
      userId: adminUser.userId,
      hotelId: newHotel._id,
      action: AUDIT_ACTIONS.HOTEL_CREATED,
      entity: "Hotel",
      entityId: newHotel._id.toString(),
      description: `Hotel '${newHotel.name}' (${newHotel.hotelCode}) registered on platform`,
      metadata: {
        hotelCode: newHotel.hotelCode,
        name: newHotel.name,
        email: newHotel.email,
        city: newHotel.city,
        state: newHotel.state,
        country: newHotel.country,
        assignedPlan: selectedPlan ? selectedPlan.name : "None",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Hotel '${newHotel.name}' created with code ${newHotel.hotelCode}`,
        hotel: newHotel,
        manager: createdManager,
        subscription: createdSubscription,
        temporaryPassword: tempPassword,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "A hotel with this code or email already exists" },
        { status: 409 }
      );
    }
    return handleAuthError(error);
  }
}
