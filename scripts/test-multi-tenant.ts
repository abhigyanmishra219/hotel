import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectToDatabase from "../src/lib/mongodb";
import Hotel from "../src/models/Hotel";
import User from "../src/models/User";
import { createToken, verifyToken } from "../src/lib/jwt";
import { USER_ROLES } from "../src/types/roles";
import {
  requireHotelAccess,
  getTenantScope,
  AuthError,
} from "../src/lib/auth";

async function runMultiTenantTests() {
  console.log("==================================================");
  console.log("🧪 STARTING MULTI-TENANT ARCHITECTURE TEST SUITE");
  console.log("==================================================\n");

  await connectToDatabase();
  console.log("✅ 1. Database connected successfully.");

  // Clean up any previous test entities
  const testHotelEmails = [
    "hotela_test@example.com",
    "hotelb_test@example.com",
  ];
  const testUserEmails = [
    "admin_test@example.com",
    "managera_test@example.com",
    "managerb_test@example.com",
    "invalid_manager_test@example.com",
  ];

  await Hotel.deleteMany({ email: { $in: testHotelEmails } });
  await User.deleteMany({ email: { $in: testUserEmails } });

  // ----------------------------------------------------
  // TEST 1: Create Hotel A and Hotel B
  // ----------------------------------------------------
  console.log("\n🏨 2. Testing Hotel Model & Auto-generated hotelCode...");

  const hotelA = await Hotel.create({
    name: "Grand Palace Hotel A",
    email: "hotela_test@example.com",
    city: "New York",
    country: "USA",
    status: "ACTIVE",
  });
  console.log(`   ✓ Created Hotel A: ${hotelA.name} | ID: ${hotelA._id} | Code: ${hotelA.hotelCode}`);

  const hotelB = await Hotel.create({
    name: "Ocean View Resort Hotel B",
    email: "hotelb_test@example.com",
    city: "Miami",
    country: "USA",
    status: "ACTIVE",
  });
  console.log(`   ✓ Created Hotel B: ${hotelB.name} | ID: ${hotelB._id} | Code: ${hotelB.hotelCode}`);

  if (!hotelA.hotelCode.startsWith("HOT-") || !hotelB.hotelCode.startsWith("HOT-")) {
    throw new Error("❌ Hotel code auto-generation failed!");
  }
  console.log("   ✅ Hotel model & unique human-readable code generation passed.");

  // ----------------------------------------------------
  // TEST 2: User Model Role-Based hotelId Validation
  // ----------------------------------------------------
  console.log("\n👤 3. Testing User Model Tenant Validation...");

  // Test: MANAGER without hotelId must FAIL
  let failedAsExpected = false;
  try {
    const passwordHash = await bcrypt.hash("password123", 10);
    await User.create({
      name: "Invalid Manager",
      email: "invalid_manager_test@example.com",
      password: passwordHash,
      role: USER_ROLES.MANAGER,
      hotelId: null, // Should fail
    });
  } catch (err: any) {
    failedAsExpected = true;
    console.log(`   ✓ Correctly rejected MANAGER with null hotelId (${err.message})`);
  }

  if (!failedAsExpected) {
    throw new Error("❌ Security violation: MANAGER created without hotelId!");
  }

  // Create System Admin (hotelId: null)
  const pwdAdmin = await bcrypt.hash("admin123", 10);
  const sysAdminUser = await User.create({
    name: "Platform System Admin",
    email: "admin_test@example.com",
    password: pwdAdmin,
    role: USER_ROLES.SYSTEM_ADMIN,
    hotelId: null,
  });
  console.log(`   ✓ Created System Admin: ${sysAdminUser.name} | hotelId: ${sysAdminUser.hotelId} (null allowed)`);

  // Create Manager A (Hotel A)
  const pwdMgrA = await bcrypt.hash("managerA123", 10);
  const managerA = await User.create({
    name: "Manager Alpha",
    email: "managera_test@example.com",
    password: pwdMgrA,
    role: USER_ROLES.MANAGER,
    hotelId: hotelA._id,
  });
  console.log(`   ✓ Created Manager A: ${managerA.name} → Assigned to Hotel A (${hotelA.hotelCode})`);

  // Create Manager B (Hotel B)
  const pwdMgrB = await bcrypt.hash("managerB123", 10);
  const managerB = await User.create({
    name: "Manager Beta",
    email: "managerb_test@example.com",
    password: pwdMgrB,
    role: USER_ROLES.MANAGER,
    hotelId: hotelB._id,
  });
  console.log(`   ✓ Created Manager B: ${managerB.name} → Assigned to Hotel B (${hotelB.hotelCode})`);

  // ----------------------------------------------------
  // TEST 3: JWT Generation & Verification
  // ----------------------------------------------------
  console.log("\n🔑 4. Testing JWT Tokens with Tenant Claims...");

  const adminToken = createToken({
    userId: sysAdminUser._id.toString(),
    name: sysAdminUser.name,
    email: sysAdminUser.email,
    role: sysAdminUser.role,
    hotelId: null,
  });
  const decodedAdmin = verifyToken(adminToken)!;
  console.log(`   ✓ Decoded Admin JWT: role=${decodedAdmin.role}, hotelId=${decodedAdmin.hotelId}`);

  const managerAToken = createToken({
    userId: managerA._id.toString(),
    name: managerA.name,
    email: managerA.email,
    role: managerA.role,
    hotelId: hotelA._id.toString(),
  });
  const decodedMgrA = verifyToken(managerAToken)!;
  console.log(`   ✓ Decoded Manager A JWT: role=${decodedMgrA.role}, hotelId=${decodedMgrA.hotelId}`);

  const managerBToken = createToken({
    userId: managerB._id.toString(),
    name: managerB.name,
    email: managerB.email,
    role: managerB.role,
    hotelId: hotelB._id.toString(),
  });
  const decodedMgrB = verifyToken(managerBToken)!;
  console.log(`   ✓ Decoded Manager B JWT: role=${decodedMgrB.role}, hotelId=${decodedMgrB.hotelId}`);

  // ----------------------------------------------------
  // TEST 4: Tenant Isolation & requireHotelAccess
  // ----------------------------------------------------
  console.log("\n🛡️ 5. Testing Tenant Isolation (requireHotelAccess)...");

  // Helper mock request builder
  const makeReq = (token: string) =>
    new Request("http://localhost:3000/api/test", {
      headers: { Authorization: `Bearer ${token}` },
    });

  // Test 4a: Manager A -> Hotel A
  try {
    await requireHotelAccess(hotelA._id.toString(), makeReq(managerAToken));
    console.log("   ✅ Manager A → Hotel A: ACCESS GRANTED (Expected)");
  } catch (err: any) {
    throw new Error(`❌ Manager A should have access to Hotel A! ${err.message}`);
  }

  // Test 4b: Manager A -> Hotel B (MUST BE DENIED)
  let mgrACrossDenied = false;
  try {
    await requireHotelAccess(hotelB._id.toString(), makeReq(managerAToken));
  } catch (err: any) {
    if (err instanceof AuthError && err.statusCode === 403) {
      mgrACrossDenied = true;
      console.log("   ❌ Manager A → Hotel B: ACCESS DENIED (403 Forbidden as expected)");
    }
  }
  if (!mgrACrossDenied) {
    throw new Error("❌ Security violation: Manager A was allowed to access Hotel B!");
  }

  // Test 4c: Manager B -> Hotel B
  try {
    await requireHotelAccess(hotelB._id.toString(), makeReq(managerBToken));
    console.log("   ✅ Manager B → Hotel B: ACCESS GRANTED (Expected)");
  } catch (err: any) {
    throw new Error(`❌ Manager B should have access to Hotel B! ${err.message}`);
  }

  // Test 4d: Manager B -> Hotel A (MUST BE DENIED)
  let mgrBCrossDenied = false;
  try {
    await requireHotelAccess(hotelA._id.toString(), makeReq(managerBToken));
  } catch (err: any) {
    if (err instanceof AuthError && err.statusCode === 403) {
      mgrBCrossDenied = true;
      console.log("   ❌ Manager B → Hotel A: ACCESS DENIED (403 Forbidden as expected)");
    }
  }
  if (!mgrBCrossDenied) {
    throw new Error("❌ Security violation: Manager B was allowed to access Hotel A!");
  }

  // Test 4e: System Admin -> Hotel A & Hotel B
  try {
    await requireHotelAccess(hotelA._id.toString(), makeReq(adminToken));
    console.log("   ✅ System Admin → Hotel A: ACCESS GRANTED (Platform Admin)");

    await requireHotelAccess(hotelB._id.toString(), makeReq(adminToken));
    console.log("   ✅ System Admin → Hotel B: ACCESS GRANTED (Platform Admin)");
  } catch (err: any) {
    throw new Error(`❌ System Admin should have access to all hotels! ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 5: Frontend Parameter Tamper Resistance (getTenantScope)
  // ----------------------------------------------------
  console.log("\n🔒 6. Testing Frontend Query Parameter Tamper Resistance...");

  // Manager A sends malicious query trying to read Hotel B's records: ?hotelId=hotelB_id
  const maliciousScopeMgrA = getTenantScope(decodedMgrA, hotelB._id.toString());
  if (maliciousScopeMgrA.hotelId.toString() !== hotelA._id.toString()) {
    throw new Error("❌ Security failure: Frontend was able to override hotelId!");
  }
  console.log("   ✅ Malicious query param override rejected: Manager A query scoped strictly to Hotel A.");

  // Manager B sends malicious query trying to read Hotel A's records: ?hotelId=hotelA_id
  const maliciousScopeMgrB = getTenantScope(decodedMgrB, hotelA._id.toString());
  if (maliciousScopeMgrB.hotelId.toString() !== hotelB._id.toString()) {
    throw new Error("❌ Security failure: Frontend was able to override hotelId!");
  }
  console.log("   ✅ Malicious query param override rejected: Manager B query scoped strictly to Hotel B.");

  // System Admin can legitimately view specific hotel or all
  const adminScopeTarget = getTenantScope(decodedAdmin, hotelA._id.toString());
  const adminScopeAll = getTenantScope(decodedAdmin);
  console.log(`   ✓ System Admin target scope: hotelId=${adminScopeTarget.hotelId}`);
  console.log(`   ✓ System Admin global scope: ${JSON.stringify(adminScopeAll)}`);

  console.log("\n==================================================");
  console.log("🎉 ALL MULTI-TENANT TESTS PASSED SUCCESSFULLY! ✅");
  console.log("==================================================");

  process.exit(0);
}

runMultiTenantTests().catch((err) => {
  console.error("\n❌ Test suite encountered an error:", err);
  process.exit(1);
});
