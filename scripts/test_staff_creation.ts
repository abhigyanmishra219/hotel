import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { POST } from "@/app/api/manager/staff/route";
import { createToken } from "@/lib/jwt";
import { NextRequest } from "next/server";

async function testStaffCreation() {
  await connectToDatabase();
  console.log("Connected to MongoDB.");

  // Find manager3@gmail.com
  const manager = await User.findOne({ email: "manager3@gmail.com" }).lean();
  if (!manager) {
    throw new Error("Manager manager3@gmail.com not found!");
  }
  console.log("Found manager:", manager.name, "HotelId:", manager.hotelId);

  const token = createToken({
    userId: manager._id.toString(),
    name: manager.name,
    email: manager.email,
    role: manager.role,
    hotelId: manager.hotelId ? manager.hotelId.toString() : null,
    mustChangePassword: Boolean(manager.mustChangePassword),
  });

  const testEmail = `test_staff_${Date.now()}@example.com`;
  const req = new NextRequest("http://localhost:3000/api/manager/staff", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: "Test Staff Member",
      email: testEmail,
      phone: "+1234567890",
      password: "TempPassword123!",
    }),
  });

  console.log("Calling POST /api/manager/staff...");
  const res = await POST(req);
  console.log("Response status:", res.status);
  const data = await res.json();
  console.log("Response data:", JSON.stringify(data, null, 2));

  // If created, clean it up
  if (data?.user?._id) {
    await User.findByIdAndDelete(data.user._id);
    console.log("Cleaned up created staff member.");
  }
}

testStaffCreation().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
