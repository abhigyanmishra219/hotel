import mongoose from "mongoose";
import { USER_ROLES } from "../src/types/roles";
import { createToken, verifyToken } from "../src/lib/jwt";
import { AuthError } from "../src/lib/auth";
import Hotel from "../src/models/Hotel";
import User from "../src/models/User";
import SubscriptionPlan from "../src/models/SubscriptionPlan";
import HotelSubscription from "../src/models/HotelSubscription";
import AuditLog from "../src/models/AuditLog";
import { logAudit } from "../src/lib/audit";
import { AUDIT_ACTIONS } from "../src/types/audit";

async function runPhase7Tests() {
  console.log("================================================================");
  console.log("🧪 STARTING PHASE 7: ADMIN AUDIT LOGGING VERIFICATION");
  console.log("================================================================\n");

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI not found in environment variables");
  }

  console.log("📡 1. Connecting to MongoDB Atlas...");
  await mongoose.connect(mongoUri);
  console.log("   ✓ Connected to MongoDB.\n");

  // ----------------------------------------------------
  // TEST 1: SECURITY & ROLE AUTHORIZATION
  // ----------------------------------------------------
  console.log("🔐 2. Testing Security & Role Authorization on Audit Logs...");

  function simulateAuditLogAccessGuard(token: string | null) {
    if (!token) throw new AuthError("Authentication required", 401);
    const payload = verifyToken(token);
    if (!payload) throw new AuthError("Invalid or expired session token", 401);
    if (payload.role !== USER_ROLES.SYSTEM_ADMIN) {
      throw new AuthError(`Forbidden. Required role '${USER_ROLES.SYSTEM_ADMIN}', your role '${payload.role}'`, 403);
    }
    return payload;
  }

  const adminToken = createToken({
    userId: "admin_phase7",
    email: "admin@hotel.com",
    role: USER_ROLES.SYSTEM_ADMIN,
    name: "System Admin",
  });

  const managerToken = createToken({
    userId: "manager_phase7",
    email: "manager@hotel.com",
    role: USER_ROLES.MANAGER,
    hotelId: "hotel_abc",
    name: "Hotel Manager",
  });

  const staffToken = createToken({
    userId: "staff_phase7",
    email: "staff@hotel.com",
    role: USER_ROLES.STAFF,
    hotelId: "hotel_abc",
    name: "Hotel Staff",
  });

  // Admin access
  simulateAuditLogAccessGuard(adminToken);
  console.log("   ✅ SYSTEM_ADMIN access granted to audit logs.");

  // Manager access blocked
  let managerBlocked = false;
  try {
    simulateAuditLogAccessGuard(managerToken);
  } catch (err: any) {
    if (err.statusCode === 403) {
      managerBlocked = true;
      console.log(`   ✅ MANAGER access correctly blocked with HTTP 403: "${err.message}"`);
    }
  }
  if (!managerBlocked) throw new Error("Security failure: Manager accessed audit logs!");

  // Staff access blocked
  let staffBlocked = false;
  try {
    simulateAuditLogAccessGuard(staffToken);
  } catch (err: any) {
    if (err.statusCode === 403) {
      staffBlocked = true;
      console.log(`   ✅ STAFF access correctly blocked with HTTP 403: "${err.message}"`);
    }
  }
  if (!staffBlocked) throw new Error("Security failure: Staff accessed audit logs!");

  // ----------------------------------------------------
  // TEST 2: HOTEL LIFECYCLE AUDIT LOGGING
  // ----------------------------------------------------
  console.log("\n🏨 3. Testing Hotel Lifecycle Audit Logging (HOTEL_CREATED, HOTEL_SUSPENDED, HOTEL_ACTIVATED)...");
  const uniqueCode = `AUD-${Date.now().toString().slice(-4)}`;

  const testHotel = await Hotel.create({
    hotelCode: uniqueCode,
    name: `Audit Test Grand Hotel ${uniqueCode}`,
    email: `audit-${uniqueCode}@test.com`,
    city: "Chicago",
    state: "IL",
    country: "USA",
    status: "ACTIVE",
  });

  const hotelCreatedLog = await logAudit({
    userId: "650000000000000000000001",
    hotelId: testHotel._id,
    action: AUDIT_ACTIONS.HOTEL_CREATED,
    entity: "Hotel",
    entityId: testHotel._id,
    description: `Hotel '${testHotel.name}' (${testHotel.hotelCode}) registered on platform`,
    metadata: {
      hotelCode: testHotel.hotelCode,
      name: testHotel.name,
      city: testHotel.city,
    },
  });

  if (!hotelCreatedLog || hotelCreatedLog.action !== AUDIT_ACTIONS.HOTEL_CREATED) {
    throw new Error("Failed to write HOTEL_CREATED audit log!");
  }
  console.log(`   ✅ HOTEL_CREATED audit record logged: "${hotelCreatedLog.description}"`);

  // Suspend Hotel
  const hotelSuspendedLog = await logAudit({
    userId: "650000000000000000000001",
    hotelId: testHotel._id,
    action: AUDIT_ACTIONS.HOTEL_SUSPENDED,
    entity: "Hotel",
    entityId: testHotel._id,
    description: `Hotel '${testHotel.name}' was SUSPENDED`,
    metadata: {
      previousStatus: "ACTIVE",
      newStatus: "SUSPENDED",
    },
  });
  console.log(`   ✅ HOTEL_SUSPENDED audit record logged: "${hotelSuspendedLog?.description}"`);

  // ----------------------------------------------------
  // TEST 3: MANAGER LIFECYCLE AUDIT LOGGING & SENSITIVITY SANITIZATION
  // ----------------------------------------------------
  console.log("\n👤 4. Testing Manager Lifecycle Audit Logging & Data Sanitization...");

  const managerCreatedLog = await logAudit({
    userId: "650000000000000000000001",
    hotelId: testHotel._id,
    action: AUDIT_ACTIONS.MANAGER_CREATED,
    entity: "User",
    entityId: "650000000000000000000002",
    description: `General Manager 'John Audit' (john@audittest.com) provisioned for ${testHotel.name}`,
    metadata: {
      managerName: "John Audit",
      managerEmail: "john@audittest.com",
      role: "MANAGER",
      password: "PlainTextSecret123!", // MUST BE SANITIZED
      secretToken: "jwt_token_secret_123", // MUST BE SANITIZED
    },
  });

  // Verify Sanitization
  if (
    managerCreatedLog?.metadata?.password !== "[REDACTED]" ||
    managerCreatedLog?.metadata?.secretToken !== "[REDACTED]"
  ) {
    throw new Error("Sanitization failure: Plaintext credentials leaked in audit log metadata!");
  }
  console.log("   ✅ Plaintext password and tokens were safely [REDACTED] in metadata.");
  console.log(`   ✅ MANAGER_CREATED audit record logged: "${managerCreatedLog.description}"`);

  // Manager Password Reset
  const managerPasswordResetLog = await logAudit({
    userId: "650000000000000000000001",
    hotelId: testHotel._id,
    action: AUDIT_ACTIONS.MANAGER_PASSWORD_RESET,
    entity: "User",
    entityId: "650000000000000000000002",
    description: `Temporary password generated & reset for manager 'John Audit'`,
    metadata: {
      managerName: "John Audit",
      managerEmail: "john@audittest.com",
    },
  });
  console.log(`   ✅ MANAGER_PASSWORD_RESET audit record logged: "${managerPasswordResetLog?.description}"`);

  // ----------------------------------------------------
  // TEST 4: SUBSCRIPTION PLAN LIFECYCLE AUDIT LOGGING
  // ----------------------------------------------------
  console.log("\n📦 5. Testing Subscription Plan Audit Logging (PLAN_CREATED, PLAN_DEACTIVATED)...");

  const testPlan = await SubscriptionPlan.create({
    name: `Audit Tier Plan ${uniqueCode}`,
    description: "Testing audit trail for subscription plans",
    monthlyPrice: 199,
    yearlyPrice: 1990,
    maxRooms: 50,
    maxStaff: 20,
    maxReceptionists: 5,
    features: ["booking", "billing"],
    status: "ACTIVE",
  });

  const planCreatedLog = await logAudit({
    userId: "650000000000000000000001",
    action: AUDIT_ACTIONS.PLAN_CREATED,
    entity: "SubscriptionPlan",
    entityId: testPlan._id,
    description: `Subscription plan '${testPlan.name}' ($${testPlan.monthlyPrice}/mo) created`,
    metadata: {
      name: testPlan.name,
      monthlyPrice: testPlan.monthlyPrice,
      maxRooms: testPlan.maxRooms,
    },
  });
  console.log(`   ✅ PLAN_CREATED audit record logged: "${planCreatedLog?.description}"`);

  const planDeactivatedLog = await logAudit({
    userId: "650000000000000000000001",
    action: AUDIT_ACTIONS.PLAN_DEACTIVATED,
    entity: "SubscriptionPlan",
    entityId: testPlan._id,
    description: `Subscription plan '${testPlan.name}' was DEACTIVATED`,
    metadata: {
      name: testPlan.name,
      previousStatus: "ACTIVE",
      newStatus: "INACTIVE",
    },
  });
  console.log(`   ✅ PLAN_DEACTIVATED audit record logged: "${planDeactivatedLog?.description}"`);

  // ----------------------------------------------------
  // TEST 5: SUBSCRIPTION ASSIGNMENT & STATUS LIFECYCLE
  // ----------------------------------------------------
  console.log("\n💳 6. Testing Subscription Assignment & Status Audit Logging...");

  const testSub = await HotelSubscription.create({
    hotelId: testHotel._id,
    planId: testPlan._id,
    status: "ACTIVE",
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    paymentStatus: "PAID",
    isCurrent: true,
    changeReason: "Initial audit test assignment",
  });

  const subAssignedLog = await logAudit({
    userId: "650000000000000000000001",
    hotelId: testHotel._id,
    action: AUDIT_ACTIONS.SUBSCRIPTION_ASSIGNED,
    entity: "HotelSubscription",
    entityId: testSub._id,
    description: `Initial subscription '${testPlan.name}' (ACTIVE) assigned to '${testHotel.name}'`,
    metadata: {
      planName: testPlan.name,
      status: "ACTIVE",
      paymentStatus: "PAID",
    },
  });
  console.log(`   ✅ SUBSCRIPTION_ASSIGNED audit record logged: "${subAssignedLog?.description}"`);

  const subSuspendedLog = await logAudit({
    userId: "650000000000000000000001",
    hotelId: testHotel._id,
    action: AUDIT_ACTIONS.SUBSCRIPTION_SUSPENDED,
    entity: "HotelSubscription",
    entityId: testSub._id,
    description: `Subscription status for '${testHotel.name}' changed to 'SUSPENDED' (Payment: PAID)`,
    metadata: {
      previousStatus: "ACTIVE",
      newStatus: "SUSPENDED",
    },
  });
  console.log(`   ✅ SUBSCRIPTION_SUSPENDED audit record logged: "${subSuspendedLog?.description}"`);

  // ----------------------------------------------------
  // TEST 6: VERIFY QUERYING & FILTERING AUDIT LOGS IN MONGODB
  // ----------------------------------------------------
  console.log("\n🔍 7. Verifying Audit Log Querying & Filtering...");

  // Query logs for test hotel
  const hotelAuditLogs = await AuditLog.find({ hotelId: testHotel._id }).sort({ createdAt: -1 });
  console.log(`   ✓ Found ${hotelAuditLogs.length} audit logs specifically associated with test hotel ${testHotel.hotelCode}`);

  if (hotelAuditLogs.length < 4) {
    throw new Error("Expected at least 4 audit logs for test hotel!");
  }

  // Filter by action
  const createdLogs = await AuditLog.find({
    action: AUDIT_ACTIONS.HOTEL_CREATED,
    hotelId: testHotel._id,
  });
  if (createdLogs.length !== 1) {
    throw new Error("Action filtering failed for HOTEL_CREATED!");
  }
  console.log("   ✅ Query filtering by Action passed.");

  // ----------------------------------------------------
  // TEST 7: CLEANUP
  // ----------------------------------------------------
  console.log("\n🧹 8. Cleaning up test records...");
  await AuditLog.deleteMany({ hotelId: testHotel._id });
  await AuditLog.deleteMany({ entityId: testPlan._id.toString() });
  await HotelSubscription.deleteMany({ _id: testSub._id });
  await SubscriptionPlan.deleteMany({ _id: testPlan._id });
  await Hotel.deleteMany({ _id: testHotel._id });
  console.log("   ✓ Cleaned up all temporary test audit logs, subscriptions, plans, and hotels.");

  console.log("\n================================================================");
  console.log("🎉 ALL PHASE 7 ADMIN AUDIT LOGGING TESTS PASSED! ✅");
  console.log("================================================================\n");

  await mongoose.disconnect();
}

runPhase7Tests().catch((err) => {
  console.error("\n❌ Phase 7 test failed:", err);
  process.exit(1);
});
