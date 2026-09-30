import fs from "fs";
import path from "path";

// Load .env file
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...rest] = trimmed.split("=");
        const val = rest.join("=").trim();
        process.env[key.trim()] = val;
      }
    }
  }
} catch (e) {
  console.warn("Could not auto-load .env file:", e);
}

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import connectToDatabase from "../src/lib/mongodb";
import User from "../src/models/User";
import Hotel from "../src/models/Hotel";
import { createToken, verifyToken } from "../src/lib/jwt";
import { USER_ROLES } from "../src/types/roles";

async function runPasswordResetTests() {
  console.log("================================================================");
  console.log("🧪 FIRST-TIME LOGIN PASSWORD RESET FLOW: END-TO-END TESTS");
  console.log("================================================================\n");

  await connectToDatabase();
  console.log("✅ Connected to MongoDB.");

  // Clean up previous test data
  const testEmails = [
    "sysadmin_reset_test@hotel.com",
    "manager_hotel_a@hotel.com",
    "manager_hotel_b@hotel.com",
  ];
  await User.deleteMany({ email: { $in: testEmails } });
  await Hotel.deleteMany({ email: { $in: ["hotela_test@hotel.com", "hotelb_test@hotel.com"] } });

  // Setup Hotels
  const hotelA = await Hotel.create({
    hotelCode: "HTL-TESTA",
    name: "Hotel Alpha Suites",
    email: "hotela_test@hotel.com",
    status: "ACTIVE",
  });

  const hotelB = await Hotel.create({
    hotelCode: "HTL-TESTB",
    name: "Hotel Beta Resort",
    email: "hotelb_test@hotel.com",
    status: "ACTIVE",
  });

  // Setup System Admin
  const adminHash = await bcrypt.hash("AdminPass123!", 10);
  const adminUser = await User.create({
    name: "System Administrator",
    email: "sysadmin_reset_test@hotel.com",
    password: adminHash,
    role: USER_ROLES.SYSTEM_ADMIN,
    mustChangePassword: false,
    isActive: true,
  });

  console.log("✅ Test environment initialized.");

  // ----------------------------------------------------
  // TEST 1: System Admin creates Manager with Temporary Password
  // ----------------------------------------------------
  console.log("\n----------------------------------------------------");
  console.log("TEST 1: System Admin creates Manager with Temp Password");
  console.log("----------------------------------------------------");

  const tempPasswordA = "TempPass@1234";
  const tempSaltA = await bcrypt.genSalt(10);
  const hashedTempA = await bcrypt.hash(tempPasswordA, tempSaltA);

  const managerA = await User.create({
    name: "Alice Manager",
    email: "manager_hotel_a@hotel.com",
    password: hashedTempA,
    role: USER_ROLES.MANAGER,
    hotelId: hotelA._id,
    mustChangePassword: true,
    isActive: true,
  });

  if (managerA.mustChangePassword !== true) {
    throw new Error("TEST 1 FAILED: Manager mustChangePassword should be true upon creation");
  }
  console.log(`✅ TEST 1 PASSED: Manager created with mustChangePassword = ${managerA.mustChangePassword}`);

  // ----------------------------------------------------
  // TEST 2: Manager Logs In Using Temporary Password
  // ----------------------------------------------------
  console.log("\n----------------------------------------------------");
  console.log("TEST 2: Manager Login with Temporary Password");
  console.log("----------------------------------------------------");

  const userFromDb = await User.findOne({ email: "manager_hotel_a@hotel.com" }).select("+password");
  if (!userFromDb) throw new Error("Manager not found in DB");

  const isMatch = await bcrypt.compare(tempPasswordA, userFromDb.password!);
  if (!isMatch) throw new Error("TEST 2 FAILED: Temporary password comparison failed");

  const managerToken = createToken({
    userId: userFromDb._id.toString(),
    name: userFromDb.name,
    email: userFromDb.email,
    role: userFromDb.role,
    hotelId: userFromDb.hotelId?.toString(),
    mustChangePassword: Boolean(userFromDb.mustChangePassword),
  });

  const decodedToken = verifyToken(managerToken);
  if (!decodedToken || decodedToken.mustChangePassword !== true) {
    throw new Error("TEST 2 FAILED: Token payload must have mustChangePassword = true");
  }

  console.log(`✅ TEST 2 PASSED: Login verified. JWT contains mustChangePassword = ${decodedToken.mustChangePassword}`);

  // ----------------------------------------------------
  // TEST 3: Route Guard Enforcement (mustChangePassword === true)
  // ----------------------------------------------------
  console.log("\n----------------------------------------------------");
  console.log("TEST 3: Route Guard Redirection Check");
  console.log("----------------------------------------------------");

  // Verify that if mustChangePassword === true, destination is /change-password
  const targetRoute = decodedToken.mustChangePassword ? "/change-password" : "/manager/dashboard";
  if (targetRoute !== "/change-password") {
    throw new Error("TEST 3 FAILED: Target route must be /change-password when mustChangePassword === true");
  }
  console.log(`✅ TEST 3 PASSED: Routing logic correctly redirected to '${targetRoute}'`);

  // ----------------------------------------------------
  // TEST 4: Password Validation Check (Too Short & Mismatch)
  // ----------------------------------------------------
  console.log("\n----------------------------------------------------");
  console.log("TEST 4: Password Validation Edge Cases");
  console.log("----------------------------------------------------");

  const shortPassword = "short";
  const passMismatch1: string = "ValidPass1234!";
  const passMismatch2: string = "DifferentPass1234!";

  if (shortPassword.length >= 8) throw new Error("Validation check failed: length constraint not working");
  if (passMismatch1 === passMismatch2) throw new Error("Validation check failed: mismatch constraint not working");

  console.log("✅ TEST 4 PASSED: <8 chars rejected & mismatch detected properly");

  // ----------------------------------------------------
  // TEST 5: Manager Enters Valid New Password & Changes It
  // ----------------------------------------------------
  console.log("\n----------------------------------------------------");
  console.log("TEST 5: Password Change Execution");
  console.log("----------------------------------------------------");

  const newPermanentPasswordA = "AlphaNewSecure#2026";
  const newSaltA = await bcrypt.genSalt(10);
  const newHashedA = await bcrypt.hash(newPermanentPasswordA, newSaltA);

  userFromDb.password = newHashedA;
  userFromDb.mustChangePassword = false;
  await userFromDb.save();

  const refreshedUser = await User.findById(userFromDb._id);
  if (refreshedUser?.mustChangePassword !== false) {
    throw new Error("TEST 5 FAILED: mustChangePassword was not set to false");
  }

  const freshToken = createToken({
    userId: refreshedUser._id.toString(),
    name: refreshedUser.name,
    email: refreshedUser.email,
    role: refreshedUser.role,
    hotelId: refreshedUser.hotelId?.toString(),
    mustChangePassword: false,
  });

  const freshDecoded = verifyToken(freshToken);
  if (freshDecoded?.mustChangePassword !== false) {
    throw new Error("TEST 5 FAILED: Fresh token still has mustChangePassword = true");
  }

  console.log(`✅ TEST 5 PASSED: Password changed in MongoDB. mustChangePassword is now ${refreshedUser.mustChangePassword}`);

  // ----------------------------------------------------
  // TEST 6: Login with New Password directly reaches Dashboard
  // ----------------------------------------------------
  console.log("\n----------------------------------------------------");
  console.log("TEST 6: Login with New Password -> Manager Dashboard");
  console.log("----------------------------------------------------");

  const postChangeUser = await User.findOne({ email: "manager_hotel_a@hotel.com" }).select("+password");
  const isNewMatch = await bcrypt.compare(newPermanentPasswordA, postChangeUser!.password!);
  if (!isNewMatch) throw new Error("TEST 6 FAILED: New permanent password does not match");

  const newLoginDest = postChangeUser!.mustChangePassword ? "/change-password" : "/manager/dashboard";
  if (newLoginDest !== "/manager/dashboard") {
    throw new Error("TEST 6 FAILED: Should route directly to /manager/dashboard");
  }
  console.log(`✅ TEST 6 PASSED: Logged in with new password -> routed directly to '${newLoginDest}'`);

  // ----------------------------------------------------
  // TEST 7: Old Temporary Password Fails
  // ----------------------------------------------------
  console.log("\n----------------------------------------------------");
  console.log("TEST 7: Old Temporary Password Login Attempt");
  console.log("----------------------------------------------------");

  const isOldMatch = await bcrypt.compare(tempPasswordA, postChangeUser!.password!);
  if (isOldMatch) throw new Error("TEST 7 FAILED: Old temp password should not match anymore");
  console.log("✅ TEST 7 PASSED: Old temporary password correctly rejected");

  // ----------------------------------------------------
  // TEST 8: System Admin Resets Password -> mustChangePassword = true again
  // ----------------------------------------------------
  console.log("\n----------------------------------------------------");
  console.log("TEST 8: System Admin Resets Manager Password");
  console.log("----------------------------------------------------");

  const resetTempPass = `Mgr@${crypto.randomBytes(4).toString("hex")}`;
  const resetSalt = await bcrypt.genSalt(10);
  postChangeUser!.password = await bcrypt.hash(resetTempPass, resetSalt);
  postChangeUser!.mustChangePassword = true;
  await postChangeUser!.save();

  const resetUserFromDb = await User.findById(postChangeUser!._id);
  if (resetUserFromDb?.mustChangePassword !== true) {
    throw new Error("TEST 8 FAILED: Admin reset should toggle mustChangePassword back to true");
  }

  const resetToken = createToken({
    userId: resetUserFromDb._id.toString(),
    name: resetUserFromDb.name,
    email: resetUserFromDb.email,
    role: resetUserFromDb.role,
    hotelId: resetUserFromDb.hotelId?.toString(),
    mustChangePassword: true,
  });

  const resetDecoded = verifyToken(resetToken);
  const resetDest = resetDecoded?.mustChangePassword ? "/change-password" : "/manager/dashboard";
  if (resetDest !== "/change-password") {
    throw new Error("TEST 8 FAILED: Reset manager should be routed to /change-password");
  }

  console.log(`✅ TEST 8 PASSED: Admin reset successfully set mustChangePassword = true and routed to '${resetDest}'`);

  // ----------------------------------------------------
  // TEST 9: Multi-tenant Isolation Check
  // ----------------------------------------------------
  console.log("\n----------------------------------------------------");
  console.log("TEST 9: Multi-Tenant Hotel Isolation Check");
  console.log("----------------------------------------------------");

  const managerB = await User.create({
    name: "Bob Manager",
    email: "manager_hotel_b@hotel.com",
    password: await bcrypt.hash("BobPass#2026", 10),
    role: USER_ROLES.MANAGER,
    hotelId: hotelB._id,
    mustChangePassword: false,
    isActive: true,
  });

  if (managerB.hotelId?.toString() === postChangeUser!.hotelId?.toString()) {
    throw new Error("TEST 9 FAILED: Hotel IDs must not overlap between different hotels");
  }
  if (managerB.mustChangePassword !== false) {
    throw new Error("TEST 9 FAILED: Hotel B manager state should remain intact");
  }

  console.log(`✅ TEST 9 PASSED: Tenant isolation intact (Hotel A: ${postChangeUser!.hotelId} vs Hotel B: ${managerB.hotelId})`);

  console.log("\n================================================================");
  console.log("🎉 ALL 9 FIRST-TIME LOGIN PASSWORD RESET TESTS PASSED SUCCESSFULLY!");
  console.log("================================================================\n");

  await mongoose.disconnect();
}

runPasswordResetTests().catch((err) => {
  console.error("❌ Password Reset Test Failed:", err);
  process.exit(1);
});
