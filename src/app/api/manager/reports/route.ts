import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { requireHotelUser, handleAuthError } from "@/lib/auth";
import {
  requireHotelFeature,
  handleSubscriptionEnforcementError,
} from "@/lib/subscription-enforcement";

/**
 * GET /api/manager/reports
 * Protected module: Requires 'reports' feature in the hotel's active subscription.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireHotelUser(req);
    await connectToDatabase();

    // BACKEND FEATURE ENFORCEMENT
    await requireHotelFeature(authUser.hotelId, "reports");

    return NextResponse.json({
      success: true,
      feature: "reports",
      message: "Operational Reports module is enabled for your subscription plan",
      reports: {
        occupancyRate: 78.5,
        revPAR: 142.3,
        adr: 181.2,
      },
    });
  } catch (error) {
    const subError = handleSubscriptionEnforcementError(error);
    if (subError) return subError;
    return handleAuthError(error);
  }
}
