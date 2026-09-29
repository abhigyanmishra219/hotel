import connectToDatabase from "../src/lib/mongodb";
import SubscriptionPlan from "../src/models/SubscriptionPlan";
import { ICreatePlanInput } from "../src/types/subscription";

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

export async function seedSubscriptionPlans() {
  await connectToDatabase();
  console.log("🌱 Seeding default subscription plans...");

  for (const plan of DEFAULT_PLANS) {
    const existing = await SubscriptionPlan.findOne({ name: plan.name });
    if (!existing) {
      const created = await SubscriptionPlan.create(plan);
      console.log(`   ✓ Seeded plan: ${created.name} ($${created.monthlyPrice}/mo)`);
    } else {
      console.log(`   ℹ Plan '${plan.name}' already exists in database`);
    }
  }

  console.log("✅ Subscription plans seeding completed.");
}

if (require.main === module) {
  seedSubscriptionPlans()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seeding failed:", err);
      process.exit(1);
    });
}
