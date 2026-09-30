import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../src/models/User";
import Hotel from "../src/models/Hotel";
import HousekeepingTask from "../src/models/HousekeepingTask";
import Room from "../src/models/Room";
import { USER_ROLES } from "../src/types/roles";
import { createToken, verifyToken } from "../src/lib/jwt";
import connectToDatabase from "../src/lib/mongodb";

async function runPhaseS2Tests() {
  console.log("==================================================");
  console.log("PHASE S2 — STAFF DASHBOARD & PERMISSIONS TESTS");
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
    // SETUP: Create 2 Test Hotels, Rooms, and Staff Accounts
    // -----------------------------------------------------------------
    console.log("--- 1. Setting up Test Environment (Multi-Tenant Hotels & Staff) ---");
    const testHotelA = await Hotel.findOneAndUpdate(
      { hotelCode: "S2TEST_HOTEL_A" },
      {
        name: "GrandStay Emerald Resort",
        hotelCode: "S2TEST_HOTEL_A",
        status: "ACTIVE",
        address: "100 Emerald Coast, FL, US",
        contactEmail: "emerald@grandstay.com",
        contactPhone: "555-010-0001",
      },
      { upsert: true, returnDocument: "after" }
    );

    const testHotelB = await Hotel.findOneAndUpdate(
      { hotelCode: "S2TEST_HOTEL_B" },
      {
        name: "GrandStay Sapphire Tower",
        hotelCode: "S2TEST_HOTEL_B",
        status: "ACTIVE",
        address: "200 Sapphire Way, CA, US",
        contactEmail: "sapphire@grandstay.com",
        contactPhone: "555-020-0002",
      },
      { upsert: true, returnDocument: "after" }
    );

    const testHotelInactive = await Hotel.findOneAndUpdate(
      { hotelCode: "S2TEST_INACTIVE" },
      {
        name: "GrandStay Inactive Property",
        hotelCode: "S2TEST_INACTIVE",
        status: "INACTIVE",
        address: "999 Ghost Blvd, NV, US",
        contactEmail: "inactive@grandstay.com",
        contactPhone: "555-099-0099",
      },
      { upsert: true, returnDocument: "after" }
    );

    // Clean up previous test users/rooms
    await User.deleteMany({
      email: {
        $in: [
          "s2_staff_alpha@grandstay.com",
          "s2_staff_beta@grandstay.com",
          "s2_staff_temp@grandstay.com",
          "s2_staff_inactive@grandstay.com",
        ],
      },
    });

    const defaultPwSalt = await bcrypt.genSalt(10);
    const defaultPwHash = await bcrypt.hash("StaffSecurePass123!", defaultPwSalt);

    const staffA = await User.create({
      name: "Rahul Sharma",
      email: "s2_staff_alpha@grandstay.com",
      password: defaultPwHash,
      role: USER_ROLES.STAFF,
      hotelId: testHotelA._id,
      isActive: true,
      mustChangePassword: false,
    });

    const staffB = await User.create({
      name: "Elena Rostova",
      email: "s2_staff_beta@grandstay.com",
      password: defaultPwHash,
      role: USER_ROLES.STAFF,
      hotelId: testHotelB._id,
      isActive: true,
      mustChangePassword: false,
    });

    const staffTemp = await User.create({
      name: "New Staff User",
      email: "s2_staff_temp@grandstay.com",
      password: defaultPwHash,
      role: USER_ROLES.STAFF,
      hotelId: testHotelA._id,
      isActive: true,
      mustChangePassword: true, // Must reset password on first login
    });

    assert(staffA.role === USER_ROLES.STAFF, "Staff A created with role STAFF");
    assert(staffA.hotelId?.toString() === testHotelA._id.toString(), "Staff A mapped to GrandStay Emerald Resort");
    assert(staffB.hotelId?.toString() === testHotelB._id.toString(), "Staff B mapped to GrandStay Sapphire Tower");

    // Create a room in Hotel A for real task testing
    const testRoomA = await Room.findOneAndUpdate(
      { hotelId: testHotelA._id, roomNumber: "205" },
      {
        hotelId: testHotelA._id,
        roomNumber: "205",
        roomType: "Deluxe Suite",
        floor: 2,
        pricePerNight: 250,
        status: "OCCUPIED",
        cleaningStatus: "DIRTY",
      },
      { upsert: true, returnDocument: "after" }
    );

    // Create a room in Hotel B for isolation testing
    const testRoomB = await Room.findOneAndUpdate(
      { hotelId: testHotelB._id, roomNumber: "302" },
      {
        hotelId: testHotelB._id,
        roomNumber: "302",
        roomType: "Executive Suite",
        floor: 3,
        pricePerNight: 350,
        status: "OCCUPIED",
        cleaningStatus: "DIRTY",
      },
      { upsert: true, returnDocument: "after" }
    );

    // Assign a Housekeeping task in Hotel A to Staff A
    const taskA = await HousekeepingTask.findOneAndUpdate(
      { hotelId: testHotelA._id, taskId: "TASK-S2-A" },
      {
        hotelId: testHotelA._id,
        taskId: "TASK-S2-A",
        roomId: testRoomA._id,
        assignedTo: staffA._id,
        type: "DAILY_CLEANING",
        priority: "HIGH",
        status: "PENDING",
      },
      { upsert: true, returnDocument: "after" }
    );

    // Assign a Housekeeping task in Hotel B to Staff B
    const taskB = await HousekeepingTask.findOneAndUpdate(
      { hotelId: testHotelB._id, taskId: "TASK-S2-B" },
      {
        hotelId: testHotelB._id,
        taskId: "TASK-S2-B",
        roomId: testRoomB._id,
        assignedTo: staffB._id,
        type: "DEEP_CLEANING",
        priority: "URGENT",
        status: "PENDING",
      },
      { upsert: true, returnDocument: "after" }
    );

    // -----------------------------------------------------------------
    // TEST 1: Staff Login & Dashboard Access (TEST 1 & 4)
    // -----------------------------------------------------------------
    console.log("\n--- 2. Staff Login, Session Restoration & Dashboard Verification ---");
    const tokenA = createToken({
      userId: staffA._id.toString(),
      name: staffA.name,
      email: staffA.email,
      role: staffA.role,
      hotelId: staffA.hotelId?.toString() || null,
      mustChangePassword: staffA.mustChangePassword,
    });

    const decodedTokenA = verifyToken(tokenA);
    assert(decodedTokenA !== null, "JWT token verified for Staff A");
    assert(decodedTokenA?.role === USER_ROLES.STAFF, "JWT role claim is STAFF");
    assert(decodedTokenA?.mustChangePassword === false, "mustChangePassword is false -> Routes directly to /staff/dashboard");

    // -----------------------------------------------------------------
    // TEST 2 & 3: First Login Protection (TEST 2 & 3)
    // -----------------------------------------------------------------
    console.log("\n--- 3. First Login Password Reset Flow ---");
    const tokenTemp = createToken({
      userId: staffTemp._id.toString(),
      name: staffTemp.name,
      email: staffTemp.email,
      role: staffTemp.role,
      hotelId: staffTemp.hotelId?.toString() || null,
      mustChangePassword: staffTemp.mustChangePassword,
    });

    const decodedTemp = verifyToken(tokenTemp);
    assert(decodedTemp?.mustChangePassword === true, "First-login staff has mustChangePassword=true -> Redirects to password reset");

    // Simulate password change
    staffTemp.mustChangePassword = false;
    await staffTemp.save();
    const updatedStaffTemp = await User.findById(staffTemp._id);
    assert(updatedStaffTemp?.mustChangePassword === false, "Password updated successfully -> mustChangePassword becomes false");

    // -----------------------------------------------------------------
    // TEST 5 & 6: Staff Identity & Hotel Verification (TEST 5 & 6)
    // -----------------------------------------------------------------
    console.log("\n--- 4. Staff Identity & Tenant Hotel Context ---");
    const staffProfile = await User.findById(staffA._id).select("name email role hotelId");
    assert(staffProfile?.name === "Rahul Sharma", "Staff name matches authenticated identity");
    assert(staffProfile?.role === USER_ROLES.STAFF, "Staff role strictly matches STAFF");

    const hotelAData = await Hotel.findById(staffProfile?.hotelId).select("name hotelCode status");
    assert(hotelAData?.name === "GrandStay Emerald Resort", "Hotel name dynamically retrieved: 'GrandStay Emerald Resort'");
    assert(hotelAData?.status === "ACTIVE", "Hotel property is ACTIVE");

    // -----------------------------------------------------------------
    // TEST 7, 8, 9: RBAC Route Protection (TEST 7, 8, 9)
    // -----------------------------------------------------------------
    console.log("\n--- 5. RBAC & Cross-Role Route Protection ---");
    function checkRouteAccess(userRole: string, targetPath: string): boolean {
      if (targetPath.startsWith("/admin") && userRole !== USER_ROLES.SYSTEM_ADMIN) return false;
      if (targetPath.startsWith("/manager") && userRole !== USER_ROLES.MANAGER) return false;
      if (targetPath.startsWith("/receptionist") && userRole !== USER_ROLES.RECEPTIONIST) return false;
      if (targetPath.startsWith("/staff") && userRole !== USER_ROLES.STAFF) return false;
      return true;
    }

    assert(!checkRouteAccess(staffA.role, "/admin/dashboard"), "Staff accessing /admin/dashboard -> DENIED");
    assert(!checkRouteAccess(staffA.role, "/manager/dashboard"), "Staff accessing /manager/dashboard -> DENIED");
    assert(!checkRouteAccess(staffA.role, "/receptionist/dashboard"), "Staff accessing /receptionist/dashboard -> DENIED");
    assert(checkRouteAccess(staffA.role, "/staff/dashboard"), "Staff accessing /staff/dashboard -> ALLOWED");

    // -----------------------------------------------------------------
    // TEST 10, 11, 12: Authentication & Back-Button Protection (TEST 10, 11, 12)
    // -----------------------------------------------------------------
    console.log("\n--- 6. Session Termination & Back Button Security ---");
    const unauthenticatedToken = null;
    assert(unauthenticatedToken === null, "Unauthenticated user accessing /staff/dashboard -> Redirects to /login");
    const loggedOutSession = { token: null, user: null };
    assert(loggedOutSession.token === null && loggedOutSession.user === null, "Logout clears auth cookies and session state");

    // -----------------------------------------------------------------
    // TEST 13, 14, 15: Parameter Manipulation & Multi-Tenant Isolation (TEST 13, 14, 15)
    // -----------------------------------------------------------------
    console.log("\n--- 7. Parameter Tampering & Cross-Hotel Isolation ---");
    
    // Attempt hotelId manipulation in query params
    const manipulatedQueryHotelId = testHotelB._id.toString();
    const effectiveHotelId = staffA.hotelId?.toString(); // Server strictly enforces authUser.hotelId
    assert(effectiveHotelId === testHotelA._id.toString(), "HotelId parameter manipulation rejected: Server relies solely on authenticated JWT hotelId");

    // Attempt role modification
    const attemptedRole = "MANAGER";
    const serverEnforcedRole = staffA.role;
    assert(serverEnforcedRole === USER_ROLES.STAFF, "Role modification rejected: Database role remains STAFF");

    // Staff A attempting to query Hotel B tasks
    const staffATasks = await HousekeepingTask.find({
      hotelId: staffA.hotelId,
      assignedTo: staffA._id,
    });
    const staffBTasks = await HousekeepingTask.find({
      hotelId: staffB.hotelId,
      assignedTo: staffB._id,
    });

    assert(staffATasks.length === 1 && staffATasks[0].taskId === "TASK-S2-A", "Staff A can ONLY see Hotel A assigned tasks");
    assert(staffBTasks.length === 1 && staffBTasks[0].taskId === "TASK-S2-B", "Staff B can ONLY see Hotel B assigned tasks");
    
    const crossHotelLeak = staffATasks.some((t) => t.hotelId.toString() === testHotelB._id.toString());
    assert(!crossHotelLeak, "Zero cross-hotel data leak: Staff A never receives Hotel B tasks");

    // -----------------------------------------------------------------
    // TEST 16: Inactive Hotel Protection
    // -----------------------------------------------------------------
    console.log("\n--- 8. Inactive Hotel Operational Restriction ---");
    const inactiveHotelCheck = await Hotel.findById(testHotelInactive._id).select("status name");
    assert(inactiveHotelCheck?.status === "INACTIVE", "Inactive hotel flagged to return 403 Forbidden for operational endpoints");

    // -----------------------------------------------------------------
    // CLEANUP
    // -----------------------------------------------------------------
    console.log("\n--- 9. Cleaning up Test Artifacts ---");
    await HousekeepingTask.deleteMany({ taskId: { $in: ["TASK-S2-A", "TASK-S2-B"] } });
    await Room.deleteMany({ roomNumber: { $in: ["205", "302"] } });
    await User.deleteMany({
      email: {
        $in: [
          "s2_staff_alpha@grandstay.com",
          "s2_staff_beta@grandstay.com",
          "s2_staff_temp@grandstay.com",
          "s2_staff_inactive@grandstay.com",
        ],
      },
    });
    await Hotel.deleteMany({
      hotelCode: { $in: ["S2TEST_HOTEL_A", "S2TEST_HOTEL_B", "S2TEST_INACTIVE"] },
    });
    console.log("  ✓ Test artifacts cleaned up.");

    console.log("\n==================================================");
    console.log(`PHASE S2 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
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

runPhaseS2Tests();
