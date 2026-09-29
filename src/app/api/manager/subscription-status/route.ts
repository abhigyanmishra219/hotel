import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { requireHotelUser, handleAuthError } from "@/lib/auth";
import {
  getHotelActiveSubscription,
  checkRoomLimit,
  checkStaffLimit,
  checkReceptionistLimit,
  handleSubscriptionEnforcementError,
} from "@/lib/subscription-enforcement";

/**
 * GET /api/manager/subscription-status
 * Returns current subscription tier, quota limits, and enabled modules for the hotel dashboard.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireHotelUser(req);
    await connectToDatabase();

    const { subscription, plan } = await getHotelActiveSubscription(authUser.hotelId);
    const roomQuota = await checkRoomLimit(authUser.hotelId);
    const staffQuota = await checkStaffLimit(authUser.hotelId);
    const receptionistQuota = await checkReceptionistLimit(authUser.hotelId);

    return NextResponse.json({
      success: true,
      subscription: {
        _id: subscription._id,
        status: subscription.status,
        paymentStatus: subscription.paymentStatus,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
      },
      plan: {
        _id: plan._id,
        name: plan.name,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        features: plan.features,
      },
      quotas: {
        rooms: roomQuota,
        staff: staffQuota,
        receptionists: receptionistQuota,
      },
    });
  } catch (error) {
    const subError = handleSubscriptionEnforcementError(error);
    if (subError) return subError;
    return handleAuthError(error);
  }
}
