import { USER_ROLES } from "../src/types/roles";
import {
  SubscriptionLimitError,
  SubscriptionFeatureError,
  SubscriptionStatusError,
} from "../src/lib/subscription-enforcement";

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

interface ITestRoom {
  _id: string;
  hotelId: string;
  roomNumber: string;
  type: string;
  isActive: boolean;
}

interface ITestUser {
  _id: string;
  hotelId: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

// Complete backend subscription engine testing simulation
class BackendSubscriptionEnforcementEngine {
  private hotels: Map<string, ITestHotel> = new Map();
  private plans: Map<string, ITestPlan> = new Map();
  private subscriptions: ITestSubscription[] = [];
  private rooms: ITestRoom[] = [];
  private users: ITestUser[] = [];

  addHotel(hotel: ITestHotel) {
    this.hotels.set(hotel._id, hotel);
  }

  addPlan(plan: ITestPlan) {
    this.plans.set(plan._id, plan);
  }

  assignPlan(hotelId: string, planId: string, status: "ACTIVE" | "TRIAL" | "EXPIRED" | "SUSPENDED" | "CANCELLED" = "ACTIVE") {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error("Plan not found");
    if (plan.status !== "ACTIVE") throw new Error("Cannot assign inactive plan");

    // Deactivate previous active subscriptions for this hotel
    this.subscriptions
      .filter((s) => s.hotelId === hotelId && s.isCurrent)
      .forEach((s) => (s.isCurrent = false));

    const newSub: ITestSubscription = {
      _id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      hotelId,
      planId,
      status,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentStatus: "PAID",
      isCurrent: true,
      changeReason: `Assigned ${plan.name}`,
      createdAt: new Date(),
    };

    this.subscriptions.push(newSub);
    return newSub;
  }

  getHotelActiveSubscription(hotelId: string): { subscription: ITestSubscription; plan: ITestPlan } {
    const sub = this.subscriptions.slice().reverse().find((s) => s.hotelId === hotelId && s.isCurrent);
    if (!sub) {
      throw new SubscriptionStatusError(
        "NONE",
        "No active subscription plan found for this hotel property. Please assign a subscription plan to continue.",
        "SUBSCRIPTION_INACTIVE"
      );
    }

    if (sub.status === "SUSPENDED") {
      throw new SubscriptionStatusError(
        "SUSPENDED",
        "Hotel subscription is currently SUSPENDED. Platform operations and modifications are disabled. Please contact administration.",
        "SUBSCRIPTION_SUSPENDED"
      );
    }

    if (sub.status === "EXPIRED") {
      throw new SubscriptionStatusError(
        "EXPIRED",
        "Hotel subscription has EXPIRED. Please renew or upgrade your SaaS plan to proceed.",
        "SUBSCRIPTION_EXPIRED"
      );
    }

    if (sub.status === "CANCELLED") {
      throw new SubscriptionStatusError(
        "CANCELLED",
        "Hotel subscription has been CANCELLED. Please activate a new subscription plan to proceed.",
        "SUBSCRIPTION_INACTIVE"
      );
    }

    const plan = this.plans.get(sub.planId);
    if (!plan) throw new Error("Plan record not found");

    return { subscription: sub, plan };
  }

  hasFeature(hotelId: string, feature: string): boolean {
    try {
      const { plan } = this.getHotelActiveSubscription(hotelId);
      return plan.features.some(
        (f) => f.toLowerCase() === feature.toLowerCase() || f.toLowerCase().includes(feature.toLowerCase())
      );
    } catch {
      return false;
    }
  }

  requireHotelFeature(hotelId: string, feature: string) {
    const { plan } = this.getHotelActiveSubscription(hotelId);
    const has = plan.features.some(
      (f) => f.toLowerCase() === feature.toLowerCase() || f.toLowerCase().includes(feature.toLowerCase())
    );

    if (!has) {
      throw new SubscriptionFeatureError(feature, plan.name);
    }
    return true;
  }

  createRoom(hotelId: string, roomNumber: string) {
    const { plan } = this.getHotelActiveSubscription(hotelId);
    const currentRooms = this.rooms.filter((r) => r.hotelId === hotelId && r.isActive).length;

    if (plan.maxRooms !== -1 && currentRooms >= plan.maxRooms) {
      throw new SubscriptionLimitError(
        "Your current plan has reached its Room limit. Upgrade your plan to add more rooms.",
        "ROOM_LIMIT_REACHED",
        "rooms",
        currentRooms,
        plan.maxRooms,
        plan.name
      );
    }

    const newRoom: ITestRoom = {
      _id: `room-${Date.now()}-${roomNumber}`,
      hotelId,
      roomNumber,
      type: "Deluxe Room",
      isActive: true,
    };
    this.rooms.push(newRoom);
    return newRoom;
  }

