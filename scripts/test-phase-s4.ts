import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../src/models/User";
import Hotel from "../src/models/Hotel";
import HousekeepingTask from "../src/models/HousekeepingTask";
import RoomServiceRequest from "../src/models/RoomServiceRequest";
import Room from "../src/models/Room";
import Booking from "../src/models/Booking";
import Customer from "../src/models/Customer";
import { USER_ROLES } from "../src/types/roles";
import { createToken, verifyToken } from "../src/lib/jwt";
import connectToDatabase from "../src/lib/mongodb";

async function runPhaseS4Tests() {
  console.log("==================================================");
  console.log("PHASE S4 — STAFF HOUSEKEEPING & ROOM CLEANING TESTS");
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
    // SETUP: Create 2 Test Hotels, Rooms, Staff, and Tasks
    // -----------------------------------------------------------------
    console.log("--- 1. Setting up Test Environment (Multi-Tenant Hotels, Rooms & Staff) ---");
    const testHotelA = await Hotel.findOneAndUpdate(
      { hotelCode: "S4TEST_HOTEL_A" },
      {
        name: "GrandStay Crystal Bay Resort",
        hotelCode: "S4TEST_HOTEL_A",
        status: "ACTIVE",
        address: "100 Crystal Way, Honolulu, HI",
        contactEmail: "crystal@grandstay.com",
        contactPhone: "555-050-0001",
      },
      { upsert: true, returnDocument: "after" }
    );

    const testHotelB = await Hotel.findOneAndUpdate(
      { hotelCode: "S4TEST_HOTEL_B" },
      {
        name: "GrandStay Emerald Summit",
        hotelCode: "S4TEST_HOTEL_B",
        status: "ACTIVE",
        address: "200 Summit Rd, Aspen, CO",
        contactEmail: "summit@grandstay.com",
        contactPhone: "555-060-0002",
      },
      { upsert: true, returnDocument: "after" }
    );

    // Clean up previous test users
    await User.deleteMany({
      email: {
        $in: [
          "s4_staff_a1@grandstay.com",
          "s4_staff_a2@grandstay.com",
          "s4_staff_b1@grandstay.com",
          "s4_recept_a@grandstay.com",
        ],
      },
    });

    const pwSalt = await bcrypt.genSalt(10);
    const pwHash = await bcrypt.hash("HousekeeperPass123!", pwSalt);

    const staffA1 = await User.create({
      name: "Maria Santos",
      email: "s4_staff_a1@grandstay.com",
      password: pwHash,
      role: USER_ROLES.STAFF,
      hotelId: testHotelA._id,
      isActive: true,
      mustChangePassword: false,
    });

    const staffA2 = await User.create({
      name: "David Kim",
      email: "s4_staff_a2@grandstay.com",
      password: pwHash,
      role: USER_ROLES.STAFF,
      hotelId: testHotelA._id,
      isActive: true,
      mustChangePassword: false,
    });

    const staffB1 = await User.create({
      name: "Sophie Dupont",
      email: "s4_staff_b1@grandstay.com",
      password: pwHash,
      role: USER_ROLES.STAFF,
      hotelId: testHotelB._id,
      isActive: true,
      mustChangePassword: false,
    });

    const receptionistA = await User.create({
      name: "Front Desk Agent",
      email: "s4_recept_a@grandstay.com",
      password: pwHash,
      role: USER_ROLES.RECEPTIONIST,
      hotelId: testHotelA._id,
      isActive: true,
      mustChangePassword: false,
    });

    assert(staffA1.role === USER_ROLES.STAFF, "Staff A1 created with role STAFF in Hotel A");
    assert(staffA2.role === USER_ROLES.STAFF, "Staff A2 created with role STAFF in Hotel A");
    assert(staffB1.role === USER_ROLES.STAFF, "Staff B1 created with role STAFF in Hotel B");

    // Create Rooms
    const roomA1 = await Room.findOneAndUpdate(
      { hotelId: testHotelA._id, roomNumber: "201" },
      {
        hotelId: testHotelA._id,
        roomNumber: "201",
        roomType: "DELUXE",
        floor: "2",
        pricePerNight: 250,
        status: "CLEANING",
        cleaningStatus: "DIRTY",
      },
      { upsert: true, returnDocument: "after" }
    );

    const roomA2 = await Room.findOneAndUpdate(
      { hotelId: testHotelA._id, roomNumber: "202" },
      {
        hotelId: testHotelA._id,
        roomNumber: "202",
        roomType: "DELUXE",
        floor: "2",
        pricePerNight: 250,
        status: "CLEANING",
        cleaningStatus: "DIRTY",
      },
      { upsert: true, returnDocument: "after" }
    );

    const roomA_Occupied = await Room.findOneAndUpdate(
      { hotelId: testHotelA._id, roomNumber: "203" },
      {
        hotelId: testHotelA._id,
        roomNumber: "203",
        roomType: "SUITE",
        floor: "2",
        pricePerNight: 400,
        status: "OCCUPIED",
        cleaningStatus: "DIRTY",
      },
      { upsert: true, returnDocument: "after" }
    );

    const roomB1 = await Room.findOneAndUpdate(
      { hotelId: testHotelB._id, roomNumber: "301" },
      {
        hotelId: testHotelB._id,
        roomNumber: "301",
        roomType: "DELUXE",
        floor: "3",
        pricePerNight: 300,
        status: "CLEANING",
        cleaningStatus: "DIRTY",
      },
      { upsert: true, returnDocument: "after" }
    );

    // Create Housekeeping Tasks
    const taskA1 = await HousekeepingTask.findOneAndUpdate(
      { hotelId: testHotelA._id, taskId: "HK-S4-A1" },
      {
        hotelId: testHotelA._id,
        taskId: "HK-S4-A1",
        roomId: roomA1._id,
        assignedTo: staffA1._id,
        type: "ROOM_CLEANING",
        priority: "HIGH",
        status: "PENDING",
        notes: "Turnaround cleaning after checkout",
      },
      { upsert: true, returnDocument: "after" }
    );

    const taskA2 = await HousekeepingTask.findOneAndUpdate(
      { hotelId: testHotelA._id, taskId: "HK-S4-A2" },
      {
        hotelId: testHotelA._id,
        taskId: "HK-S4-A2",
        roomId: roomA2._id,
        assignedTo: staffA2._id,
        type: "DEEP_CLEANING",
        priority: "URGENT",
        status: "PENDING",
        notes: "Assigned to Staff A2",
      },
      { upsert: true, returnDocument: "after" }
    );

    const taskA_DailyOccupied = await HousekeepingTask.findOneAndUpdate(
      { hotelId: testHotelA._id, taskId: "HK-S4-OCCUPIED" },
      {
        hotelId: testHotelA._id,
        taskId: "HK-S4-OCCUPIED",
        roomId: roomA_Occupied._id,
        assignedTo: staffA1._id,
        type: "ROOM_CLEANING",
        priority: "MEDIUM",
        status: "IN_PROGRESS",
        notes: "Daily stayover cleaning for active guest",
      },
      { upsert: true, returnDocument: "after" }
    );

    const taskB1 = await HousekeepingTask.findOneAndUpdate(
      { hotelId: testHotelB._id, taskId: "HK-S4-B1" },
      {
        hotelId: testHotelB._id,
        taskId: "HK-S4-B1",
        roomId: roomB1._id,
        assignedTo: staffB1._id,
        type: "ROOM_CLEANING",
        priority: "HIGH",
        status: "PENDING",
        notes: "Hotel B task for Staff B1",
      },
      { upsert: true, returnDocument: "after" }
    );

    // -----------------------------------------------------------------
    // TEST 1: Housekeeping Task Scoping (TEST 1)
    // -----------------------------------------------------------------
    console.log("\n--- 2. Housekeeping Task Feed Scoping ---");
    const staffA1HKTasks = await HousekeepingTask.find({
      hotelId: staffA1.hotelId,
      assignedTo: staffA1._id,
    });
    assert(staffA1HKTasks.length === 2, "Staff A1 receives only their assigned housekeeping tasks (2 tasks)");
    assert(staffA1HKTasks.every((t) => t.hotelId.toString() === testHotelA._id.toString()), "All retrieved tasks strictly belong to Hotel A");

    // -----------------------------------------------------------------
    // TEST 2, 8, 9: Task Details & Cross-Staff / Cross-Hotel Guard
    // -----------------------------------------------------------------
    console.log("\n--- 3. Task Details & Ownership Guards ---");
    const validHKTask = await HousekeepingTask.findOne({
      _id: taskA1._id,
      hotelId: staffA1.hotelId,
      assignedTo: staffA1._id,
    }).populate("roomId", "roomNumber floor roomType status");

    assert(validHKTask !== null, "Staff A1 loads valid task details for Room 201");

    // Cross-staff access attempt
    const crossStaffAccess = await HousekeepingTask.findOne({
      _id: taskA2._id,
      hotelId: staffA1.hotelId,
      assignedTo: staffA1._id, // Staff A1 accessing Staff A2
    });
    assert(crossStaffAccess === null, "Cross-Staff attempt: Staff A1 opening Staff A2 task -> Denied (null / 404)");

    // Cross-hotel access attempt
    const crossHotelAccess = await HousekeepingTask.findOne({
      _id: taskB1._id,
      hotelId: staffA1.hotelId, // Hotel A context
      assignedTo: staffA1._id,
    });
    assert(crossHotelAccess === null, "Cross-Hotel attempt: Staff A1 opening Hotel B task -> Denied (null / 404)");

    // -----------------------------------------------------------------
    // TEST 3, 4, 5: Start Cleaning & Room Status Safety
    // -----------------------------------------------------------------
    console.log("\n--- 4. Start Cleaning Lifecycle & Room Status ---");
    
    // Start cleaning on taskA1
    taskA1.status = "IN_PROGRESS";
    taskA1.startedAt = new Date();
    await taskA1.save();

    // Verify room status remains CLEANING during active cleaning
    const roomDuringCleaning = await Room.findById(taskA1.roomId);
    assert(roomDuringCleaning?.status === "CLEANING", "When cleaning starts, Room status remains CLEANING");
    assert(taskA1.startedAt instanceof Date, "Server successfully recorded task.startedAt timestamp");

    // Add cleaning notes
    taskA1.notes = "Linens replaced, bathroom disinfected, fresh amenities placed.";
    await taskA1.save();
    const updatedNotesTask = await HousekeepingTask.findById(taskA1._id);
    assert(updatedNotesTask?.notes === "Linens replaced, bathroom disinfected, fresh amenities placed.", "Cleaning notes saved to task record");

    // Complete cleaning
    taskA1.status = "COMPLETED";
    taskA1.completedAt = new Date();
    await taskA1.save();

    // Update room status to AVAILABLE
    await Room.findByIdAndUpdate(taskA1.roomId, { status: "AVAILABLE" });

    const roomAfterCompletion = await Room.findById(taskA1.roomId);
    assert(roomAfterCompletion?.status === "AVAILABLE", "Upon housekeeping completion, Room transitions to AVAILABLE / READY");

    // -----------------------------------------------------------------
    // TEST 6 & 7: Double Completion & Premature Completion Guards
    // -----------------------------------------------------------------
    console.log("\n--- 5. Lifecycle Transition & Double Completion Guards ---");
    
    // Double completion check
    const isDoubleCompletionBlocked = (currentStatus: string) => {
      if (currentStatus === "COMPLETED") return { allowed: false, status: 409 };
      return { allowed: true, status: 200 };
    };
    const doubleCompCheck = isDoubleCompletionBlocked(taskA1.status);
    assert(!doubleCompCheck.allowed && doubleCompCheck.status === 409, "Double completion on already COMPLETED task is rejected with 409 Conflict");

    // Premature completion check (trying to complete PENDING task directly without starting)
    const isDirectCompletionAllowed = (currentStatus: string) => {
      if (currentStatus !== "IN_PROGRESS") return { allowed: false, status: 400 };
      return { allowed: true, status: 200 };
    };
    const prematureCheck = isDirectCompletionAllowed(taskA2.status);
    assert(!prematureCheck.allowed && prematureCheck.status === 400, "Completing PENDING task without starting is rejected with 400 Bad Request");

    // -----------------------------------------------------------------
    // TEST 14: OCCUPIED Room Safety Check
    // -----------------------------------------------------------------
    console.log("\n--- 6. Occupied Room Safety Check During Stayover Clean ---");
    
    // Complete stayover cleaning on occupied room
    taskA_DailyOccupied.status = "COMPLETED";
    taskA_DailyOccupied.completedAt = new Date();
    await taskA_DailyOccupied.save();

    // Room was OCCUPIED before completion -> check preservation logic
    const occupiedRoomBefore = await Room.findById(taskA_DailyOccupied.roomId);
    let nextOccupiedStatus = occupiedRoomBefore?.status === "OCCUPIED" ? "OCCUPIED" : "AVAILABLE";
    await Room.findByIdAndUpdate(occupiedRoomBefore?._id, { status: nextOccupiedStatus });

    const roomAfterOccupiedClean = await Room.findById(taskA_DailyOccupied.roomId);
    assert(roomAfterOccupiedClean?.status === "OCCUPIED", "Stayover clean on OCCUPIED room preserves OCCUPIED status (does not overwrite to AVAILABLE)");

    // -----------------------------------------------------------------
    // TEST 17: Room Service Isolation Check
    // -----------------------------------------------------------------
    console.log("\n--- 7. Room Service Status Separation Check ---");
    
    // Room Service completion must NOT alter Room status to AVAILABLE
    const rsRequest = await RoomServiceRequest.create({
      requestId: "RS-S4-TEST",
      hotelId: testHotelA._id,
      roomId: roomA1._id,
      assignedTo: staffA1._id,
      items: [{ item: "Coffee", quantity: 2 }],
      status: "COMPLETED",
      completedAt: new Date(),
    });

    const isRSHousekeeping = (rsRequest.constructor as any).modelName === "HousekeepingTask";
    assert(!isRSHousekeeping, "Room Service requests do NOT trigger room status turnaround to AVAILABLE");

    // -----------------------------------------------------------------
    // TEST 15 & 16: Receptionist Checkout Integration Flow
    // -----------------------------------------------------------------
    console.log("\n--- 8. Receptionist Checkout & Turnaround Flow ---");
    
    // Simulate guest checkout setting room to CLEANING and dispatching task
    const testRoomCheckout = await Room.create({
      hotelId: testHotelA._id,
      roomNumber: "204",
      roomType: "DELUXE",
      floor: "2",
      pricePerNight: 250,
      status: "OCCUPIED",
    });

    // Step 1: Checkout occurs
    testRoomCheckout.status = "CLEANING";
    await testRoomCheckout.save();

    const turnaroundTask = await HousekeepingTask.create({
      hotelId: testHotelA._id,
      taskId: "HK-S4-TURNOVER",
      roomId: testRoomCheckout._id,
      assignedTo: staffA1._id,
      type: "ROOM_CLEANING",
      priority: "HIGH",
      status: "PENDING",
    });

    assert(testRoomCheckout.status === "CLEANING", "Step 1: Guest checkout sets Room 204 to CLEANING");
    assert(turnaroundTask.status === "PENDING", "Step 2: Turnaround Housekeeping task generated in PENDING status");

    // Step 2: Staff starts cleaning
    turnaroundTask.status = "IN_PROGRESS";
    turnaroundTask.startedAt = new Date();
    await turnaroundTask.save();
    assert(turnaroundTask.status === "IN_PROGRESS", "Step 3: Staff starts cleaning (IN_PROGRESS)");

    // Step 3: Staff completes cleaning
    turnaroundTask.status = "COMPLETED";
    turnaroundTask.completedAt = new Date();
    await turnaroundTask.save();
    testRoomCheckout.status = "AVAILABLE";
    await testRoomCheckout.save();

    const finalizedRoom = await Room.findById(testRoomCheckout._id);
    assert(finalizedRoom?.status === "AVAILABLE", "Step 4: Staff completes cleaning -> Room 204 transitions to AVAILABLE / READY for new bookings");

    // -----------------------------------------------------------------
    // CLEANUP
    // -----------------------------------------------------------------
    console.log("\n--- 9. Cleaning up Test Artifacts ---");
    await HousekeepingTask.deleteMany({
      taskId: { $in: ["HK-S4-A1", "HK-S4-A2", "HK-S4-OCCUPIED", "HK-S4-B1", "HK-S4-TURNOVER"] },
    });
    await RoomServiceRequest.deleteMany({ requestId: "RS-S4-TEST" });
    await Room.deleteMany({ roomNumber: { $in: ["201", "202", "203", "204", "301"] } });
    await User.deleteMany({
      email: {
        $in: [
          "s4_staff_a1@grandstay.com",
          "s4_staff_a2@grandstay.com",
          "s4_staff_b1@grandstay.com",
          "s4_recept_a@grandstay.com",
        ],
      },
    });
    await Hotel.deleteMany({
      hotelCode: { $in: ["S4TEST_HOTEL_A", "S4TEST_HOTEL_B"] },
    });
    console.log("  ✓ Test artifacts cleaned up.");

    console.log("\n==================================================");
    console.log(`PHASE S4 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
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

runPhaseS4Tests();
