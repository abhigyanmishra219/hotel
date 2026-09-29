import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { logAudit } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/types/audit";

/**
 * GET /api/admin/subscriptions/plans
 * Lists all subscription plans.
 * Only SYSTEM_ADMIN can access.
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole(USER_ROLES.SYSTEM_ADMIN, req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status")?.trim();

    const query: Record<string, any> = {};

    if (status && ["ACTIVE", "INACTIVE"].includes(status)) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { features: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const plans = await SubscriptionPlan.find(query)
      .sort({ monthlyPrice: 1, createdAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      count: plans.length,
      plans,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * POST /api/admin/subscriptions/plans
 * Creates a new subscription plan.
 * Only SYSTEM_ADMIN can access.
 */
export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireRole(USER_ROLES.SYSTEM_ADMIN, req);
    await connectToDatabase();

    const body = await req.json();
    const {
      name,
      description,
      monthlyPrice,
      yearlyPrice,
      maxRooms,
      maxStaff,
      maxReceptionists,
      features,
      status,
    } = body;

    // 1. Validate Plan Name
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Plan name is required" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Check for duplicate plan name (case-insensitive)
    const existingPlan = await SubscriptionPlan.findOne({
      name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });

    if (existingPlan) {
      return NextResponse.json(
        { error: `A subscription plan with the name '${trimmedName}' already exists` },
        { status: 409 }
      );
    }

    // 2. Validate Prices (no negative prices allowed)
    const numMonthlyPrice = Number(monthlyPrice);
    if (isNaN(numMonthlyPrice) || numMonthlyPrice < 0) {
      return NextResponse.json(
        { error: "Monthly price must be a non-negative number" },
        { status: 400 }
      );
    }

    const numYearlyPrice = Number(yearlyPrice);
    if (isNaN(numYearlyPrice) || numYearlyPrice < 0) {
      return NextResponse.json(
        { error: "Yearly price must be a non-negative number" },
        { status: 400 }
      );
    }

    // 3. Helper to normalize and validate limits
    // Safe representation: -1 represents Unlimited.
    const parseLimit = (val: any, fieldName: string): { value: number; error?: string } => {
      if (val === null || val === undefined || val === "" || val === -1 || val === "-1" || val === "unlimited" || val === "Unlimited") {
        return { value: -1 };
      }
      const num = Number(val);
      if (isNaN(num) || num < -1 || !Number.isInteger(num)) {
        return {
          value: 0,
          error: `${fieldName} must be a non-negative whole number or -1 for unlimited`,
        };
      }
      return { value: num };
    };

    const parsedRooms = parseLimit(maxRooms, "Maximum Rooms");
    if (parsedRooms.error) {
      return NextResponse.json({ error: parsedRooms.error }, { status: 400 });
    }

    const parsedStaff = parseLimit(maxStaff, "Maximum Staff");
    if (parsedStaff.error) {
      return NextResponse.json({ error: parsedStaff.error }, { status: 400 });
    }

    const parsedReceptionists = parseLimit(maxReceptionists, "Maximum Receptionists");
    if (parsedReceptionists.error) {
      return NextResponse.json({ error: parsedReceptionists.error }, { status: 400 });
    }

    // 4. Validate and sanitize features
    let sanitizedFeatures: string[] = [];
    if (Array.isArray(features)) {
      sanitizedFeatures = features
        .map((f: any) => String(f).trim())
        .filter((f: string) => f.length > 0);
    }

    // 5. Validate status
    const planStatus = status === "INACTIVE" ? "INACTIVE" : "ACTIVE";

    // 6. Create the subscription plan
    const newPlan = await SubscriptionPlan.create({
      name: trimmedName,
      description: description?.trim() || "",
      monthlyPrice: numMonthlyPrice,
      yearlyPrice: numYearlyPrice,
      maxRooms: parsedRooms.value,
      maxStaff: parsedStaff.value,
      maxReceptionists: parsedReceptionists.value,
      features: sanitizedFeatures,
      status: planStatus,
    });

    await logAudit({
      userId: adminUser.userId,
      action: AUDIT_ACTIONS.PLAN_CREATED,
      entity: "SubscriptionPlan",
      entityId: newPlan._id.toString(),
      description: `Subscription plan '${newPlan.name}' ($${newPlan.monthlyPrice}/mo) created`,
      metadata: {
        name: newPlan.name,
        monthlyPrice: newPlan.monthlyPrice,
        yearlyPrice: newPlan.yearlyPrice,
        maxRooms: newPlan.maxRooms,
        maxStaff: newPlan.maxStaff,
        maxReceptionists: newPlan.maxReceptionists,
        features: newPlan.features,
        status: newPlan.status,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Subscription plan '${newPlan.name}' created successfully`,
        plan: newPlan,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "A subscription plan with this name already exists" },
        { status: 409 }
      );
    }
    return handleAuthError(error);
  }
}
