import { AVAILABLE_FEATURES } from "../src/types/subscription";
import { USER_ROLES } from "../src/types/roles";
import { createToken, verifyToken } from "../src/lib/jwt";
import { requireRole, AuthError } from "../src/lib/auth";

// Validation helper replicating API logic
function validatePlanPayload(payload: any, existingNames: string[] = []) {
  const {
    name,
    monthlyPrice,
    yearlyPrice,
    maxRooms,
    maxStaff,
    maxReceptionists,
    features,
    status,
  } = payload;

  if (!name || typeof name !== "string" || !name.trim()) {
    throw new Error("Plan name is required");
  }

  const trimmedName = name.trim();
  if (existingNames.some((n) => n.toLowerCase() === trimmedName.toLowerCase())) {
    throw new Error(`A subscription plan with the name '${trimmedName}' already exists`);
  }

  const numMonthlyPrice = Number(monthlyPrice);
  if (isNaN(numMonthlyPrice) || numMonthlyPrice < 0) {
    throw new Error("Monthly price must be a non-negative number");
  }

  const numYearlyPrice = Number(yearlyPrice);
  if (isNaN(numYearlyPrice) || numYearlyPrice < 0) {
    throw new Error("Yearly price must be a non-negative number");
  }

  const parseLimit = (val: any, fieldName: string): number => {
    if (val === null || val === undefined || val === "" || val === -1 || val === "-1" || val === "unlimited" || val === "Unlimited") {
      return -1;
    }
    const num = Number(val);
    if (isNaN(num) || num < -1 || !Number.isInteger(num)) {
      throw new Error(`${fieldName} must be a non-negative whole number or -1 for unlimited`);
    }
    return num;
  };

  const parsedRooms = parseLimit(maxRooms, "Maximum Rooms");
  const parsedStaff = parseLimit(maxStaff, "Maximum Staff");
  const parsedReceptionists = parseLimit(maxReceptionists, "Maximum Receptionists");

  let sanitizedFeatures: string[] = [];
  if (Array.isArray(features)) {
    sanitizedFeatures = features
      .map((f: any) => String(f).trim())
      .filter((f: string) => f.length > 0);
  }

  const planStatus = status === "INACTIVE" ? "INACTIVE" : "ACTIVE";

  return {
    name: trimmedName,
    description: payload.description?.trim() || "",
    monthlyPrice: numMonthlyPrice,
    yearlyPrice: numYearlyPrice,
    maxRooms: parsedRooms,
    maxStaff: parsedStaff,
    maxReceptionists: parsedReceptionists,
    features: sanitizedFeatures,
    status: planStatus,
  };
}

