import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectToDatabase from "../src/lib/mongodb";
import SubscriptionPlan from "../src/models/SubscriptionPlan";
import User from "../src/models/User";
import Hotel from "../src/models/Hotel";
import { createToken } from "../src/lib/jwt";
import { USER_ROLES } from "../src/types/roles";
import { requireRole, AuthError } from "../src/lib/auth";

async function runPhase3Tests() {
  console.log("================================================================");
  console.log("🧪 STARTING PHASE 3: SUBSCRIPTION PLAN MANAGEMENT TESTS");
  console.log("================================================================\n");

  await connectToDatabase();
  console.log("✅ 1. Connected to MongoDB.");

  // Clean up any test records
  await SubscriptionPlan.deleteMany({
    name: {
      $in: [
        "Basic",
        "Professional",
        "Enterprise",
        "Test Plan Negative",
        "Duplicate Test",
        "Custom Plan X",
      ],
    },
  });

  const testUserEmails = [
    "sysadmin_p3@hotel.com",
    "manager_p3@hotel.com",
    "receptionist_p3@hotel.com",
    "staff_p3@hotel.com",
  ];
  await User.deleteMany({ email: { $in: testUserEmails } });
  await Hotel.deleteMany({ email: "testhotel_p3@hotel.com" });

  // ----------------------------------------------------
  // STEP 1: Create Test Hotel & Users with Different Roles
  // ----------------------------------------------------
  console.log("\n👥 2. Creating Test Users with Different Roles...");

  const hotel = await Hotel.create({
    name: "Phase 3 Test Grand Hotel",
    email: "testhotel_p3@hotel.com",
    status: "ACTIVE",
  });

  const hash = await bcrypt.hash("Password123!", 10);

  const sysAdmin = await User.create({
    name: "System Admin User",
    email: "sysadmin_p3@hotel.com",
    password: hash,
    role: USER_ROLES.SYSTEM_ADMIN,
    isActive: true,
  });

  const manager = await User.create({
    name: "Manager User",
    email: "manager_p3@hotel.com",
    password: hash,
    role: USER_ROLES.MANAGER,
    hotelId: hotel._id,
    isActive: true,
  });

  const receptionist = await User.create({
    name: "Receptionist User",
    email: "receptionist_p3@hotel.com",
    password: hash,
    role: USER_ROLES.RECEPTIONIST,
    hotelId: hotel._id,
    isActive: true,
  });

  const staff = await User.create({
    name: "Staff User",
    email: "staff_p3@hotel.com",
    password: hash,
    role: USER_ROLES.STAFF,
    hotelId: hotel._id,
    isActive: true,
  });

  console.log(`   ✓ System Admin: ${sysAdmin.email} (${sysAdmin.role})`);
  console.log(`   ✓ Manager: ${manager.email} (${manager.role})`);
  console.log(`   ✓ Receptionist: ${receptionist.email} (${receptionist.role})`);
  console.log(`   ✓ Staff: ${staff.email} (${staff.role})`);

  // Tokens
  const tokenAdmin = createToken({
    userId: sysAdmin._id.toString(),
    name: sysAdmin.name,
    email: sysAdmin.email,
    role: sysAdmin.role,
  });

  const tokenMgr = createToken({
    userId: manager._id.toString(),
    name: manager.name,
    email: manager.email,
    role: manager.role,
    hotelId: hotel._id.toString(),
  });

  const tokenRecept = createToken({
    userId: receptionist._id.toString(),
    name: receptionist.name,
    email: receptionist.email,
    role: receptionist.role,
    hotelId: hotel._id.toString(),
  });

  const tokenStaff = createToken({
    userId: staff._id.toString(),
    name: staff.name,
    email: staff.email,
    role: staff.role,
    hotelId: hotel._id.toString(),
  });

  const makeReq = (token?: string) =>
    new Request("http://localhost:3000/api/admin/subscriptions/plans", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

  // ----------------------------------------------------
  // STEP 2: SECURITY & ROLE ACCESS CONTROL TESTS
  // ----------------------------------------------------
  console.log("\n🔒 3. Testing Role-Based Access Control (RBAC) on Subscription Plans...");

  // System Admin access
  const adminAuth = await requireRole(USER_ROLES.SYSTEM_ADMIN, makeReq(tokenAdmin));
  console.log(`   ✅ SYSTEM_ADMIN permitted: ${adminAuth.email}`);

  // MANAGER must be blocked (403)
  let mgrBlocked = false;
  try {
    await requireRole(USER_ROLES.SYSTEM_ADMIN, makeReq(tokenMgr));
  } catch (err: any) {
    if (err instanceof AuthError && err.statusCode === 403) {
      mgrBlocked = true;
      console.log("   ✅ MANAGER strictly blocked with 403 Forbidden");
    }
  }
  if (!mgrBlocked) throw new Error("Security breach: MANAGER was not blocked!");

  // RECEPTIONIST must be blocked (403)
  let receptBlocked = false;
  try {
    await requireRole(USER_ROLES.SYSTEM_ADMIN, makeReq(tokenRecept));
  } catch (err: any) {
    if (err instanceof AuthError && err.statusCode === 403) {
      receptBlocked = true;
      console.log("   ✅ RECEPTIONIST strictly blocked with 403 Forbidden");
    }
  }
  if (!receptBlocked) throw new Error("Security breach: RECEPTIONIST was not blocked!");

  // STAFF must be blocked (403)
  let staffBlocked = false;
  try {
    await requireRole(USER_ROLES.SYSTEM_ADMIN, makeReq(tokenStaff));
  } catch (err: any) {
    if (err instanceof AuthError && err.statusCode === 403) {
      staffBlocked = true;
      console.log("   ✅ STAFF strictly blocked with 403 Forbidden");
    }
  }
  if (!staffBlocked) throw new Error("Security breach: STAFF was not blocked!");

  // Unauthenticated request must be blocked (401)
  let unauthBlocked = false;
  try {
    await requireRole(USER_ROLES.SYSTEM_ADMIN, makeReq());
  } catch (err: any) {
    if (err instanceof AuthError && err.statusCode === 401) {
      unauthBlocked = true;
      console.log("   ✅ Unauthenticated request strictly blocked with 401 Unauthorized");
    }
  }
  if (!unauthBlocked) throw new Error("Security breach: Unauthenticated request was not blocked!");

  // ----------------------------------------------------
  // STEP 3: MODEL VALIDATION TESTS (Negative Prices, Negative Limits, Duplicate Names)
  // ----------------------------------------------------
  console.log("\n🛡️ 4. Testing Validation Rules (Negative Values, Limits & Duplicate Names)...");

  // A. Negative Monthly Price
  let negativePriceRejected = false;
  try {
    await SubscriptionPlan.create({
      name: "Test Plan Negative Price",
      monthlyPrice: -50,
      yearlyPrice: 500,
      maxRooms: 10,
      maxStaff: 5,
      maxReceptionists: 2,
    });
  } catch (err: any) {
    negativePriceRejected = true;
    console.log("   ✅ Negative monthlyPrice rejected by Mongoose validation");
  }
  if (!negativePriceRejected) throw new Error("Validation failure: Negative price was allowed!");

  // B. Negative Limits (< -1)
  let negativeLimitRejected = false;
  try {
    await SubscriptionPlan.create({
      name: "Test Plan Negative Limit",
      monthlyPrice: 50,
      yearlyPrice: 500,
      maxRooms: -5,
      maxStaff: 5,
      maxReceptionists: 2,
    });
  } catch (err: any) {
    negativeLimitRejected = true;
    console.log("   ✅ Invalid negative limit (maxRooms = -5) rejected");
  }
  if (!negativeLimitRejected) throw new Error("Validation failure: Invalid limit was allowed!");

  // C. Duplicate Plan Names
  await SubscriptionPlan.create({
    name: "Duplicate Test",
    monthlyPrice: 100,
    yearlyPrice: 1000,
    maxRooms: 20,
    maxStaff: 10,
    maxReceptionists: 2,
  });

  let duplicateNameRejected = false;
  try {
    await SubscriptionPlan.create({
      name: "Duplicate Test",
      monthlyPrice: 150,
      yearlyPrice: 1500,
      maxRooms: 30,
      maxStaff: 15,
      maxReceptionists: 4,
    });
  } catch (err: any) {
    duplicateNameRejected = true;
    console.log("   ✅ Duplicate plan name rejected by unique constraint");
  }
  if (!duplicateNameRejected) throw new Error("Validation failure: Duplicate plan name was allowed!");

  await SubscriptionPlan.deleteOne({ name: "Duplicate Test" });

  // ----------------------------------------------------
  // STEP 4: CREATE BASIC, PROFESSIONAL, ENTERPRISE PLANS
  // ----------------------------------------------------
  console.log("\n📦 5. Creating Standard Tier Plans (Basic, Professional, Enterprise)...");

  // 1. Basic Plan
  const basicPlan = await SubscriptionPlan.create({
    name: "Basic",
    description: "Ideal for boutique hotels and bed & breakfasts getting started.",
    monthlyPrice: 49,
    yearlyPrice: 490,
    maxRooms: 20,
    maxStaff: 5,
    maxReceptionists: 2,
    features: ["booking", "billing"],
    status: "ACTIVE",
  });
  console.log(`   ✓ [1/3] Created 'Basic': $${basicPlan.monthlyPrice}/mo, Rooms: ${basicPlan.maxRooms}, Staff: ${basicPlan.maxStaff}, Receptionists: ${basicPlan.maxReceptionists}, Features: [${basicPlan.features.join(", ")}]`);

  // 2. Professional Plan
  const proPlan = await SubscriptionPlan.create({
    name: "Professional",
    description: "Comprehensive management suite for mid-sized hotels and resorts.",
    monthlyPrice: 149,
    yearlyPrice: 1490,
    maxRooms: 80,
    maxStaff: 30,
    maxReceptionists: 8,
    features: ["booking", "billing", "roomService", "reports"],
    status: "ACTIVE",
  });
  console.log(`   ✓ [2/3] Created 'Professional': $${proPlan.monthlyPrice}/mo, Rooms: ${proPlan.maxRooms}, Staff: ${proPlan.maxStaff}, Receptionists: ${proPlan.maxReceptionists}, Features: [${proPlan.features.join(", ")}]`);

  // 3. Enterprise Plan (Unlimited representations with -1)
  const enterprisePlan = await SubscriptionPlan.create({
    name: "Enterprise",
    description: "Full-scale multi-property hotel chains with unlimited capacities.",
    monthlyPrice: 399,
    yearlyPrice: 3990,
    maxRooms: -1, // Unlimited
    maxStaff: -1, // Unlimited
    maxReceptionists: -1, // Unlimited
    features: ["booking", "billing", "roomService", "reports", "analytics", "24/7 Dedicated Support", "Custom API Access"],
    status: "ACTIVE",
  });
  console.log(`   ✓ [3/3] Created 'Enterprise': $${enterprisePlan.monthlyPrice}/mo, Rooms: Unlimited (${enterprisePlan.maxRooms}), Staff: Unlimited (${enterprisePlan.maxStaff}), Receptionists: Unlimited (${enterprisePlan.maxReceptionists}), Features: [${enterprisePlan.features.join(", ")}]`);

  // ----------------------------------------------------
  // STEP 5: VERIFY IN ADMIN DASHBOARD / QUERIES
  // ----------------------------------------------------
  console.log("\n📊 6. Verifying Plans List in Database & API Queries...");

  const allPlans = await SubscriptionPlan.find({
    name: { $in: ["Basic", "Professional", "Enterprise"] },
  }).sort({ monthlyPrice: 1 });

  if (allPlans.length !== 3) {
    throw new Error(`Expected 3 plans, found ${allPlans.length}`);
  }

  allPlans.forEach((p) => {
    const roomStr = p.maxRooms === -1 ? "Unlimited (∞)" : `${p.maxRooms} rooms`;
    const staffStr = p.maxStaff === -1 ? "Unlimited (∞)" : `${p.maxStaff} staff`;
    const recepStr = p.maxReceptionists === -1 ? "Unlimited (∞)" : `${p.maxReceptionists} receptionists`;
    console.log(`   📋 Tier [${p.name}] - $${p.monthlyPrice}/mo ($${p.yearlyPrice}/yr) | Limits: ${roomStr}, ${staffStr}, ${recepStr} | Status: ${p.status} | Features: ${p.features.length}`);
  });

  // ----------------------------------------------------
  // STEP 6: TEST EDITING & STATUS TOGGLE (ACTIVATE / DEACTIVATE)
  // ----------------------------------------------------
  console.log("\n🔄 7. Testing Plan Update & Deactivation / Reactivation...");

  // Deactivate Basic
  basicPlan.status = "INACTIVE";
  await basicPlan.save();
  console.log(`   ✓ Basic Plan status updated: ${basicPlan.status} (Deactivated)`);

  // Reactivate Basic
  basicPlan.status = "ACTIVE";
  basicPlan.description = "Updated description for Basic tier.";
  await basicPlan.save();
  console.log(`   ✓ Basic Plan status updated: ${basicPlan.status} (Reactivated) & Description updated`);

  console.log("\n================================================================");
  console.log("🎉 ALL PHASE 3 TESTS PASSED! SUBSCRIPTION PLANS VERIFIED! ✅");
  console.log("================================================================\n");

  process.exit(0);
}

runPhase3Tests().catch((err) => {
  console.error("\n❌ Phase 3 test suite encountered an error:", err);
  process.exit(1);
});
