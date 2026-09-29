import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { requireHotelUser, handleAuthError } from "@/lib/auth";
import {
  requireHotelFeature,
  handleSubscriptionEnforcementError,
} from "@/lib/subscription-enforcement";

/**
 * GET /api/manager/analytics
 * Protected module: Requires 'analytics' feature in the hotel's active subscription.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireHotelUser(req);
    await connectToDatabase();

    // BACKEND FEATURE ENFORCEMENT
    await requireHotelFeature(authUser.hotelId, "analytics");

    return NextResponse.json({
      success: true,
      feature: "analytics",
      message: "Revenue Analytics module is enabled for your subscription plan",
      analytics: {
        forecastedRevenue: 128500,
        monthlyGrowth: "+14.2%",
      },
    });
  } catch (error) {
    const subError = handleSubscriptionEnforcementError(error);
    if (subError) return subError;
    return handleAuthError(error);
  }
}
