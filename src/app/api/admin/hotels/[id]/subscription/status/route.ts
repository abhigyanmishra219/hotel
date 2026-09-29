import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import HotelSubscription from "@/models/HotelSubscription";
import Hotel from "@/models/Hotel";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { logAudit } from "@/lib/audit";
import { AUDIT_ACTIONS, AuditAction } from "@/types/audit";

/**
 * PATCH /api/admin/hotels/[id]/subscription/status
 * Updates subscription status (ACTIVE, SUSPENDED, CANCELLED) or payment status for the hotel's current subscription.
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
        { error: "Invalid hotel ID format" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { status, paymentStatus, subscriptionId, reason } = body;

    const query: Record<string, any> = { hotelId: id };
    if (subscriptionId && mongoose.Types.ObjectId.isValid(subscriptionId)) {
      query._id = subscriptionId;
    } else {
      query.isCurrent = true;
    }

    let sub = await HotelSubscription.findOne(query);

    // If no isCurrent: true record found, find the latest
    if (!sub) {
      sub = await HotelSubscription.findOne({ hotelId: id }).sort({ createdAt: -1 });
    }

    if (!sub) {
      return NextResponse.json(
        { error: "No subscription found for this hotel" },
        { status: 404 }
      );
    }

    const previousStatus = sub.status;
    const previousPayment = sub.paymentStatus;

    if (status !== undefined) {
      const validStatuses = ["ACTIVE", "TRIAL", "EXPIRED", "SUSPENDED", "CANCELLED"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Status must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      sub.status = status;
    }

    if (paymentStatus !== undefined) {
      const validPayment = ["PAID", "PENDING", "FAILED"];
      if (!validPayment.includes(paymentStatus)) {
        return NextResponse.json(
          { error: `Payment status must be one of: ${validPayment.join(", ")}` },
          { status: 400 }
        );
      }
      sub.paymentStatus = paymentStatus;
    }

    if (reason) {
      sub.changeReason = reason.trim();
    }

    await sub.save();

    const updated = await HotelSubscription.findById(sub._id)
      .populate("planId")
      .lean();

    const hotel = await Hotel.findById(id).select("name hotelCode").lean();

    // Determine audit action
    let auditAction: AuditAction = AUDIT_ACTIONS.SUBSCRIPTION_CHANGED;
    if (status === "SUSPENDED") auditAction = AUDIT_ACTIONS.SUBSCRIPTION_SUSPENDED;
    else if (status === "CANCELLED") auditAction = AUDIT_ACTIONS.SUBSCRIPTION_CANCELLED;
    else if (status === "ACTIVE" && previousStatus === "SUSPENDED") auditAction = AUDIT_ACTIONS.SUBSCRIPTION_REACTIVATED;

    await logAudit({
      userId: adminUser.userId,
      hotelId: sub.hotelId,
      action: auditAction,
      entity: "HotelSubscription",
      entityId: sub._id.toString(),
      description: `Subscription status for '${hotel?.name || "Hotel"}' changed to '${sub.status}' (Payment: ${sub.paymentStatus})`,
      metadata: {
        previousStatus,
        newStatus: sub.status,
        previousPayment,
        newPayment: sub.paymentStatus,
        reason: sub.changeReason,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Subscription status updated to '${sub.status}'`,
      subscription: updated,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
