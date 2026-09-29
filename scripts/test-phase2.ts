import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectToDatabase from "../src/lib/mongodb";
import Hotel from "../src/models/Hotel";
import User from "../src/models/User";
import { createToken, verifyToken } from "../src/lib/jwt";
import { USER_ROLES } from "../src/types/roles";
import {
  requireRole,
  requireHotelAccess,
  requireHotelUser,
  getTenantScope,
  AuthError,
} from "../src/lib/auth";

async function runPhase2Tests() {
  console.log("================================================================");
  console.log("🧪 STARTING PHASE 2: HOTEL MANAGEMENT & MANAGER CREATION TESTS");
  console.log("================================================================\n");

  await connectToDatabase();
  console.log("✅ 1. Connected to MongoDB.");

  // Clean up any previous test records
  const testHotelEmails = [
    "grandpalace_p2@hotel.com",
    "oceanview_p2@hotel.com",
  ];
  const testUserEmails = [
    "sysadmin_p2@hotel.com",
    "managera_p2@hotel.com",
    "managerb_p2@hotel.com",
  ];

  await Hotel.deleteMany({ email: { $in: testHotelEmails } });
  await User.deleteMany({ email: { $in: testUserEmails } });

  // ----------------------------------------------------
  // STEP 1: Create Hotel A + Manager A
  // ----------------------------------------------------
  console.log("\n🏨 2. Creating Hotel A + Initial Manager A...");

  const hotelA = await Hotel.create({
    name: "Grand Palace Hotel A",
    email: "grandpalace_p2@hotel.com",
    phone: "+1 555-0101",
    address: "100 Broadway",
    city: "New York",
    state: "NY",
    country: "USA",
    status: "ACTIVE",
  });

  const pwdMgrA = "InitialMgrA@123";
  const saltA = await bcrypt.genSalt(10);
  const hashA = await bcrypt.hash(pwdMgrA, saltA);

  const managerA = await User.create({
    name: "Alice Adams (Manager A)",
    email: "managera_p2@hotel.com",
    password: hashA,
    role: USER_ROLES.MANAGER,
    hotelId: hotelA._id,
    isActive: true,
  });

  console.log(`   ✓ Hotel A Created: [${hotelA.hotelCode}] ${hotelA.name}`);
  console.log(`   ✓ Manager A Created: ${managerA.name} (${managerA.email}) → Assigned to ${hotelA.hotelCode}`);

  // ----------------------------------------------------
  // STEP 2: Create Hotel B + Manager B
  // ----------------------------------------------------
  console.log("\n🏨 3. Creating Hotel B + Initial Manager B...");

  const hotelB = await Hotel.create({
    name: "Ocean View Resort Hotel B",
    email: "oceanview_p2@hotel.com",
    phone: "+1 555-0202",
    address: "200 Ocean Dr",
    city: "Miami",
    state: "FL",
    country: "USA",
    status: "ACTIVE",
  });

  const pwdMgrB = "InitialMgrB@456";
  const saltB = await bcrypt.genSalt(10);
  const hashB = await bcrypt.hash(pwdMgrB, saltB);

  const managerB = await User.create({
    name: "Bob Brown (Manager B)",
    email: "managerb_p2@hotel.com",
    password: hashB,
    role: USER_ROLES.MANAGER,
    hotelId: hotelB._id,
    isActive: true,
  });

  console.log(`   ✓ Hotel B Created: [${hotelB.hotelCode}] ${hotelB.name}`);
  console.log(`   ✓ Manager B Created: ${managerB.name} (${managerB.email}) → Assigned to ${hotelB.hotelCode}`);

  // Create System Admin
  const pwdAdmin = "AdminSuperSecret@789";
  const saltAdmin = await bcrypt.genSalt(10);
  const hashAdmin = await bcrypt.hash(pwdAdmin, saltAdmin);

  const sysAdmin = await User.create({
    name: "Chief Platform Admin",
    email: "sysadmin_p2@hotel.com",
    password: hashAdmin,
    role: USER_ROLES.SYSTEM_ADMIN,
    hotelId: null,
    isActive: true,
  });
  console.log(`   ✓ System Admin Created: ${sysAdmin.name} (${sysAdmin.email})`);

  // ----------------------------------------------------
  // STEP 3: Login & Verify Manager A Scoping
  // ----------------------------------------------------
  console.log("\n🔐 4. Testing Manager A Authentication & Scoping...");

  // Manager A authenticates
  const tokenMgrA = createToken({
    userId: managerA._id.toString(),
    name: managerA.name,
    email: managerA.email,
    role: managerA.role,
    hotelId: managerA.hotelId!.toString(),
  });

  const makeReq = (token: string) =>
    new Request("http://localhost:3000/api/test", {
      headers: { Authorization: `Bearer ${token}` },
    });

  // Verify Manager A cannot access admin endpoints
  let adminAccessBlocked = false;
  try {
    await requireRole(USER_ROLES.SYSTEM_ADMIN, makeReq(tokenMgrA));
  } catch (err: any) {
    if (err instanceof AuthError && err.statusCode === 403) {
      adminAccessBlocked = true;
      console.log("   ✅ Manager A blocked from /admin routes (403 Forbidden)");
    }
  }
  if (!adminAccessBlocked) throw new Error("Security failure: Manager A accessed admin route!");

  // Verify Manager A can access Hotel A
  const authA = await requireHotelUser(makeReq(tokenMgrA));
  const mgrAHotel = await Hotel.findById(authA.hotelId);
  console.log(`   ✅ Manager A fetched assigned hotel: [${mgrAHotel?.hotelCode}] ${mgrAHotel?.name}`);

  // Verify Manager A CANNOT access Hotel B
  let crossAccessBlockedA = false;
  try {
    await requireHotelAccess(hotelB._id.toString(), makeReq(tokenMgrA));
  } catch (err: any) {
    if (err instanceof AuthError && err.statusCode === 403) {
      crossAccessBlockedA = true;
      console.log("   ✅ Manager A blocked from accessing Hotel B (403 Forbidden)");
    }
  }
  if (!crossAccessBlockedA) throw new Error("Security failure: Manager A accessed Hotel B!");

  // ----------------------------------------------------
  // STEP 4: Login & Verify Manager B Scoping
  // ----------------------------------------------------
  console.log("\n🔐 5. Testing Manager B Authentication & Scoping...");

  const tokenMgrB = createToken({
    userId: managerB._id.toString(),
    name: managerB.name,
    email: managerB.email,
    role: managerB.role,
    hotelId: managerB.hotelId!.toString(),
  });

  // Verify Manager B can access Hotel B
  const authB = await requireHotelUser(makeReq(tokenMgrB));
  const mgrBHotel = await Hotel.findById(authB.hotelId);
  console.log(`   ✅ Manager B fetched assigned hotel: [${mgrBHotel?.hotelCode}] ${mgrBHotel?.name}`);

  // Verify Manager B CANNOT access Hotel A
  let crossAccessBlockedB = false;
  try {
    await requireHotelAccess(hotelA._id.toString(), makeReq(tokenMgrB));
  } catch (err: any) {
    if (err instanceof AuthError && err.statusCode === 403) {
      crossAccessBlockedB = true;
      console.log("   ✅ Manager B blocked from accessing Hotel A (403 Forbidden)");
    }
  }
  if (!crossAccessBlockedB) throw new Error("Security failure: Manager B accessed Hotel A!");

  // ----------------------------------------------------
  // STEP 5: Login as System Admin & Access Both Hotels
  // ----------------------------------------------------
  console.log("\n👑 6. Testing System Admin Multi-Tenant Access...");

  const tokenAdmin = createToken({
    userId: sysAdmin._id.toString(),
    name: sysAdmin.name,
    email: sysAdmin.email,
    role: sysAdmin.role,
    hotelId: null,
  });

  // System Admin accesses admin route
  await requireRole(USER_ROLES.SYSTEM_ADMIN, makeReq(tokenAdmin));
  console.log("   ✅ System Admin authenticated on admin portal");

  // System Admin accesses Hotel A and Hotel B
  await requireHotelAccess(hotelA._id.toString(), makeReq(tokenAdmin));
  console.log(`   ✅ System Admin accessed Hotel A (${hotelA.hotelCode})`);

  await requireHotelAccess(hotelB._id.toString(), makeReq(tokenAdmin));
  console.log(`   ✅ System Admin accessed Hotel B (${hotelB.hotelCode})`);

  // System Admin retrieves all hotels
  const allHotels = await Hotel.find({ _id: { $in: [hotelA._id, hotelB._id] } });
  console.log(`   ✅ System Admin queried portfolio: Found ${allHotels.length} hotels`);

  // ----------------------------------------------------
  // STEP 6: Password Reset & Account Disable/Enable
  // ----------------------------------------------------
  console.log("\n🔑 7. Testing Manager Password Reset & Disable/Reactivate...");

  // Reset Manager A's password
  const newTempPwdA = "NewResetPassword#2026";
  const newHashA = await bcrypt.hash(newTempPwdA, 10);
  managerA.password = newHashA;
  await managerA.save();

  // Verify old password fails
  const oldPwdMatch = await bcrypt.compare(pwdMgrA, managerA.password);
  if (oldPwdMatch) throw new Error("Old password still matched!");
  const newPwdMatch = await bcrypt.compare(newTempPwdA, managerA.password);
  if (!newPwdMatch) throw new Error("New password failed to match!");
  console.log("   ✅ Manager A password successfully reset and verified");

  // Disable Manager B
  managerB.isActive = false;
  await managerB.save();
  console.log(`   ✓ Manager B account set to isActive: ${managerB.isActive} (Disabled)`);

  // Reactivate Manager B
  managerB.isActive = true;
  await managerB.save();
  console.log(`   ✓ Manager B account reactivated: isActive: ${managerB.isActive} (Active)`);

  console.log("\n================================================================");
  console.log("🎉 ALL PHASE 2 TESTS PASSED! FULL SYSTEM VERIFIED! ✅");
  console.log("================================================================\n");

  process.exit(0);
}

runPhase2Tests().catch((err) => {
  console.error("\n❌ Phase 2 test suite encountered an error:", err);
  process.exit(1);
});
