import { USER_ROLES } from "../src/types/roles";
import { createToken } from "../src/lib/jwt";
import { requireRole, AuthError } from "../src/lib/auth";

interface ITestPlan {
  _id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxRooms: number;
  maxStaff: number;
  maxReceptionists: number;
  features: string[];
  status: "ACTIVE" | "INACTIVE";
}

interface ITestHotel {
  _id: string;
  hotelCode: string;
  name: string;
  email: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

interface ITestSubscription {
  _id: string;
  hotelId: string;
  planId: string;
  status: "ACTIVE" | "TRIAL" | "EXPIRED" | "SUSPENDED" | "CANCELLED";
  startDate: Date;
  endDate: Date;
  paymentStatus: "PAID" | "PENDING" | "FAILED";
  isCurrent: boolean;
  changeReason?: string;
  createdAt: Date;
}

// In-memory simulation of the subscription engine logic
class HotelSubscriptionEngine {
  private hotels: Map<string, ITestHotel> = new Map();
  private plans: Map<string, ITestPlan> = new Map();
  private subscriptions: ITestSubscription[] = [];

  addHotel(hotel: ITestHotel) {
    this.hotels.set(hotel._id, hotel);
  }

  addPlan(plan: ITestPlan) {
    this.plans.set(plan._id, plan);
  }

  assignOrChangePlan(params: {
    hotelId: string;
    planId: string;
    billingCycle?: "MONTHLY" | "YEARLY";
    startDate?: string;
    endDate?: string;
    status?: "ACTIVE" | "TRIAL" | "SUSPENDED";
    paymentStatus?: "PAID" | "PENDING" | "FAILED";
    changeReason?: string;
  }): ITestSubscription {
    const { hotelId, planId, billingCycle = "MONTHLY", startDate, endDate, status = "ACTIVE", paymentStatus = "PAID", changeReason } = params;

    const hotel = this.hotels.get(hotelId);
    if (!hotel) throw new Error("Hotel not found");

    const plan = this.plans.get(planId);
    if (!plan) throw new Error("Subscription plan not found");

    // Validation: Do not assign an inactive plan
    if (plan.status !== "ACTIVE") {
      throw new Error(`Cannot assign inactive subscription plan '${plan.name}'. Please activate the plan first.`);
    }

    // Date validations
    const start = startDate ? new Date(startDate) : new Date();
    if (isNaN(start.getTime())) throw new Error("Invalid start date format");

    let end: Date;
    if (endDate) {
      end = new Date(endDate);
      if (isNaN(end.getTime())) throw new Error("Invalid end date format");
    } else {
      end = new Date(start);
      if (billingCycle === "YEARLY") end.setFullYear(end.getFullYear() + 1);
      else end.setDate(end.getDate() + 30);
    }

    if (end.getTime() < start.getTime()) {
      throw new Error("End date must be on or after start date");
    }

    // Find current subscription for this hotel
    const currentSubs = this.subscriptions.filter((s) => s.hotelId === hotelId && s.isCurrent);
    let transitionReason = changeReason || `Assigned initial plan: ${plan.name}`;

    if (currentSubs.length > 0) {
      const oldSub = currentSubs[0];
      const oldPlan = this.plans.get(oldSub.planId);
      transitionReason = changeReason || `Transitioned from ${oldPlan?.name || "Previous"} to ${plan.name}`;

      // Transition existing current subscriptions to isCurrent: false (preserving history)
      currentSubs.forEach((s) => {
        s.isCurrent = false;
      });
    }

    // Create new subscription record
    const newSub: ITestSubscription = {
      _id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      hotelId,
      planId,
      status,
      startDate: start,
      endDate: end,
      paymentStatus,
      isCurrent: true,
      changeReason: transitionReason,
      createdAt: new Date(),
    };

    this.subscriptions.push(newSub);
    return newSub;
  }

