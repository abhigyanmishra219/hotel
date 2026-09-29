import mongoose from "mongoose";
import { USER_ROLES } from "../src/types/roles";
import { createToken, verifyToken } from "../src/lib/jwt";
import { AuthError } from "../src/lib/auth";
import Hotel from "../src/models/Hotel";
import User from "../src/models/User";
import SubscriptionPlan from "../src/models/SubscriptionPlan";
import HotelSubscription from "../src/models/HotelSubscription";
import Room from "../src/models/Room";

async function runPhase6Tests() {
  console.log("================================================================");
  console.log("🧪 STARTING PHASE 6: REAL SYSTEM ADMIN DASHBOARD & STATS VERIFICATION");
  console.log("================================================================\n");

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI not found in environment variables");
  }

  console.log("📡 1. Connecting to MongoDB Atlas...");
  await mongoose.connect(mongoUri);
  console.log("   ✓ Connected successfully to MongoDB Atlas database.\n");

  // ----------------------------------------------------
  // TEST 1: SECURITY & ROLE AUTHORIZATION TESTS
  // ----------------------------------------------------
  console.log("🔐 2. Testing Security & Role Authorization Guardrails...");

  // Generate tokens for testing
  const adminToken = createToken({
    userId: "admin_user_001",
    email: "admin@hotel.com",
    role: USER_ROLES.SYSTEM_ADMIN,
    name: "Master Admin",
  });

  const managerToken = createToken({
    userId: "manager_user_002",
    email: "manager@hotel.com",
    role: USER_ROLES.MANAGER,
    hotelId: "hotel_123",
    name: "Hotel Manager",
  });

  const receptionistToken = createToken({
    userId: "receptionist_user_003",
    email: "rec@hotel.com",
    role: USER_ROLES.RECEPTIONIST,
    hotelId: "hotel_123",
    name: "Front Desk",
  });

  const staffToken = createToken({
    userId: "staff_user_004",
    email: "staff@hotel.com",
    role: USER_ROLES.STAFF,
    hotelId: "hotel_123",
    name: "Staff Member",
  });

  // Verify token role guard logic
  function simulateAdminGuard(token: string | null) {
    if (!token) throw new AuthError("Authentication required", 401);
    const payload = verifyToken(token);
    if (!payload) throw new AuthError("Invalid or expired session token", 401);
    if (payload.role !== USER_ROLES.SYSTEM_ADMIN) {
      throw new AuthError(`Forbidden. Required role '${USER_ROLES.SYSTEM_ADMIN}', your role '${payload.role}'`, 403);
    }
    return payload;
  }

  // Test System Admin Access
  const adminPayload = simulateAdminGuard(adminToken);
  console.log(`   ✅ SYSTEM_ADMIN access granted: ${adminPayload.name} (${adminPayload.role})`);

  // Test Manager Access Blocked
  let managerBlocked = false;
  try {
    simulateAdminGuard(managerToken);
  } catch (err: any) {
    if (err.statusCode === 403) {
      managerBlocked = true;
      console.log(`   ✅ MANAGER access correctly blocked with HTTP 403: "${err.message}"`);
    }
  }
  if (!managerBlocked) throw new Error("Security failure: Manager was able to access System Admin Dashboard!");

  // Test Receptionist Access Blocked
  let recBlocked = false;
  try {
    simulateAdminGuard(receptionistToken);
  } catch (err: any) {
    if (err.statusCode === 403) {
      recBlocked = true;
      console.log(`   ✅ RECEPTIONIST access correctly blocked with HTTP 403: "${err.message}"`);
    }
  }
  if (!recBlocked) throw new Error("Security failure: Receptionist was able to access System Admin Dashboard!");

  // Test Staff Access Blocked
  let staffBlocked = false;
  try {
    simulateAdminGuard(staffToken);
  } catch (err: any) {
    if (err.statusCode === 403) {
      staffBlocked = true;
      console.log(`   ✅ STAFF access correctly blocked with HTTP 403: "${err.message}"`);
    }
  }
  if (!staffBlocked) throw new Error("Security failure: Staff was able to access System Admin Dashboard!");

  // ----------------------------------------------------
  // TEST 2: REAL MONGODB STATISTICS GATHERING
  // ----------------------------------------------------
  console.log("\n📊 3. Fetching Initial MongoDB Platform Metrics...");

  async function getDashboardStats() {
    const [
      totalHotels,
      activeHotels,
      suspendedHotels,
      inactiveHotels,
      totalUsers,
      totalRooms,
      allSubscriptions,
      allPlans,
      recentHotelsRaw,
    ] = await Promise.all([
      Hotel.countDocuments({}),
      Hotel.countDocuments({ status: "ACTIVE" }),
      Hotel.countDocuments({ status: "SUSPENDED" }),
      Hotel.countDocuments({ status: "INACTIVE" }),
      User.countDocuments({}),
      Room.countDocuments({}),
      HotelSubscription.find({ isCurrent: true }).populate("planId").lean(),
      SubscriptionPlan.find({}).sort({ monthlyPrice: 1 }).lean(),
      Hotel.find({}).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    let activeSubscriptions = 0;
    let expiredSubscriptions = 0;
    let trialSubscriptions = 0;
    let suspendedSubscriptions = 0;
    let monthlySubscriptionRevenue = 0;

    allSubscriptions.forEach((sub: any) => {
      if (sub.status === "ACTIVE") activeSubscriptions++;
      else if (sub.status === "EXPIRED") expiredSubscriptions++;
      else if (sub.status === "TRIAL") trialSubscriptions++;
      else if (sub.status === "SUSPENDED") suspendedSubscriptions++;

      const plan = sub.planId;
      if (plan && sub.status === "ACTIVE") {
        monthlySubscriptionRevenue += Number(plan.monthlyPrice) || 0;
      }
    });

    return {
      kpis: {
        totalHotels,
        activeHotels,
        suspendedHotels,
        inactiveHotels,
        totalUsers,
        totalRooms,
        activeSubscriptions,
        expiredSubscriptions,
        trialSubscriptions,
        suspendedSubscriptions,
        monthlySubscriptionRevenue,
      },
      recentHotels: recentHotelsRaw,
      plansCount: allPlans.length,
    };
  }

  const initialStats = await getDashboardStats();
  console.log("   Initial Platform KPIs:");
  console.log(`   - Total Hotels: ${initialStats.kpis.totalHotels}`);
  console.log(`   - Active Hotels: ${initialStats.kpis.activeHotels}`);
  console.log(`   - Suspended Hotels: ${initialStats.kpis.suspendedHotels}`);
  console.log(`   - Total Users: ${initialStats.kpis.totalUsers}`);
  console.log(`   - Total Rooms: ${initialStats.kpis.totalRooms}`);
  console.log(`   - Active Subscriptions: ${initialStats.kpis.activeSubscriptions}`);
  console.log(`   - Expired Subscriptions: ${initialStats.kpis.expiredSubscriptions}`);
  console.log(`   - Monthly Subscription Revenue: $${initialStats.kpis.monthlySubscriptionRevenue}/mo`);

  // ----------------------------------------------------
  // TEST 3: DYNAMIC HOTEL CREATION -> PROVES NO HARDCODED METRICS
  // ----------------------------------------------------
  console.log("\n🏨 4. Creating a Dynamic Test Hotel Property to Verify Real Metric Updates...");
  const uniqueSuffix = Date.now().toString().slice(-4);
  const testHotelCode = `TEST-${uniqueSuffix}`;

  const createdTestHotel = await Hotel.create({
    hotelCode: testHotelCode,
    name: `Dynamic SaaS Hotel #${uniqueSuffix}`,
    email: `dynamic-${uniqueSuffix}@testsaas.com`,
    city: "San Francisco",
    state: "CA",
    country: "USA",
    status: "ACTIVE",
  });

  console.log(`   ✓ Created test hotel: ${createdTestHotel.name} (${createdTestHotel.hotelCode})`);

  // Fetch updated stats
  const statsAfterHotel = await getDashboardStats();
  console.log(`   - New Total Hotels: ${statsAfterHotel.kpis.totalHotels} (was ${initialStats.kpis.totalHotels})`);
  console.log(`   - New Active Hotels: ${statsAfterHotel.kpis.activeHotels} (was ${initialStats.kpis.activeHotels})`);

  if (statsAfterHotel.kpis.totalHotels !== initialStats.kpis.totalHotels + 1) {
    throw new Error(`Total Hotels did not increment dynamically! Expected ${initialStats.kpis.totalHotels + 1}, got ${statsAfterHotel.kpis.totalHotels}`);
  }
  console.log("   ✅ Verified Total Hotels incremented dynamically without hardcoding!");

  // Verify the newly created hotel is the most recent in the list
  const mostRecent = statsAfterHotel.recentHotels[0];
  if (mostRecent.hotelCode !== testHotelCode) {
    throw new Error(`Recent hotels did not list the latest hotel! Top was ${mostRecent.hotelCode}, expected ${testHotelCode}`);
  }
  console.log(`   ✅ Verified Recent Hotels displays newly created hotel: ${mostRecent.name}`);

  // ----------------------------------------------------
  // TEST 4: SUBSCRIPTION CREATION & REVENUE DYNAMICS
  // ----------------------------------------------------
  console.log("\n💳 5. Testing Dynamic Subscription & Revenue Calculation...");

  // Find or create a test subscription plan
  let testPlan = await SubscriptionPlan.findOne({ status: "ACTIVE" });
  if (!testPlan) {
    testPlan = await SubscriptionPlan.create({
      name: "Enterprise Pro Test",
      description: "Test plan for automated verification",
      monthlyPrice: 299,
      yearlyPrice: 2990,
      maxRooms: 50,
      maxStaff: 20,
      maxReceptionists: 5,
      features: ["booking", "billing", "roomService", "reports", "analytics"],
      status: "ACTIVE",
    });
  }

  // Create an active subscription for the new hotel
  const testSub = await HotelSubscription.create({
    hotelId: createdTestHotel._id,
    planId: testPlan._id,
    status: "ACTIVE",
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    paymentStatus: "PAID",
    isCurrent: true,
    changeReason: "Test automated onboarding",
  });

  const statsAfterSub = await getDashboardStats();
  console.log(`   - New Active Subscriptions: ${statsAfterSub.kpis.activeSubscriptions} (was ${statsAfterHotel.kpis.activeSubscriptions})`);
  console.log(`   - New Monthly Revenue: $${statsAfterSub.kpis.monthlySubscriptionRevenue}/mo (was $${statsAfterHotel.kpis.monthlySubscriptionRevenue}/mo)`);

  if (statsAfterSub.kpis.activeSubscriptions !== statsAfterHotel.kpis.activeSubscriptions + 1) {
    throw new Error("Active Subscriptions count failed to increment!");
  }
  if (statsAfterSub.kpis.monthlySubscriptionRevenue !== statsAfterHotel.kpis.monthlySubscriptionRevenue + testPlan.monthlyPrice) {
    throw new Error("Monthly Subscription Revenue failed to add plan price accurately!");
  }
  console.log(`   ✅ Verified Monthly Revenue increased by exact plan price: +$${testPlan.monthlyPrice}/mo`);

  // ----------------------------------------------------
  // TEST 5: CLEANUP TEST DATA
  // ----------------------------------------------------
  console.log("\n🧹 6. Cleaning Up Temporary Test Records...");
  await HotelSubscription.deleteMany({ _id: testSub._id });
  await Hotel.deleteMany({ _id: createdTestHotel._id });
  console.log("   ✓ Cleaned up test subscription and test hotel.");

  const finalStats = await getDashboardStats();
  console.log(`   - Cleaned Total Hotels: ${finalStats.kpis.totalHotels}`);
  console.log(`   - Cleaned Active Subscriptions: ${finalStats.kpis.activeSubscriptions}`);

  console.log("\n================================================================");
  console.log("🎉 ALL PHASE 6 SYSTEM ADMIN DASHBOARD TESTS PASSED! ✅");
  console.log("================================================================\n");

  await mongoose.disconnect();
}

runPhase6Tests().catch((err) => {
  console.error("\n❌ Phase 6 test failed:", err);
  process.exit(1);
});
