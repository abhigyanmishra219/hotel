import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { POST } from "@/app/api/auth/change-password/route";
import { createToken } from "@/lib/jwt";
import { NextRequest } from "next/server";

async function runTests() {
  console.log("=== STARTING PASSWORD FLOW TESTS ===");
  await connectToDatabase();

  const testEmail = `test_manager_${Date.now()}@example.com`;
  const initialPassword = "TemporaryPassword123!";
  const newPassword1 = "NewSecurePassword456!";
  const newPassword2 = "EvenNewerPassword789!";

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(initialPassword, salt);

  // 1. Create a mock manager with mustChangePassword = true (first login simulation)
  const testHotelId = new mongoose.Types.ObjectId();
  const user = await User.create({
    name: "Test Manager",
    email: testEmail,
    password: hashedPassword,
    role: "MANAGER",
    hotelId: testHotelId,
    mustChangePassword: true,
    isActive: true,
  });

  console.log("✓ Created test manager with mustChangePassword = true");

  try {
    // Generate auth token for this user
    let token = createToken({
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      hotelId: testHotelId.toString(),
      mustChangePassword: true,
    });

    let reqCounter = 1;
    // Helper to make API calls
    async function callApi(body: any, authToken = token) {
      const ip = `192.168.1.${reqCounter++}`;
      const req = new NextRequest("http://localhost:3000/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": ip,
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(body),
      });
      const res = await POST(req);
      const data = await res.json();
      return { status: res.status, data };
    }

    // TEST 1: First login reset (mustChangePassword = true) without currentPassword
    console.log("\nTEST 1: First login reset without currentPassword...");
    const res1 = await callApi({
      newPassword: newPassword1,
      confirmPassword: newPassword1,
    });
    console.log("Result:", res1.status, res1.data.message || res1.data.error);
    if (res1.status !== 200 || !res1.data.success) {
      throw new Error(`TEST 1 Failed: ${JSON.stringify(res1.data)}`);
    }
    console.log("✓ TEST 1 PASSED: First login reset succeeded without requiring currentPassword");

    // Verify DB state
    const userAfterFirstReset = await User.findById(user._id);
    if (userAfterFirstReset?.mustChangePassword !== false) {
      throw new Error("mustChangePassword was not set to false!");
    }
    console.log("✓ mustChangePassword is now false in DB");

    // Update token to reflect updated mustChangePassword = false
    token = res1.data.token;

    // TEST 2: Normal dashboard change without currentPassword -> MUST FAIL (400)
    console.log("\nTEST 2: Normal dashboard change without currentPassword...");
    const res2 = await callApi({
      newPassword: newPassword2,
      confirmPassword: newPassword2,
    });
    console.log("Result:", res2.status, res2.data.error);
    if (res2.status !== 400 || res2.data.error !== "Current password is required.") {
      throw new Error(`TEST 2 Failed: Expected 400 'Current password is required.', got ${JSON.stringify(res2.data)}`);
    }
    console.log("✓ TEST 2 PASSED: Missing current password properly rejected");

    // TEST 3: Incorrect current password -> MUST FAIL (400)
    console.log("\nTEST 3: Incorrect current password...");
    const res3 = await callApi({
      currentPassword: "WrongPassword123!",
      newPassword: newPassword2,
      confirmPassword: newPassword2,
    });
    console.log("Result:", res3.status, res3.data.error);
    if (res3.status !== 400 || res3.data.error !== "Current password is incorrect.") {
      throw new Error(`TEST 3 Failed: Expected 400 'Current password is incorrect.', got ${JSON.stringify(res3.data)}`);
    }
    console.log("✓ TEST 3 PASSED: Incorrect current password properly rejected");

    // TEST 4: Mismatched new passwords -> MUST FAIL (400)
    console.log("\nTEST 4: Mismatched new passwords...");
    const res4 = await callApi({
      currentPassword: newPassword1,
      newPassword: newPassword2,
      confirmPassword: "DifferentPassword123!",
    });
    console.log("Result:", res4.status, res4.data.error);
    if (res4.status !== 400 || res4.data.error !== "New passwords do not match.") {
      throw new Error(`TEST 4 Failed: Expected 400 'New passwords do not match.', got ${JSON.stringify(res4.data)}`);
    }
    console.log("✓ TEST 4 PASSED: Mismatched passwords rejected");

    // TEST 5: Short new password (< 8 chars) -> MUST FAIL (400)
    console.log("\nTEST 5: Short new password (< 8 chars)...");
    const res5 = await callApi({
      currentPassword: newPassword1,
      newPassword: "short",
      confirmPassword: "short",
    });
    console.log("Result:", res5.status, res5.data.error);
    if (res5.status !== 400 || !res5.data.error.includes("8 characters")) {
      throw new Error(`TEST 5 Failed: Expected 400 8 characters error, got ${JSON.stringify(res5.data)}`);
    }
    console.log("✓ TEST 5 PASSED: Weak/short password rejected");

    // TEST 6: Correct current password & valid new password -> MUST SUCCEED (200)
    console.log("\nTEST 6: Correct current password & valid new password...");
    const res6 = await callApi({
      currentPassword: newPassword1,
      newPassword: newPassword2,
      confirmPassword: newPassword2,
    });
    console.log("Result:", res6.status, res6.data.message);
    if (res6.status !== 200 || !res6.data.success) {
      throw new Error(`TEST 6 Failed: Expected 200 success, got ${JSON.stringify(res6.data)}`);
    }
    console.log("✓ TEST 6 PASSED: Normal password change succeeded");

    // TEST 7: Old password (newPassword1) stops working
    console.log("\nTEST 7: Verify old password stops working...");
    const userInDb = await User.findById(user._id).select("+password");
    const isOldMatch = await bcrypt.compare(newPassword1, userInDb!.password!);
    const isNewMatch = await bcrypt.compare(newPassword2, userInDb!.password!);
    if (isOldMatch) throw new Error("Old password still matched!");
    if (!isNewMatch) throw new Error("New password does not match DB hash!");
    console.log("✓ TEST 7 PASSED: Old password revoked, new password active in DB");

    // TEST 8: Identity tampering in request body (attempting to alter userId, role, hotelId)
    console.log("\nTEST 8: Body tampering attempt (userId, role, hotelId)...");
    const fakeUserId = new mongoose.Types.ObjectId().toString();
    const fakeHotelId = new mongoose.Types.ObjectId().toString();
    const res8 = await callApi({
      userId: fakeUserId,
      role: "SYSTEM_ADMIN",
      hotelId: fakeHotelId,
      currentPassword: newPassword2,
      newPassword: "FinalPassword999!",
      confirmPassword: "FinalPassword999!",
    });
    console.log("Result:", res8.status, res8.data.message);
    const userAfterTamperAttempt = await User.findById(user._id);
    if (userAfterTamperAttempt?.role !== "MANAGER") {
      throw new Error("Security breach: Role was modified via request body!");
    }
    if (userAfterTamperAttempt?.hotelId?.toString() !== testHotelId.toString()) {
      throw new Error("Security breach: HotelId was modified via request body!");
    }
    console.log("✓ TEST 8 PASSED: Body tampering completely ignored. Role and hotelId untampered.");

    console.log("\n==========================================");
    console.log("ALL PASSWORD TESTS PASSED SUCCESSFULLY! ✓");
    console.log("==========================================");
  } finally {
    // Cleanup test user
    await User.findByIdAndDelete(user._id);
    console.log("Cleaned up test user from DB.");
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
