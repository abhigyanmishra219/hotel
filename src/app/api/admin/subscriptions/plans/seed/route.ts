import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import { requireRole, handleAuthError } from "@/lib/auth";
import { USER_ROLES } from "@/types/roles";
import { ICreatePlanInput } from "@/types/subscription";

const DEFAULT_PLANS: ICreatePlanInput[] = [
  {
    name: "Basic",
    description: "Essential property management for boutique hotels, inns, and B&Bs.",
    monthlyPrice: 49,
    yearlyPrice: 490,
    maxRooms: 25,
    maxStaff: 10,
    maxReceptionists: 3,
    features: ["booking", "billing"],
    status: "ACTIVE",
  },
  {
    name: "Professional",
    description: "Complete operations, room service, and automated billing for mid-sized hotels.",
    monthlyPrice: 149,
    yearlyPrice: 1490,
    maxRooms: 100,
    maxStaff: 50,
    maxReceptionists: 10,
    features: ["booking", "billing", "roomService", "reports"],
    status: "ACTIVE",
  },
  {
    name: "Enterprise",
    description: "Unlimited rooms, staff, predictive revenue analytics, and priority 24/7 support.",
    monthlyPrice: 399,
    yearlyPrice: 3990,
    maxRooms: -1, // Unlimited
    maxStaff: -1, // Unlimited
    maxReceptionists: -1, // Unlimited
    features: ["booking", "billing", "roomService", "reports", "analytics", "24/7 Dedicated Support", "Custom Branding"],
    status: "ACTIVE",
  },
];

/**
 * POST /api/admin/subscriptions/plans/seed
 * Seeds default Basic, Professional, and Enterprise plans if they do not exist.
 * Only SYSTEM_ADMIN can access.
 */
export async function POST(req: NextRequest) {
  try {
    await requireRole(USER_ROLES.SYSTEM_ADMIN, req);
    await connectToDatabase();

    const seeded = [];
    for (const plan of DEFAULT_PLANS) {
      const existing = await SubscriptionPlan.findOne({ name: plan.name });
      if (!existing) {
        const created = await SubscriptionPlan.create(plan);
        seeded.push(created);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${seeded.length} default subscription plans`,
      seededCount: seeded.length,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