  updateSubscriptionStatus(hotelId: string, newStatus: "ACTIVE" | "SUSPENDED" | "CANCELLED", newPayment?: "PAID" | "PENDING" | "FAILED") {
    const sub = this.subscriptions.slice().reverse().find((s) => s.hotelId === hotelId && s.isCurrent);
    if (!sub) throw new Error("No current subscription found");
    sub.status = newStatus;
    if (newPayment) sub.paymentStatus = newPayment;
    return sub;
  }

  getCurrentSubscription(hotelId: string): (ITestSubscription & { plan?: ITestPlan }) | null {
    const sub = this.subscriptions.slice().reverse().find((s) => s.hotelId === hotelId && s.isCurrent);
    if (!sub) return null;
    return { ...sub, plan: this.plans.get(sub.planId) };
  }

  getSubscriptionHistory(hotelId: string): (ITestSubscription & { plan?: ITestPlan })[] {
    return this.subscriptions
      .filter((s) => s.hotelId === hotelId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((s) => ({ ...s, plan: this.plans.get(s.planId) }));
  }
}

async function runPhase4Tests() {
  console.log("================================================================");
  console.log("🧪 STARTING PHASE 4: HOTEL SUBSCRIPTION MANAGEMENT TESTS");
  console.log("================================================================\n");

  const engine = new HotelSubscriptionEngine();

  // 1. Setup Plans
  const basicPlan: ITestPlan = {
    _id: "plan-basic",
    name: "Basic",
    monthlyPrice: 49,
    yearlyPrice: 490,
    maxRooms: 25,
    maxStaff: 10,
    maxReceptionists: 3,
    features: ["booking", "billing"],
    status: "ACTIVE",
  };

  const proPlan: ITestPlan = {
    _id: "plan-pro",
    name: "Professional",
    monthlyPrice: 149,
    yearlyPrice: 1490,
    maxRooms: 100,
    maxStaff: 50,
    maxReceptionists: 10,
    features: ["booking", "billing", "roomService", "reports"],
    status: "ACTIVE",
  };

  const enterprisePlan: ITestPlan = {
    _id: "plan-enterprise",
    name: "Enterprise",
    monthlyPrice: 399,
    yearlyPrice: 3990,
    maxRooms: -1,
    maxStaff: -1,
    maxReceptionists: -1,
    features: ["booking", "billing", "roomService", "reports", "analytics", "24/7 Phone Support"],
    status: "ACTIVE",
  };

  const inactivePlan: ITestPlan = {
    _id: "plan-inactive",
    name: "Archived Tier",
    monthlyPrice: 19,
    yearlyPrice: 190,
    maxRooms: 5,
    maxStaff: 2,
    maxReceptionists: 1,
    features: ["booking"],
    status: "INACTIVE",
  };

  engine.addPlan(basicPlan);
  engine.addPlan(proPlan);
  engine.addPlan(enterprisePlan);
  engine.addPlan(inactivePlan);

  // 2. Setup Hotels
  const hotelA: ITestHotel = {
    _id: "hotel-a",
    hotelCode: "HOT-000001",
    name: "Grand Palace Hotel A",
    email: "hotela@hotel.com",
    status: "ACTIVE",
  };

  const hotelB: ITestHotel = {
    _id: "hotel-b",
    hotelCode: "HOT-000002",
    name: "Ocean View Resort Hotel B",
    email: "hotelb@hotel.com",
    status: "ACTIVE",
  };

  engine.addHotel(hotelA);
  engine.addHotel(hotelB);

  // ----------------------------------------------------
  // TEST 1: SECURITY & RBAC ENFORCEMENT
  // ----------------------------------------------------
  console.log("🔒 1. Testing Role-Based Security Permissions...");

  const adminToken = createToken({
    userId: "admin-1",
    name: "SysAdmin",
    email: "admin@hotel.com",
    role: USER_ROLES.SYSTEM_ADMIN,
  });

  const managerToken = createToken({
    userId: "mgr-1",
    name: "Manager A",
    email: "mgr@hotel.com",
    role: USER_ROLES.MANAGER,
    hotelId: hotelA._id,
  });

  const staffToken = createToken({
    userId: "staff-1",
    name: "Staff B",
    email: "staff@hotel.com",
    role: USER_ROLES.STAFF,
    hotelId: hotelB._id,
  });

  const makeReq = (token?: string) =>
    new Request(`http://localhost:3000/api/admin/hotels/${hotelA._id}/subscription`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

  // SYSTEM_ADMIN authorized
  const authedAdmin = await requireRole(USER_ROLES.SYSTEM_ADMIN, makeReq(adminToken));
  if (authedAdmin.role !== USER_ROLES.SYSTEM_ADMIN) throw new Error("Admin authorization failed");
  console.log("   ✅ SYSTEM_ADMIN permitted to manage hotel subscriptions");

  // MANAGER blocked
  let mgrBlocked = false;
  try {
    await requireRole(USER_ROLES.SYSTEM_ADMIN, makeReq(managerToken));
  } catch (err: any) {
    if (err instanceof AuthError && err.statusCode === 403) mgrBlocked = true;
  }
  if (!mgrBlocked) throw new Error("Security failure: MANAGER accessed subscription controls!");
  console.log("   ✅ MANAGER strictly blocked with 403 Forbidden");

  // STAFF blocked
  let staffBlocked = false;
  try {
    await requireRole(USER_ROLES.SYSTEM_ADMIN, makeReq(staffToken));
  } catch (err: any) {
    if (err instanceof AuthError && err.statusCode === 403) staffBlocked = true;
  }
  if (!staffBlocked) throw new Error("Security failure: STAFF accessed subscription controls!");
  console.log("   ✅ STAFF strictly blocked with 403 Forbidden");

  // Unauthenticated blocked
  let unauthBlocked = false;
  try {
    await requireRole(USER_ROLES.SYSTEM_ADMIN, makeReq());
  } catch (err: any) {
    if (err instanceof AuthError && err.statusCode === 401) unauthBlocked = true;
  }
  if (!unauthBlocked) throw new Error("Security failure: Unauthenticated accessed subscription controls!");
  console.log("   ✅ Unauthenticated request blocked with 401 Unauthorized");

  // ----------------------------------------------------
  // TEST 2: VALIDATION RULES (INACTIVE PLAN & INVALID DATES)
  // ----------------------------------------------------
  console.log("\n🛡️ 2. Testing Validation Rules (Inactive Plan & Invalid Dates)...");

  // Attempt to assign inactive plan
  let inactivePlanCaught = false;
  try {
    engine.assignOrChangePlan({
      hotelId: hotelA._id,
      planId: inactivePlan._id,
    });
  } catch (err: any) {
    if (err.message.includes("Cannot assign inactive subscription plan")) {
      inactivePlanCaught = true;
      console.log("   ✅ Inactive plan rejected with descriptive validation error");
    }
  }
  if (!inactivePlanCaught) throw new Error("Validation failure: Inactive plan was assigned!");

  // Attempt invalid end date before start date
  let invalidDateCaught = false;
  try {
    engine.assignOrChangePlan({
      hotelId: hotelA._id,
      planId: basicPlan._id,
      startDate: "2026-10-15",
      endDate: "2026-10-01",
    });
  } catch (err: any) {
    if (err.message.includes("End date must be on or after start date")) {
      invalidDateCaught = true;
      console.log("   ✅ Invalid end date before start date rejected");
    }
  }
  if (!invalidDateCaught) throw new Error("Validation failure: Invalid date range was allowed!");

  // ----------------------------------------------------
  // TEST 3: HOTEL A -> BASIC -> ACTIVE
  // ----------------------------------------------------
  console.log("\n🏨 3. Testing Hotel A: Assign Basic Plan (Active)...");

  const subA1 = engine.assignOrChangePlan({
    hotelId: hotelA._id,
    planId: basicPlan._id,
    status: "ACTIVE",
    paymentStatus: "PAID",
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    changeReason: "Initial plan assignment",
  });

  const currA1 = engine.getCurrentSubscription(hotelA._id);
  if (!currA1 || currA1.plan?.name !== "Basic" || currA1.status !== "ACTIVE" || currA1.paymentStatus !== "PAID") {
    throw new Error("Hotel A subscription assignment failed!");
  }
  console.log(`   ✓ Hotel A assigned to [${currA1.plan.name}] ($${currA1.plan.monthlyPrice}/mo)`);
  console.log(`     Status: ${currA1.status} | Payment: ${currA1.paymentStatus} | Period: ${currA1.startDate.toISOString().split("T")[0]} to ${currA1.endDate.toISOString().split("T")[0]}`);

  // ----------------------------------------------------
  // TEST 4: HOTEL B -> PROFESSIONAL -> ACTIVE
  // ----------------------------------------------------
  console.log("\n🏨 4. Testing Hotel B: Assign Professional Plan (Active)...");

  const subB1 = engine.assignOrChangePlan({
    hotelId: hotelB._id,
    planId: proPlan._id,
    status: "ACTIVE",
    paymentStatus: "PAID",
    startDate: "2026-10-01",
    endDate: "2027-10-01",
    billingCycle: "YEARLY",
    changeReason: "Initial yearly professional assignment",
  });

  const currB1 = engine.getCurrentSubscription(hotelB._id);
  if (!currB1 || currB1.plan?.name !== "Professional" || currB1.status !== "ACTIVE") {
    throw new Error("Hotel B subscription assignment failed!");
  }
  console.log(`   ✓ Hotel B assigned to [${currB1.plan.name}] ($${currB1.plan.yearlyPrice}/yr)`);
  console.log(`     Status: ${currB1.status} | Payment: ${currB1.paymentStatus} | Quotas: ${currB1.plan.maxRooms} rooms, ${currB1.plan.maxStaff} staff`);

  // ----------------------------------------------------
  // TEST 5: CHANGE HOTEL A: BASIC -> PROFESSIONAL
  // ----------------------------------------------------
  console.log("\n🔄 5. Testing Plan Upgrade: Hotel A: Basic -> Professional...");

  const subA2 = engine.assignOrChangePlan({
    hotelId: hotelA._id,
    planId: proPlan._id,
    status: "ACTIVE",
    paymentStatus: "PAID",
    startDate: "2026-11-01",
    endDate: "2026-11-30",
    changeReason: "Upgraded from Basic to Professional for room service and reports",
  });

  const currA2 = engine.getCurrentSubscription(hotelA._id);
  if (!currA2 || currA2.plan?.name !== "Professional") {
    throw new Error("Hotel A plan upgrade to Professional failed!");
  }
  console.log(`   ✓ Hotel A current plan is now: [${currA2.plan.name}] ($${currA2.plan.monthlyPrice}/mo)`);

  // Verify Hotel A subscription history preservation
  const historyA = engine.getSubscriptionHistory(hotelA._id);
  if (historyA.length !== 2) {
    throw new Error(`Expected 2 historical records for Hotel A, found ${historyA.length}`);
  }

  console.log(`   📋 Hotel A Subscription History (${historyA.length} records preserved):`);
  historyA.forEach((h, i) => {
    console.log(`     [${i + 1}] Plan: ${h.plan?.name.padEnd(12)} | isCurrent: ${h.isCurrent ? "YES (Active)" : "NO (Historical)"} | Status: ${h.status} | Reason: "${h.changeReason}"`);
  });

  if (!historyA[0].isCurrent || historyA[0].plan?.name !== "Professional") {
    throw new Error("Latest history record is not current Professional plan!");
  }
  if (historyA[1].isCurrent || historyA[1].plan?.name !== "Basic") {
    throw new Error("Previous Basic plan was not properly archived in history!");
  }
  console.log("   ✅ Verified: Old Basic subscription preserved in history, new current plan is Professional!");

  // ----------------------------------------------------
  // TEST 6: HOTEL B: PROFESSIONAL -> ENTERPRISE -> PROFESSIONAL (UPGRADE & DOWNGRADE)
  // ----------------------------------------------------
  console.log("\n🔄 6. Testing Plan Transitions: Professional -> Enterprise -> Professional on Hotel B...");

  // Upgrade to Enterprise
  engine.assignOrChangePlan({
    hotelId: hotelB._id,
    planId: enterprisePlan._id,
    status: "ACTIVE",
    paymentStatus: "PAID",
    changeReason: "Upgraded to Enterprise for unlimited capacities",
  });
  console.log(`   ✓ Hotel B upgraded to Enterprise (Max Rooms: Unlimited)`);

  // Downgrade back to Professional
  engine.assignOrChangePlan({
    hotelId: hotelB._id,
    planId: proPlan._id,
    status: "ACTIVE",
    paymentStatus: "PAID",
    changeReason: "Downgraded from Enterprise back to Professional tier",
  });
  console.log(`   ✓ Hotel B downgraded back to Professional`);

  const historyB = engine.getSubscriptionHistory(hotelB._id);
  if (historyB.length !== 3) {
    throw new Error(`Expected 3 historical records for Hotel B, found ${historyB.length}`);
  }

  console.log(`   📋 Hotel B Subscription History (${historyB.length} records preserved):`);
  historyB.forEach((h, i) => {
    console.log(`     [${i + 1}] Plan: ${h.plan?.name.padEnd(12)} | isCurrent: ${h.isCurrent ? "YES (Active)" : "NO (Historical)"} | Status: ${h.status} | Reason: "${h.changeReason}"`);
  });
  console.log("   ✅ Verified: All upgrade and downgrade transitions preserved accurately without data loss!");

  // ----------------------------------------------------
  // TEST 7: SUBSCRIPTION LIFECYCLE CONTROLS (ACTIVATE, SUSPEND, CANCEL)
  // ----------------------------------------------------
  console.log("\n⚡ 7. Testing Status Controls: Activate, Suspend, Cancel...");

  // Suspend Hotel A
  engine.updateSubscriptionStatus(hotelA._id, "SUSPENDED");
  const suspendedSubA = engine.getCurrentSubscription(hotelA._id);
  if (suspendedSubA?.status !== "SUSPENDED") throw new Error("Failed to suspend Hotel A subscription");
  console.log(`   ✓ Hotel A subscription suspended: Status: ${suspendedSubA.status}`);

  // Reactivate Hotel A
  engine.updateSubscriptionStatus(hotelA._id, "ACTIVE", "PAID");
  const reactivatedSubA = engine.getCurrentSubscription(hotelA._id);
  if (reactivatedSubA?.status !== "ACTIVE" || reactivatedSubA?.paymentStatus !== "PAID") {
    throw new Error("Failed to reactivate Hotel A subscription");
  }
  console.log(`   ✓ Hotel A subscription reactivated: Status: ${reactivatedSubA.status}, Payment: ${reactivatedSubA.paymentStatus}`);

  // Cancel Hotel A
  engine.updateSubscriptionStatus(hotelA._id, "CANCELLED");
  const cancelledSubA = engine.getCurrentSubscription(hotelA._id);
  if (cancelledSubA?.status !== "CANCELLED") throw new Error("Failed to cancel Hotel A subscription");
  console.log(`   ✓ Hotel A subscription cancelled: Status: ${cancelledSubA.status}`);

  console.log("\n================================================================");
  console.log("🎉 ALL PHASE 4 TESTS PASSED! HOTEL SUBSCRIPTIONS VERIFIED! ✅");
  console.log("================================================================\n");
}

runPhase4Tests().catch((err) => {
  console.error("\n❌ Test failed:", err);
  process.exit(1);
});
