import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Hotel from "@/models/Hotel";
import HotelSubscription from "@/models/HotelSubscription";
import SubscriptionPlan from "@/models/SubscriptionPlan";

async function inspectDb() {
  await connectToDatabase();
  console.log("Connected to MongoDB successfully!");

  const hotels = await Hotel.find().lean();
  console.log(`\nFound ${hotels.length} hotels:`);
  for (const h of hotels) {
    console.log(`- Hotel: ${h.name}, _id: ${h._id}, hotelCode: ${h.hotelCode}, status: ${h.status}`);
  }

  const managers = await User.find({ role: "MANAGER" }).lean();
  console.log(`\nFound ${managers.length} managers:`);
  for (const m of managers) {
    console.log(`- Manager: ${m.name}, email: ${m.email}, hotelId: ${m.hotelId} (type: ${typeof m.hotelId})`);
  }

  const subs = await HotelSubscription.find().lean();
  console.log(`\nFound ${subs.length} subscriptions:`);
  for (const s of subs) {
    console.log(`- Sub: hotelId: ${s.hotelId}, planId: ${s.planId}, status: ${s.status}, isCurrent: ${s.isCurrent}`);
  }

  const plans = await SubscriptionPlan.find().lean();
  console.log(`\nFound ${plans.length} subscription plans:`);
  for (const p of plans) {
    console.log(`- Plan: ${p.name}, _id: ${p._id}, maxStaff: ${p.maxStaff}, maxRooms: ${p.maxRooms}`);
  }

  await mongoose.disconnect();
}

inspectDb().catch((err) => {
  console.error("Error inspecting DB:", err);
  process.exit(1);
});
