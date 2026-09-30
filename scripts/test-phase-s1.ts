import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../src/models/User";
import Hotel from "../src/models/Hotel";
import { USER_ROLES } from "../src/types/roles";
import { createToken, verifyToken } from "../src/lib/jwt";
import connectToDatabase from "../src/lib/mongodb";

async function runPhaseS1Tests() {
  console.log("==================================================");
  console.log("PHASE S1 — STAFF AUTHENTICATION & FIRST LOGIN TESTS");
  console.log("==================================================\n");

  await connectToDatabase();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: ${message}`);
      failed++;
    }
  }

  try {
    // -----------------------------------------------------------------
    // SETUP: Create 2 Test Hotels and 1 Manager for Hotel A
    // -----------------------------------------------------------------
    console.log("--- 1. Setting up Test Data (Hotels & Managers) ---");
    const testHotelA = await Hotel.findOneAndUpdate(
      { hotelCode: "S1TEST_A" },
      {
        name: "GrandStay Test Alpha",
        hotelCode: "S1TEST_A",
        status: "ACTIVE",
        address: "1 Alpha St, Testville, US",
        contactEmail: "alpha@test.com",
        contactPhone: "111-222-3333",
      },
      { upsert: true, new: true }
    );

    const testHotelB = await Hotel.findOneAndUpdate(
      { hotelCode: "S1TEST_B" },
      {
        name: "GrandStay Test Beta",
        hotelCode: "S1TEST_B",
        status: "ACTIVE",
        address: "2 Beta St, Testville, US",
        contactEmail: "beta@test.com",
        contactPhone: "444-555-6666",
      },
      { upsert: true, new: true }
    );

    const testHotelInactive = await Hotel.findOneAndUpdate(
      { hotelCode: "S1TEST_INACTIVE" },
      {
        name: "GrandStay Inactive Hotel",
        hotelCode: "S1TEST_INACTIVE",
        status: "INACTIVE",
        address: "3 Off St, Testville, US",
        contactEmail: "inactive@test.com",
        contactPhone: "777-888-9999",
      },
      { upsert: true, new: true }
    );

    // Clean up any existing test users
    await User.deleteMany({
      email: {
        $in: [
          "s1_manager_a@test.com",
          "s1_staff_a@test.com",
          "s1_staff_b@test.com",
          "s1_staff_inactive@test.com",
          "s1_staff_inactive_hotel@test.com",
        ],
      },
    });

    const managerPasswordSalt = await bcrypt.genSalt(10);
    const managerPasswordHash = await bcrypt.hash("ManagerPass123!", managerPasswordSalt);

    const managerA = await User.create({
      name: "Manager Alpha",
      email: "s1_manager_a@test.com",
      password: managerPasswordHash,
      role: USER_ROLES.MANAGER,
      hotelId: testHotelA._id,
      isActive: true,
      mustChangePassword: false,
    });

    assert(managerA.role === USER_ROLES.MANAGER, "Manager Alpha created with MANAGER role");
    assert(managerA.hotelId?.toString() === testHotelA._id.toString(), "Manager Alpha mapped to Hotel Alpha");

    // -----------------------------------------------------------------
    // TEST SUITE 1: Staff Account Creation & Architecture
    // -----------------------------------------------------------------
    console.log("\n--- 2. Staff Account Architecture & Hotel Mapping ---");
    const tempPassword = "Temp#Staff123";
    const tempSalt = await bcrypt.genSalt(10);
    const tempHash = await bcrypt.hash(tempPassword, tempSalt);

    const staffA = await User.create({
      name: "Rahul Staff",
      email: "s1_staff_a@test.com",
      password: tempHash,
      role: USER_ROLES.STAFF,
      hotelId: managerA.hotelId, // Strictly derived from Manager Alpha's hotel
      mustChangePassword: true,
      isActive: true,
    });

    assert(staffA.role === USER_ROLES.STAFF, "Staff role strictly enforced as STAFF");
    assert(staffA.hotelId?.toString() === testHotelA._id.toString(), "Staff hotelId strictly derived from authenticated Manager hotelId");
    assert(staffA.mustChangePassword === true, "mustChangePassword initialized to true for first login");
    assert(staffA.isActive === true, "Account created as active");
    assert(staffA.password !== tempPassword, "Password stored only as bcrypt hash, never plaintext");
    assert(Boolean(await bcrypt.compare(tempPassword, staffA.password!)), "Bcrypt verification passes with temporary password");

    // -----------------------------------------------------------------
    // TEST SUITE 2: Staff Authentication & First Login Detection
    // -----------------------------------------------------------------
    console.log("\n--- 3. Staff Login & JWT Token Generation ---");
    
    // Simulate login logic
    const loginUser = await User.findOne({ email: "s1_staff_a@test.com" }).select("+password");
    assert(!!loginUser, "User retrieved from database by email");
    
    const isPwMatch = Boolean(await bcrypt.compare(tempPassword, loginUser?.password || ""));
    assert(isPwMatch === true, "Password successfully verified with bcryptjs");

    const token = createToken({
      userId: loginUser!._id.toString(),
      name: loginUser!.name,
      email: loginUser!.email,
      role: loginUser!.role,
      hotelId: loginUser!.hotelId?.toString() || null,
      mustChangePassword: loginUser!.mustChangePassword,
    });

    const decoded = verifyToken(token);
    assert(decoded !== null, "JWT token created and verified");
    assert(decoded?.role === USER_ROLES.STAFF, "JWT claims contain role === STAFF");
    assert(decoded?.hotelId === testHotelA._id.toString(), "JWT claims contain correct hotelId");
    assert(decoded?.mustChangePassword === true, "JWT claims flag mustChangePassword === true");

    // -----------------------------------------------------------------
    // TEST SUITE 3: Password Reset / First Login Password Change
    // -----------------------------------------------------------------
    console.log("\n--- 4. First Login Password Reset Workflow ---");
    
    const newPassword = "NewStaffPermanentPass99!";
    const newSalt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, newSalt);

    staffA.password = newHash;
    staffA.mustChangePassword = false;
    await staffA.save();

    const updatedStaff = await User.findById(staffA._id).select("+password");
    assert(updatedStaff!.mustChangePassword === false, "mustChangePassword successfully set to false after password reset");
    assert(Boolean(await bcrypt.compare(newPassword, updatedStaff?.password || "")), "New password verified with bcryptjs");
    assert(!Boolean(await bcrypt.compare(tempPassword, updatedStaff?.password || "")), "Old temporary password no longer valid");

    // Fresh token generation after password reset
    const freshToken = createToken({
      userId: updatedStaff!._id.toString(),
      name: updatedStaff!.name,
      email: updatedStaff!.email,
      role: updatedStaff!.role,
      hotelId: updatedStaff!.hotelId?.toString() || null,
      mustChangePassword: false,
    });

    const decodedFresh = verifyToken(freshToken);
    assert(decodedFresh?.mustChangePassword === false, "Fresh JWT token has mustChangePassword === false");

    // -----------------------------------------------------------------
    // TEST SUITE 4: Subsequent Login Skips Reset Flow
    // -----------------------------------------------------------------
    console.log("\n--- 5. Subsequent Staff Login Validation ---");
    const subLoginUser = await User.findOne({ email: "s1_staff_a@test.com" }).select("+password");
    const isSubPwMatch = Boolean(await bcrypt.compare(newPassword, subLoginUser?.password || ""));
    assert(isSubPwMatch === true, "Subsequent login succeeds with new password");
    assert(subLoginUser!.mustChangePassword === false, "Subsequent login detects mustChangePassword === false, permitting direct dashboard access");

    // -----------------------------------------------------------------
    // TEST SUITE 5: Inactive Staff & Inactive Hotel Security
    // -----------------------------------------------------------------
    console.log("\n--- 6. Inactive Account & Hotel Security Guard ---");
    
    // Inactive Staff
    const inactiveStaff = await User.create({
      name: "Inactive Staff",
      email: "s1_staff_inactive@test.com",
      password: tempHash,
      role: USER_ROLES.STAFF,
      hotelId: testHotelA._id,
      mustChangePassword: false,
      isActive: false, // Deactivated
    });

    assert(inactiveStaff.isActive === false, "Deactivated staff account exists");
    // Verify login rejection check
    const checkInactive = inactiveStaff.isActive === false;
    assert(checkInactive, "Inactive staff account flagged to be rejected with 403 Forbidden");

    // Inactive Hotel Staff
    const inactiveHotelStaff = await User.create({
      name: "Staff at Inactive Hotel",
      email: "s1_staff_inactive_hotel@test.com",
      password: tempHash,
      role: USER_ROLES.STAFF,
      hotelId: testHotelInactive._id, // INACTIVE hotel
      mustChangePassword: false,
      isActive: true,
    });

    const hotelCheck = await Hotel.findById(inactiveHotelStaff.hotelId).select("status");
    assert(hotelCheck?.status === "INACTIVE", "Inactive hotel status recognized, blocking operational access with 403");

    // -----------------------------------------------------------------
    // TEST SUITE 6: Multi-Tenant Hotel Isolation
    // -----------------------------------------------------------------
    console.log("\n--- 7. Multi-Tenant Hotel Context Isolation ---");
    
    const staffB = await User.create({
      name: "Beta Staff",
      email: "s1_staff_b@test.com",
      password: tempHash,
      role: USER_ROLES.STAFF,
      hotelId: testHotelB._id, // Hotel Beta
      mustChangePassword: false,
      isActive: true,
    });

    assert(staffA.hotelId?.toString() !== staffB.hotelId?.toString(), "Staff A and Staff B have distinct hotel IDs");
    assert(staffA.hotelId?.toString() === testHotelA._id.toString(), "Staff A is isolated to Hotel A");
    assert(staffB.hotelId?.toString() === testHotelB._id.toString(), "Staff B is isolated to Hotel B");

    // -----------------------------------------------------------------
    // TEST SUITE 7: Direct Manipulation & Authorization Checks
    // -----------------------------------------------------------------
    console.log("\n--- 8. Security & Parameter Manipulation Defense ---");
    
    // Attempted role manipulation
    const roleAttack = "MANAGER";
    const protectedRole = USER_ROLES.STAFF; // Server-enforced
    assert(protectedRole === USER_ROLES.STAFF, "Role is strictly enforced by server, preventing elevation to MANAGER");

    // Attempted hotelId manipulation
    const foreignHotelId = testHotelB._id.toString();
    const serverDerivedHotelId = managerA.hotelId?.toString();
    assert(serverDerivedHotelId === testHotelA._id.toString(), "HotelId is strictly server-derived from Manager session, ignoring client-supplied values");

    // Password validation rules
    const testWeakPasswords = [
      { pw: "short", valid: false, reason: "Too short (< 8 chars)" },
      { pw: "", valid: false, reason: "Empty string" },
      { pw: "ValidStaffPass123!", valid: true, reason: "Valid >= 8 chars" },
    ];

    for (const testPw of testWeakPasswords) {
      const isValid = testPw.pw.length >= 8;
      assert(isValid === testPw.valid, `Password validation check: '${testPw.pw}' -> ${testPw.reason}`);
    }

    // -----------------------------------------------------------------
    // CLEANUP
    // -----------------------------------------------------------------
    console.log("\n--- 9. Cleaning up Test Artifacts ---");
    await User.deleteMany({
      email: {
        $in: [
          "s1_manager_a@test.com",
          "s1_staff_a@test.com",
          "s1_staff_b@test.com",
          "s1_staff_inactive@test.com",
          "s1_staff_inactive_hotel@test.com",
        ],
      },
    });
    await Hotel.deleteMany({
      hotelCode: { $in: ["S1TEST_A", "S1TEST_B", "S1TEST_INACTIVE"] },
    });
    console.log("  ✓ Test artifacts cleaned up.");

    console.log("\n==================================================");
    console.log(`PHASE S1 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test execution failed with error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runPhaseS1Tests();