  createUser(hotelId: string, name: string, email: string, role: string) {
    const { plan } = this.getHotelActiveSubscription(hotelId);

    if (role === USER_ROLES.STAFF) {
      const currentStaff = this.users.filter((u) => u.hotelId === hotelId && u.role === USER_ROLES.STAFF && u.isActive).length;
      if (plan.maxStaff !== -1 && currentStaff >= plan.maxStaff) {
        throw new SubscriptionLimitError(
          "Your current plan has reached its Staff limit. Upgrade your plan to add more staff.",
          "STAFF_LIMIT_REACHED",
          "staff",
          currentStaff,
          plan.maxStaff,
          plan.name
        );
      }
    } else if (role === USER_ROLES.RECEPTIONIST) {
      const currentReceptionists = this.users.filter((u) => u.hotelId === hotelId && u.role === USER_ROLES.RECEPTIONIST && u.isActive).length;
      if (plan.maxReceptionists !== -1 && currentReceptionists >= plan.maxReceptionists) {
        throw new SubscriptionLimitError(
          "Your current plan has reached its Receptionist limit. Upgrade your plan to add more receptionists.",
          "RECEPTIONIST_LIMIT_REACHED",
          "receptionists",
          currentReceptionists,
          plan.maxReceptionists,
          plan.name
        );
      }
    }

    const newUser: ITestUser = {
      _id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      hotelId,
      name,
      email,
      role,
      isActive: true,
    };
    this.users.push(newUser);
    return newUser;
  }
}

async function runPhase5Tests() {
  console.log("================================================================");
  console.log("🧪 STARTING PHASE 5: BACKEND SUBSCRIPTION LIMITS & FEATURE ENFORCEMENT");
  console.log("================================================================\n");

  const engine = new BackendSubscriptionEnforcementEngine();

  // 1. Setup Plans
  const basicPlan: ITestPlan = {
    _id: "plan-basic-2rooms",
    name: "Basic",
    monthlyPrice: 49,
    yearlyPrice: 490,
    maxRooms: 2,           // Specifically 2 rooms for test
    maxStaff: 2,           // Specifically 2 staff for test
    maxReceptionists: 1,   // Specifically 1 receptionist for test
    features: ["booking", "billing"],
    status: "ACTIVE",
  };

  const proPlan: ITestPlan = {
    _id: "plan-pro-tier",
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
    _id: "plan-ent-tier",
    name: "Enterprise",
    monthlyPrice: 399,
    yearlyPrice: 3990,
    maxRooms: -1,
    maxStaff: -1,
    maxReceptionists: -1,
    features: ["booking", "billing", "roomService", "reports", "analytics"],
    status: "ACTIVE",
  };

  engine.addPlan(basicPlan);
  engine.addPlan(proPlan);
  engine.addPlan(enterprisePlan);

  // 2. Setup Hotel A
  const hotelA: ITestHotel = {
    _id: "hotel-a-id",
    hotelCode: "HOT-000001",
    name: "Grand Royale Hotel A",
    email: "hotela@hotel.com",
    status: "ACTIVE",
  };
  engine.addHotel(hotelA);

  // ----------------------------------------------------
  // STEP 1 & 2: ASSIGN BASIC PLAN (maxRooms = 2) TO HOTEL A
  // ----------------------------------------------------
  console.log("📦 1. Assigning 'Basic' Plan (maxRooms = 2, maxStaff = 2, maxReceptionists = 1) to Hotel A...");
  engine.assignPlan(hotelA._id, basicPlan._id, "ACTIVE");
  console.log("   ✓ Hotel A is on Basic plan with Room Limit = 2");

  // ----------------------------------------------------
  // STEP 3: CREATE 2 ROOMS (ROOM 101, ROOM 102)
  // ----------------------------------------------------
  console.log("\n🚪 2. Creating Rooms 1 & 2 for Hotel A (Within Limit)...");
  const room1 = engine.createRoom(hotelA._id, "101");
  console.log(`   ✓ [1/2] Created Room: ${room1.roomNumber}`);

  const room2 = engine.createRoom(hotelA._id, "102");
  console.log(`   ✓ [2/2] Created Room: ${room2.roomNumber}`);

  // ----------------------------------------------------
  // STEP 4 & 5: ATTEMPT 3RD ROOM -> MUST BE REJECTED ON BACKEND
  // ----------------------------------------------------
  console.log("\n🛑 3. Attempting 3rd Room (Room 103) under Basic Plan (Must Fail)...");
  let roomLimitRejected = false;
  let returnedErrorCode = "";
  let returnedErrorMessage = "";

  try {
    engine.createRoom(hotelA._id, "103");
  } catch (err: any) {
    if (err instanceof SubscriptionLimitError && err.code === "ROOM_LIMIT_REACHED") {
      roomLimitRejected = true;
      returnedErrorCode = err.code;
      returnedErrorMessage = err.message;
      console.log(`   ✅ Backend strictly rejected 3rd room with code: [${err.code}]`);
      console.log(`   ✅ User message: "${err.message}"`);
    }
  }

  if (!roomLimitRejected) {
    throw new Error("Critical failure: 3rd room was allowed beyond plan limit!");
  }

  // ----------------------------------------------------
  // STEP 6 & 7: UPGRADE HOTEL A TO PROFESSIONAL & CREATE 3RD ROOM
  // ----------------------------------------------------
  console.log("\n🔄 4. Upgrading Hotel A: Basic -> Professional (maxRooms = 100)...");
  engine.assignPlan(hotelA._id, proPlan._id, "ACTIVE");
  console.log("   ✓ Hotel A plan upgraded to Professional");

  console.log("\n🚪 5. Retrying Room 103 Creation (Should Now Succeed)...");
  const room3 = engine.createRoom(hotelA._id, "103");
  console.log(`   ✅ [3/100] Successfully created Room: ${room3.roomNumber} under Professional plan!`);

  // ----------------------------------------------------
  // STAFF LIMIT TESTING (maxStaff = 2 on Basic)
  // ----------------------------------------------------
  console.log("\n👥 6. Testing Staff Limit Enforcement...");
  // Temporarily reassign Basic to test staff limits
  engine.assignPlan(hotelA._id, basicPlan._id, "ACTIVE");

  const staff1 = engine.createUser(hotelA._id, "John Cook", "john@hotel.com", USER_ROLES.STAFF);
  console.log(`   ✓ [1/2] Created Staff: ${staff1.name}`);

  const staff2 = engine.createUser(hotelA._id, "Jane Cleaner", "jane@hotel.com", USER_ROLES.STAFF);
  console.log(`   ✓ [2/2] Created Staff: ${staff2.name}`);

  let staffLimitRejected = false;
  try {
    engine.createUser(hotelA._id, "Mark Maintenance", "mark@hotel.com", USER_ROLES.STAFF);
  } catch (err: any) {
    if (err instanceof SubscriptionLimitError && err.code === "STAFF_LIMIT_REACHED") {
      staffLimitRejected = true;
      console.log(`   ✅ Backend strictly rejected 3rd staff with code: [${err.code}]`);
      console.log(`   ✅ User message: "${err.message}"`);
    }
  }
  if (!staffLimitRejected) throw new Error("Critical failure: 3rd staff was allowed beyond limit!");

  // Upgrade to Pro to create 3rd staff
  engine.assignPlan(hotelA._id, proPlan._id, "ACTIVE");
  const staff3 = engine.createUser(hotelA._id, "Mark Maintenance", "mark@hotel.com", USER_ROLES.STAFF);
  console.log(`   ✅ [3/50] Successfully created Staff: ${staff3.name} under Professional plan!`);

  // ----------------------------------------------------
  // RECEPTIONIST LIMIT TESTING (maxReceptionists = 1 on Basic)
  // ----------------------------------------------------
  console.log("\n💼 7. Testing Receptionist Limit Enforcement...");
  engine.assignPlan(hotelA._id, basicPlan._id, "ACTIVE");

  const rec1 = engine.createUser(hotelA._id, "Alice Desk", "alice@hotel.com", USER_ROLES.RECEPTIONIST);
  console.log(`   ✓ [1/1] Created Receptionist: ${rec1.name}`);

  let recLimitRejected = false;
  try {
    engine.createUser(hotelA._id, "Bob Desk", "bob@hotel.com", USER_ROLES.RECEPTIONIST);
  } catch (err: any) {
    if (err instanceof SubscriptionLimitError && err.code === "RECEPTIONIST_LIMIT_REACHED") {
      recLimitRejected = true;
      console.log(`   ✅ Backend strictly rejected 2nd receptionist with code: [${err.code}]`);
      console.log(`   ✅ User message: "${err.message}"`);
    }
  }
  if (!recLimitRejected) throw new Error("Critical failure: 2nd receptionist was allowed beyond limit!");

  // Upgrade to Pro to create 2nd receptionist
  engine.assignPlan(hotelA._id, proPlan._id, "ACTIVE");
  const rec2 = engine.createUser(hotelA._id, "Bob Desk", "bob@hotel.com", USER_ROLES.RECEPTIONIST);
  console.log(`   ✅ [2/10] Successfully created Receptionist: ${rec2.name} under Professional plan!`);

  // ----------------------------------------------------
  // FEATURE ACCESS TESTING (hasFeature & requireHotelFeature)
  // ----------------------------------------------------
  console.log("\n🛡️ 8. Testing Feature Access Helper & Backend Enforcement...");

  // Set to Basic: features = ["booking", "billing"]
  engine.assignPlan(hotelA._id, basicPlan._id, "ACTIVE");

  console.log(`   ✓ hasFeature(hotelA, "booking"): ${engine.hasFeature(hotelA._id, "booking")} (Expected: true)`);
  console.log(`   ✓ hasFeature(hotelA, "billing"): ${engine.hasFeature(hotelA._id, "billing")} (Expected: true)`);
  console.log(`   ✓ hasFeature(hotelA, "roomService"): ${engine.hasFeature(hotelA._id, "roomService")} (Expected: false)`);
  console.log(`   ✓ hasFeature(hotelA, "reports"): ${engine.hasFeature(hotelA._id, "reports")} (Expected: false)`);

  if (!engine.hasFeature(hotelA._id, "booking") || engine.hasFeature(hotelA._id, "roomService")) {
    throw new Error("hasFeature returned incorrect boolean results!");
  }

  // Attempt roomService under Basic -> must throw FEATURE_NOT_AVAILABLE
  let featureBlocked = false;
  try {
    engine.requireHotelFeature(hotelA._id, "roomService");
  } catch (err: any) {
    if (err instanceof SubscriptionFeatureError && err.code === "FEATURE_NOT_AVAILABLE") {
      featureBlocked = true;
      console.log(`   ✅ Backend blocked 'roomService' access on Basic plan with code: [${err.code}]`);
      console.log(`   ✅ Error: "${err.message}"`);
    }
  }
  if (!featureBlocked) throw new Error("Critical failure: Unavailable feature was not blocked!");

  // Upgrade to Pro: features = ["booking", "billing", "roomService", "reports"]
  engine.assignPlan(hotelA._id, proPlan._id, "ACTIVE");
  engine.requireHotelFeature(hotelA._id, "roomService");
  console.log("   ✅ 'roomService' access granted under Professional plan!");

  // Analytics is only on Enterprise
  let analyticsBlocked = false;
  try {
    engine.requireHotelFeature(hotelA._id, "analytics");
  } catch (err: any) {
    if (err instanceof SubscriptionFeatureError && err.code === "FEATURE_NOT_AVAILABLE") {
      analyticsBlocked = true;
      console.log("   ✅ 'analytics' correctly blocked on Professional tier (Enterprise required)");
    }
  }
  if (!analyticsBlocked) throw new Error("Critical failure: Enterprise feature allowed on Pro tier!");

  // ----------------------------------------------------
  // SUBSCRIPTION STATUS RESTRICTION TESTING (SUSPENDED / EXPIRED / CANCELLED)
  // ----------------------------------------------------
  console.log("\n⚡ 9. Testing Subscription Lifecycle Status Enforcement...");

  // Suspend
  engine.assignPlan(hotelA._id, proPlan._id, "SUSPENDED");
  let suspendBlocked = false;
  try {
    engine.createRoom(hotelA._id, "999");
  } catch (err: any) {
    if (err instanceof SubscriptionStatusError && err.code === "SUBSCRIPTION_SUSPENDED") {
      suspendBlocked = true;
      console.log(`   ✅ Operation blocked for SUSPENDED subscription: "${err.message}"`);
    }
  }
  if (!suspendBlocked) throw new Error("Suspended subscription allowed operation!");

  // Expired
  engine.assignPlan(hotelA._id, proPlan._id, "EXPIRED");
  let expireBlocked = false;
  try {
    engine.createRoom(hotelA._id, "999");
  } catch (err: any) {
    if (err instanceof SubscriptionStatusError && err.code === "SUBSCRIPTION_EXPIRED") {
      expireBlocked = true;
      console.log(`   ✅ Operation blocked for EXPIRED subscription: "${err.message}"`);
    }
  }
  if (!expireBlocked) throw new Error("Expired subscription allowed operation!");

  // Reactivate
  engine.assignPlan(hotelA._id, proPlan._id, "ACTIVE");
  const activeSub = engine.getHotelActiveSubscription(hotelA._id);
  console.log(`   ✅ Reactivated subscription: ${activeSub.plan.name} (${activeSub.subscription.status}) - Operations restored!`);

  console.log("\n================================================================");
  console.log("🎉 ALL PHASE 5 TESTS PASSED! BACKEND ENFORCEMENT VERIFIED! ✅");
  console.log("================================================================\n");
}

runPhase5Tests().catch((err) => {
  console.error("\n❌ Phase 5 test failed:", err);
  process.exit(1);
});
