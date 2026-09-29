import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { requireHotelUser, handleAuthError } from "@/lib/auth";
import {
  requireHotelFeature,
  handleSubscriptionEnforcementError,
} from "@/lib/subscription-enforcement";

/**
 * GET /api/manager/billing
 * Protected module: Requires 'billing' feature in the hotel's active subscription.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireHotelUser(req);
    await connectToDatabase();

    // BACKEND FEATURE ENFORCEMENT
    await requireHotelFeature(authUser.hotelId, "billing");

    return NextResponse.json({
      success: true,
      feature: "billing",
      message: "Billing & Invoicing module is enabled for your subscription plan",
      invoices: [],
    });
  } catch (error) {
    const subError = handleSubscriptionEnforcementError(error);
    if (subError) return subError;
    return handleAuthError(error);
  }
}
