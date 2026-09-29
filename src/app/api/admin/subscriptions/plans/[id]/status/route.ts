import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { logAudit } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/types/audit";

/**
 * PATCH /api/admin/subscriptions/plans/[id]/status
 * Toggles or sets the status of a subscription plan (ACTIVE / INACTIVE).
 * Only SYSTEM_ADMIN can access.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireRole(USER_ROLES.SYSTEM_ADMIN, req);
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

    const body = await req.json().catch(() => ({}));
    let newStatus = body.status;

    if (!newStatus) {
      // Toggle if not provided
      newStatus = plan.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    } else if (newStatus !== "ACTIVE" && newStatus !== "INACTIVE") {
      return NextResponse.json(
        { error: "Status must be either ACTIVE or INACTIVE" },
        { status: 400 }
      );
    }

    const previousStatus = plan.status;
    plan.status = newStatus;
    await plan.save();

    const auditAction = newStatus === "ACTIVE"
      ? AUDIT_ACTIONS.PLAN_ACTIVATED
      : AUDIT_ACTIONS.PLAN_DEACTIVATED;

    await logAudit({
      userId: adminUser.userId,
      action: auditAction,
      entity: "SubscriptionPlan",
      entityId: plan._id.toString(),
      description: `Subscription plan '${plan.name}' was ${newStatus === "ACTIVE" ? "ACTIVATED" : "DEACTIVATED"}`,
      metadata: {
        name: plan.name,
        previousStatus,
        newStatus,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Plan '${plan.name}' is now ${plan.status}`,
      plan,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
