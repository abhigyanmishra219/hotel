import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";

/**
 * GET /api/admin/subscriptions/plans/[id]
 * Retrieves a single subscription plan by ID.
 * Only SYSTEM_ADMIN can access.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(USER_ROLES.SYSTEM_ADMIN, req);
    await connectToDatabase();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid subscription plan ID format" },
        { status: 400 }
      );
    }

    const plan = await SubscriptionPlan.findById(id).lean();
    if (!plan) {
      return NextResponse.json(
        { error: "Subscription plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      plan,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * PUT /api/admin/subscriptions/plans/[id]
 * Updates a subscription plan by ID.
 * Only SYSTEM_ADMIN can access.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(USER_ROLES.SYSTEM_ADMIN, req);
    await connectToDatabase();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid subscription plan ID format" },
        { status: 400 }
      );
    }

    const plan = await SubscriptionPlan.findById(id);
    if (!plan) {
      return NextResponse.json(
        { error: "Subscription plan not found" },
        { status: 404 }
      );
    }

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

    // 1. Name validation
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json(
          { error: "Plan name cannot be empty" },
          { status: 400 }
        );
      }
      const trimmedName = name.trim();

      // Check if duplicate with other plan
      const existing = await SubscriptionPlan.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      });
      if (existing) {
        return NextResponse.json(
          { error: `A subscription plan with the name '${trimmedName}' already exists` },
          { status: 409 }
        );
      }
      plan.name = trimmedName;
    }

    // 2. Description
    if (description !== undefined) {
      plan.description = String(description).trim();
    }

    // 3. Pricing validations
    if (monthlyPrice !== undefined) {
      const numMonthly = Number(monthlyPrice);
      if (isNaN(numMonthly) || numMonthly < 0) {
        return NextResponse.json(
          { error: "Monthly price must be a non-negative number" },
          { status: 400 }
        );
      }
      plan.monthlyPrice = numMonthly;
    }

    if (yearlyPrice !== undefined) {
      const numYearly = Number(yearlyPrice);
      if (isNaN(numYearly) || numYearly < 0) {
        return NextResponse.json(
          { error: "Yearly price must be a non-negative number" },
          { status: 400 }
        );
      }
      plan.yearlyPrice = numYearly;
    }

    // 4. Limit validations
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

    if (maxRooms !== undefined) {
      const parsedRooms = parseLimit(maxRooms, "Maximum Rooms");
      if (parsedRooms.error) {
        return NextResponse.json({ error: parsedRooms.error }, { status: 400 });
      }
      plan.maxRooms = parsedRooms.value;
    }

    if (maxStaff !== undefined) {
      const parsedStaff = parseLimit(maxStaff, "Maximum Staff");
      if (parsedStaff.error) {
        return NextResponse.json({ error: parsedStaff.error }, { status: 400 });
      }
      plan.maxStaff = parsedStaff.value;
    }

    if (maxReceptionists !== undefined) {
      const parsedReceptionists = parseLimit(maxReceptionists, "Maximum Receptionists");
      if (parsedReceptionists.error) {
        return NextResponse.json({ error: parsedReceptionists.error }, { status: 400 });
      }
      plan.maxReceptionists = parsedReceptionists.value;
    }

    // 5. Features
    if (features !== undefined) {
      if (Array.isArray(features)) {
        plan.features = features
          .map((f: any) => String(f).trim())
          .filter((f: string) => f.length > 0);
      }
    }

    // 6. Status
    if (status !== undefined) {
      if (status !== "ACTIVE" && status !== "INACTIVE") {
        return NextResponse.json(
          { error: "Status must be either ACTIVE or INACTIVE" },
          { status: 400 }
        );
      }
      plan.status = status;
    }

    await plan.save();

    return NextResponse.json({
      success: true,
      message: `Subscription plan '${plan.name}' updated successfully`,
      plan,
    });
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

/**
 * DELETE /api/admin/subscriptions/plans/[id]
 * Deletes a subscription plan by ID.
 * Only SYSTEM_ADMIN can access.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(USER_ROLES.SYSTEM_ADMIN, req);
    await connectToDatabase();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid subscription plan ID format" },
        { status: 400 }
      );
    }

    const deletedPlan = await SubscriptionPlan.findByIdAndDelete(id);
    if (!deletedPlan) {
      return NextResponse.json(
        { error: "Subscription plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Subscription plan '${deletedPlan.name}' deleted successfully`,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