async function runValidationAndSecurityTests() {
  console.log("================================================================");
  console.log("🧪 RUNNING PHASE 3 LOGIC, VALIDATION & SECURITY TEST SUITE");
  console.log("================================================================\n");

  // 1. Test JWT & RBAC
  console.log("🔒 1. Testing Role Authorization Rules...");
  const adminPayload = {
    userId: "admin123",
    name: "System Admin",
    email: "sysadmin@hotel.com",
    role: USER_ROLES.SYSTEM_ADMIN,
  };
  const managerPayload = {
    userId: "mgr123",
    name: "Hotel Manager",
    email: "manager@hotel.com",
    role: USER_ROLES.MANAGER,
    hotelId: "hotel123",
  };
  const receptPayload = {
    userId: "rec123",
    name: "Front Desk",
    email: "receptionist@hotel.com",
    role: USER_ROLES.RECEPTIONIST,
    hotelId: "hotel123",
  };
  const staffPayload = {
    userId: "staff123",
    name: "Cleaning Staff",
    email: "staff@hotel.com",
    role: USER_ROLES.STAFF,
    hotelId: "hotel123",
  };

  const adminToken = createToken(adminPayload);
  const managerToken = createToken(managerPayload);
  const receptToken = createToken(receptPayload);
  const staffToken = createToken(staffPayload);

  const makeReq = (token?: string) =>
    new Request("http://localhost:3000/api/admin/subscriptions/plans", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

  // Check SYSTEM_ADMIN passes
  const authedAdmin = await requireRole(USER_ROLES.SYSTEM_ADMIN, makeReq(adminToken));
  if (authedAdmin.role !== USER_ROLES.SYSTEM_ADMIN) throw new Error("Admin authorization failed");
  console.log("   ✅ SYSTEM_ADMIN role authorized for subscription plan administration");

  // Check MANAGER blocked
  let mgrBlocked = false;
  try {
    await requireRole(USER_ROLES.SYSTEM_ADMIN, makeReq(managerToken));
  } catch (err: any) {
    if (err instanceof AuthError && err.statusCode === 403) mgrBlocked = true;
  }
  if (!mgrBlocked) throw new Error("Security failure: MANAGER was not blocked!");
  console.log("   ✅ MANAGER strictly blocked (403 Forbidden)");

  // Check RECEPTIONIST blocked
  let receptBlocked = false;
  try {
    await requireRole(USER_ROLES.SYSTEM_ADMIN, makeReq(receptToken));
  } catch (err: any) {
    if (err instanceof AuthError && err.statusCode === 403) receptBlocked = true;
  }
  if (!receptBlocked) throw new Error("Security failure: RECEPTIONIST was not blocked!");
  console.log("   ✅ RECEPTIONIST strictly blocked (403 Forbidden)");

  // Check STAFF blocked
  let staffBlocked = false;
  try {
    await requireRole(USER_ROLES.SYSTEM_ADMIN, makeReq(staffToken));
  } catch (err: any) {
    if (err instanceof AuthError && err.statusCode === 403) staffBlocked = true;
  }
  if (!staffBlocked) throw new Error("Security failure: STAFF was not blocked!");
  console.log("   ✅ STAFF strictly blocked (403 Forbidden)");

  // Check unauthenticated blocked
  let unauthBlocked = false;
  try {
    await requireRole(USER_ROLES.SYSTEM_ADMIN, makeReq());
  } catch (err: any) {
    if (err instanceof AuthError && err.statusCode === 401) unauthBlocked = true;
  }
  if (!unauthBlocked) throw new Error("Security failure: Unauthenticated was not blocked!");
  console.log("   ✅ Unauthenticated request blocked (401 Unauthorized)");

  // 2. Test Negative Price Validations
  console.log("\n🛡️ 2. Testing Negative Price & Limit Validations...");

  let negativeMonthlyCaught = false;
  try {
    validatePlanPayload({
      name: "Bad Price Plan",
      monthlyPrice: -29,
      yearlyPrice: 290,
      maxRooms: 10,
      maxStaff: 5,
      maxReceptionists: 2,
    });
  } catch (err: any) {
    if (err.message.includes("Monthly price must be a non-negative number")) negativeMonthlyCaught = true;
  }
  if (!negativeMonthlyCaught) throw new Error("Failed to reject negative monthly price");
  console.log("   ✅ Negative monthlyPrice rejected");

  let negativeYearlyCaught = false;
  try {
    validatePlanPayload({
      name: "Bad Price Plan",
      monthlyPrice: 29,
      yearlyPrice: -290,
      maxRooms: 10,
      maxStaff: 5,
      maxReceptionists: 2,
    });
  } catch (err: any) {
    if (err.message.includes("Yearly price must be a non-negative number")) negativeYearlyCaught = true;
  }
  if (!negativeYearlyCaught) throw new Error("Failed to reject negative yearly price");
  console.log("   ✅ Negative yearlyPrice rejected");

  let invalidLimitCaught = false;
  try {
    validatePlanPayload({
      name: "Bad Limit Plan",
      monthlyPrice: 29,
      yearlyPrice: 290,
      maxRooms: -5,
      maxStaff: 5,
      maxReceptionists: 2,
    });
  } catch (err: any) {
    if (err.message.includes("Maximum Rooms must be a non-negative whole number")) invalidLimitCaught = true;
  }
  if (!invalidLimitCaught) throw new Error("Failed to reject negative limit (< -1)");
  console.log("   ✅ Negative limit (< -1) rejected");

  // 3. Test Duplicate Plan Name Validation
  console.log("\n🛡️ 3. Testing Duplicate Plan Name Validation...");
  const existingNames = ["Basic", "Professional", "Enterprise"];

  let duplicateCaught = false;
  try {
    validatePlanPayload(
      {
        name: "basic", // lowercase duplicate
        monthlyPrice: 49,
        yearlyPrice: 490,
        maxRooms: 20,
        maxStaff: 5,
        maxReceptionists: 2,
      },
      existingNames
    );
  } catch (err: any) {
    if (err.message.includes("already exists")) duplicateCaught = true;
  }
  if (!duplicateCaught) throw new Error("Failed to reject case-insensitive duplicate plan name");
  console.log("   ✅ Case-insensitive duplicate name 'basic' matching 'Basic' rejected");

  // 4. Test Creation of Basic, Professional, and Enterprise
  console.log("\n📦 4. Testing Creation of Basic, Professional, Enterprise Tiers...");

  const planStore: any[] = [];

  // Create Basic
  const basic = validatePlanPayload({
    name: "Basic",
    description: "Starter package for boutique hotels and B&Bs.",
    monthlyPrice: 49,
    yearlyPrice: 490,
    maxRooms: 25,
    maxStaff: 10,
    maxReceptionists: 3,
    features: ["booking", "billing"],
    status: "ACTIVE",
  });
  planStore.push(basic);
  console.log(`   ✓ Created Basic: $${basic.monthlyPrice}/mo, Limits: [Rooms: ${basic.maxRooms}, Staff: ${basic.maxStaff}, Receptionists: ${basic.maxReceptionists}], Features: [${basic.features.join(", ")}]`);

  // Create Professional
  const professional = validatePlanPayload({
    name: "Professional",
    description: "Complete management package for mid-scale luxury hotels.",
    monthlyPrice: 149,
    yearlyPrice: 1490,
    maxRooms: 100,
    maxStaff: 50,
    maxReceptionists: 10,
    features: ["booking", "billing", "roomService", "reports"],
    status: "ACTIVE",
  }, planStore.map(p => p.name));
  planStore.push(professional);
  console.log(`   ✓ Created Professional: $${professional.monthlyPrice}/mo, Limits: [Rooms: ${professional.maxRooms}, Staff: ${professional.maxStaff}, Receptionists: ${professional.maxReceptionists}], Features: [${professional.features.join(", ")}]`);

  // Create Enterprise with Unlimited (-1)
  const enterprise = validatePlanPayload({
    name: "Enterprise",
    description: "High-volume multi-property hotel chains with unlimited capacities.",
    monthlyPrice: 399,
    yearlyPrice: 3990,
    maxRooms: -1,
    maxStaff: "unlimited",
    maxReceptionists: null,
    features: ["booking", "billing", "roomService", "reports", "analytics", "24/7 Phone Support"],
    status: "ACTIVE",
  }, planStore.map(p => p.name));
  planStore.push(enterprise);
  console.log(`   ✓ Created Enterprise: $${enterprise.monthlyPrice}/mo, Limits: [Rooms: Unlimited (${enterprise.maxRooms}), Staff: Unlimited (${enterprise.maxStaff}), Receptionists: Unlimited (${enterprise.maxReceptionists})], Features: [${enterprise.features.join(", ")}]`);

  console.log("\n📊 5. Summary of Verified Tiers in Store:");
  planStore.forEach((p, idx) => {
    const r = p.maxRooms === -1 ? "Unlimited" : p.maxRooms;
    const s = p.maxStaff === -1 ? "Unlimited" : p.maxStaff;
    const rec = p.maxReceptionists === -1 ? "Unlimited" : p.maxReceptionists;
    console.log(`   [${idx + 1}] ${p.name.padEnd(14)} | $${p.monthlyPrice}/mo ($${p.yearlyPrice}/yr) | Limits: ${r} rooms / ${s} staff / ${rec} recep | Features: ${p.features.length} | Status: ${p.status}`);
  });

  console.log("\n================================================================");
  console.log("🎉 ALL VALIDATION & SECURITY TESTS PASSED! SYSTEM VERIFIED! ✅");
  console.log("================================================================\n");
}

runValidationAndSecurityTests().catch((err) => {
  console.error("\n❌ Test failed:", err);
  process.exit(1);
});
