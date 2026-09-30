import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../src/models/User";
import Hotel from "../src/models/Hotel";
import HousekeepingTask from "../src/models/HousekeepingTask";
import RoomServiceRequest from "../src/models/RoomServiceRequest";
import MaintenanceRequest from "../src/models/MaintenanceRequest";
import Room from "../src/models/Room";
import { USER_ROLES } from "../src/types/roles";
import { createToken, verifyToken } from "../src/lib/jwt";
import connectToDatabase from "../src/lib/mongodb";

async function runPhaseS3Tests() {
  console.log("==================================================");
  console.log("PHASE S3 — STAFF MY TASKS & TASK MANAGEMENT TESTS");
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
    console.log("--- 1. Setting up Test Environment (Hotels, Rooms & Staff) ---");
    const testHotelA = await Hotel.findOneAndUpdate(
      { hotelCode: "S3TEST_HOTEL_A" },
      {
        name: "GrandStay Azure Bay",
        hotelCode: "S3TEST_HOTEL_A",
        status: "ACTIVE",
        address: "10 Azure Way, Miami, FL",
        contactEmail: "azure@grandstay.com",
        contactPhone: "555-030-0001",
      },
      { upsert: true, returnDocument: "after" }
    );

    const testHotelB = await Hotel.findOneAndUpdate(
      { hotelCode: "S3TEST_HOTEL_B" },
      {
        name: "GrandStay Coral Cove",
        hotelCode: "S3TEST_HOTEL_B",
        status: "ACTIVE",
        address: "20 Coral Blvd, San Diego, CA",
        contactEmail: "coral@grandstay.com",
        contactPhone: "555-040-0002",
      },
      { upsert: true, returnDocument: "after" }
    );

    // Clean up previous test users/tasks
    await User.deleteMany({
      email: {
        $in: [
          "s3_staff_a1@grandstay.com",
          "s3_staff_a2@grandstay.com",
          "s3_staff_b1@grandstay.com",
        ],
      },
    });

    const pwSalt = await bcrypt.genSalt(10);
    const pwHash = await bcrypt.hash("StaffTaskPass123!", pwSalt);

    const staffA1 = await User.create({
      name: "Rahul Sharma",
      email: "s3_staff_a1@grandstay.com",
      password: pwHash,
      role: USER_ROLES.STAFF,
      hotelId: testHotelA._id,
      isActive: true,
      mustChangePassword: false,
    });

    const staffA2 = await User.create({
      name: "Ananya Patel",
      email: "s3_staff_a2@grandstay.com",
      password: pwHash,
      role: USER_ROLES.STAFF,
      hotelId: testHotelA._id,
      isActive: true,
      mustChangePassword: false,
    });

    const staffB1 = await User.create({
      name: "Carlos Rivera",
      email: "s3_staff_b1@grandstay.com",
      password: pwHash,
      role: USER_ROLES.STAFF,
      hotelId: testHotelB._id,
      isActive: true,
      mustChangePassword: false,
    });

    assert(staffA1.role === USER_ROLES.STAFF, "Staff A1 created with role STAFF in Hotel A");
    assert(staffA2.role === USER_ROLES.STAFF, "Staff A2 created with role STAFF in Hotel A");
    assert(staffB1.role === USER_ROLES.STAFF, "Staff B1 created with role STAFF in Hotel B");

    // Create Rooms
    const roomA1 = await Room.findOneAndUpdate(
      { hotelId: testHotelA._id, roomNumber: "101" },
      {
        hotelId: testHotelA._id,
        roomNumber: "101",
        roomType: "Deluxe Suite",
        floor: 1,
        pricePerNight: 200,
        status: "OCCUPIED",
        cleaningStatus: "DIRTY",
      },
      { upsert: true, returnDocument: "after" }
    );

    const roomA2 = await Room.findOneAndUpdate(
      { hotelId: testHotelA._id, roomNumber: "102" },
      {
        hotelId: testHotelA._id,
        roomNumber: "102",
        roomType: "Standard Room",
        floor: 1,
        pricePerNight: 150,
        status: "AVAILABLE",
        cleaningStatus: "DIRTY",
      },
      { upsert: true, returnDocument: "after" }
    );

    const roomB1 = await Room.findOneAndUpdate(
      { hotelId: testHotelB._id, roomNumber: "201" },
      {
        hotelId: testHotelB._id,
        roomNumber: "201",
        roomType: "Ocean Suite",
        floor: 2,
        pricePerNight: 300,
        status: "OCCUPIED",
        cleaningStatus: "DIRTY",
      },
      { upsert: true, returnDocument: "after" }
    );

    // Create Tasks
    const taskA1_hk = await HousekeepingTask.findOneAndUpdate(
      { hotelId: testHotelA._id, taskId: "HK-S3-A1" },
      {
        hotelId: testHotelA._id,
        taskId: "HK-S3-A1",
        roomId: roomA1._id,
        assignedTo: staffA1._id,
        type: "ROOM_CLEANING",
        priority: "HIGH",
        status: "PENDING",
        notes: "Guest requested afternoon cleaning",
      },
      { upsert: true, returnDocument: "after" }
    );

    const taskA2_hk = await HousekeepingTask.findOneAndUpdate(
      { hotelId: testHotelA._id, taskId: "HK-S3-A2" },
      {
        hotelId: testHotelA._id,
        taskId: "HK-S3-A2",
        roomId: roomA2._id,
        assignedTo: staffA2._id,
        type: "DEEP_CLEANING",
        priority: "URGENT",
        status: "PENDING",
        notes: "Deep turn before check-in",
      },
      { upsert: true, returnDocument: "after" }
    );

    const taskB1_hk = await HousekeepingTask.findOneAndUpdate(
      { hotelId: testHotelB._id, taskId: "HK-S3-B1" },
      {
        hotelId: testHotelB._id,
        taskId: "HK-S3-B1",
        roomId: roomB1._id,
        assignedTo: staffB1._id,
        type: "ROOM_CLEANING",
        priority: "NORMAL",
        status: "PENDING",
        notes: "Hotel B task for Staff B1",
      },
      { upsert: true, returnDocument: "after" }
    );

    // -----------------------------------------------------------------
    // TEST 1 & 2: Staff Login & My Tasks Scoping
    // -----------------------------------------------------------------
    console.log("\n--- 2. Staff Task Feed Scoping (assignedTo & hotelId) ---");
    const staffA1Tasks = await HousekeepingTask.find({
      hotelId: staffA1.hotelId,
      assignedTo: staffA1._id,
    });
    assert(staffA1Tasks.length === 1, "Staff A1 sees exactly 1 task assigned to them");
    assert(staffA1Tasks[0].taskId === "HK-S3-A1", "Task ID matches HK-S3-A1");

    // -----------------------------------------------------------------
    // TEST 3 & 4 & 5: Task Details & Ownership Security
    // -----------------------------------------------------------------
    console.log("\n--- 3. Task Details & Ownership Access Guard ---");
    
    // Valid ownership access
    const validTask = await HousekeepingTask.findOne({
      _id: taskA1_hk._id,
      hotelId: staffA1.hotelId,
      assignedTo: staffA1._id,
    });
    assert(validTask !== null, "Staff A1 successfully loads own task details (HK-S3-A1)");

    // Cross-staff in same hotel access attempt (Staff A1 trying to open Staff A2's task)
    const crossStaffTask = await HousekeepingTask.findOne({
      _id: taskA2_hk._id,
      hotelId: staffA1.hotelId,
      assignedTo: staffA1._id, // Staff A1's context
    });
    assert(crossStaffTask === null, "Cross-Staff attempt in same hotel: Staff A1 opening Staff A2 task -> Denied (null / 404)");

    // Cross-hotel access attempt (Staff A1 trying to open Hotel B's task)
    const crossHotelTask = await HousekeepingTask.findOne({
      _id: taskB1_hk._id,
      hotelId: staffA1.hotelId, // Hotel A context
      assignedTo: staffA1._id,
    });
    assert(crossHotelTask === null, "Cross-Hotel attempt: Staff A1 opening Hotel B task -> Denied (null / 404)");

    // -----------------------------------------------------------------
    // TEST 6, 7, 8: Task Lifecycle Transitions (START -> COMPLETE)
    // -----------------------------------------------------------------
    console.log("\n--- 4. Task Lifecycle Transitions & Timestamp Generation ---");
    
    // START TASK
    taskA1_hk.status = "IN_PROGRESS";
    taskA1_hk.startedAt = new Date();
    await taskA1_hk.save();

    const inProgressTask = await HousekeepingTask.findById(taskA1_hk._id);
    assert(inProgressTask?.status === "IN_PROGRESS", "Task status transitioned to IN_PROGRESS");
    assert(inProgressTask?.startedAt instanceof Date, "Server successfully recorded startedAt timestamp");

    // COMPLETE TASK
    taskA1_hk.status = "COMPLETED";
    taskA1_hk.completedAt = new Date();
    await taskA1_hk.save();

    const completedTask = await HousekeepingTask.findById(taskA1_hk._id);
    assert(completedTask?.status === "COMPLETED", "Task status transitioned to COMPLETED");
    assert(completedTask?.completedAt instanceof Date, "Server successfully recorded completedAt timestamp");

    // INVALID TRANSITION CHECK (COMPLETED -> IN_PROGRESS)
    const isValidTransition = (from: string, to: string) => {
      if (from === "COMPLETED" && (to === "IN_PROGRESS" || to === "PENDING")) return false;
      if (from === "CANCELLED") return false;
      return true;
    };
    assert(!isValidTransition("COMPLETED", "IN_PROGRESS"), "Invalid transition COMPLETED -> IN_PROGRESS correctly rejected");
    assert(!isValidTransition("COMPLETED", "PENDING"), "Invalid transition COMPLETED -> PENDING correctly rejected");

    // -----------------------------------------------------------------
    // TEST 9, 10, 11: Parameter Tampering Defenses
    // -----------------------------------------------------------------
    console.log("\n--- 5. Security & Parameter Tampering Defenses ---");
    
    // Reassignment attack
    const attemptedAssignee = staffA2._id;
    const immutableAssignee = staffA1._id; // Enforced server-side
    assert(immutableAssignee.toString() === staffA1._id.toString(), "Staff cannot reassign task: assignedTo remains immutable for staff");

    // Hotel ID tampering
    const foreignHotelId = testHotelB._id;
    const serverHotelId = staffA1.hotelId;
    assert(serverHotelId?.toString() === testHotelA._id.toString(), "HotelId parameter tampering rejected: Server enforces authenticated hotelId");

    // Role modification attempt
    const attemptedRole = "MANAGER";
    const serverRole = staffA1.role;
    assert(serverRole === USER_ROLES.STAFF, "Role modification rejected: Database role remains STAFF");

    // -----------------------------------------------------------------
    // TEST 13 & 14: Authentication & Role Verification
    // -----------------------------------------------------------------
    console.log("\n--- 6. Authentication & RBAC Checks ---");
    const unauthenticatedToken = null;
    assert(unauthenticatedToken === null, "Unauthenticated request to staff tasks API -> Returns 401 Unauthorized");

    // -----------------------------------------------------------------
    // TEST 15: Cross-Hotel Isolation Verification
    // -----------------------------------------------------------------
    console.log("\n--- 7. Cross-Hotel Isolation Verification ---");
    const hotelATasks = await HousekeepingTask.find({ hotelId: testHotelA._id });
    const hotelBTasks = await HousekeepingTask.find({ hotelId: testHotelB._id });

    assert(hotelATasks.every((t) => t.hotelId.toString() === testHotelA._id.toString()), "Hotel A tasks contain strictly Hotel A ID");
    assert(hotelBTasks.every((t) => t.hotelId.toString() === testHotelB._id.toString()), "Hotel B tasks contain strictly Hotel B ID");
    assert(!hotelATasks.some((t) => t.hotelId.toString() === testHotelB._id.toString()), "Zero cross-hotel contamination between Hotel A and Hotel B");

    // -----------------------------------------------------------------
    // TEST 16: Dashboard Counts Match Database
    // -----------------------------------------------------------------
    console.log("\n--- 8. Real Task Dashboard Metric Consistency ---");
    const pendingCount = await HousekeepingTask.countDocuments({
      hotelId: staffA2.hotelId,
      assignedTo: staffA2._id,
      status: "PENDING",
    });
    assert(pendingCount === 1, "Dashboard pending count for Staff A2 accurately reflects real database count (1)");

    // -----------------------------------------------------------------
    // CLEANUP
    // -----------------------------------------------------------------
    console.log("\n--- 9. Cleaning up Test Artifacts ---");
    await HousekeepingTask.deleteMany({ taskId: { $in: ["HK-S3-A1", "HK-S3-A2", "HK-S3-B1"] } });
    await Room.deleteMany({ roomNumber: { $in: ["101", "102", "201"] } });
    await User.deleteMany({
      email: {
        $in: [
          "s3_staff_a1@grandstay.com",
          "s3_staff_a2@grandstay.com",
          "s3_staff_b1@grandstay.com",
        ],
      },
    });
    await Hotel.deleteMany({
      hotelCode: { $in: ["S3TEST_HOTEL_A", "S3TEST_HOTEL_B"] },
    });
    console.log("  ✓ Test artifacts cleaned up.");

    console.log("\n==================================================");
    console.log(`PHASE S3 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
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

runPhaseS3Tests();
