import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireFrontDeskUser } from "@/lib/auth";
import Booking from "@/models/Booking";
import Customer from "@/models/Customer";
import Room from "@/models/Room";

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireFrontDeskUser(req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";

    const query: any = {
      hotelId: authUser.hotelId,
      status: "CHECKED_IN",
    };

    let customerIds: any[] = [];
    if (search) {
      const matchingCustomers = await Customer.find({
        hotelId: authUser.hotelId,
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { customerId: { $regex: search, $options: "i" } },
        ],
      }).select("_id");
      customerIds = matchingCustomers.map((c) => c._id);

      const matchingRooms = await Room.find({
        hotelId: authUser.hotelId,
        roomNumber: { $regex: search, $options: "i" },
      }).select("_id");
      const roomIds = matchingRooms.map((r) => r._id);

      query.$or = [
        { bookingId: { $regex: search, $options: "i" } },
        { customerId: { $in: customerIds } },
        { roomId: { $in: roomIds } },
      ];
    }

    const stays = await Booking.find(query)
      .populate("customerId", "customerId fullName phone email city idType idNumber")
      .populate("roomId", "roomNumber roomType floor capacity pricePerNight amenities status")
      .populate("checkedInBy", "name email role")
      .sort({ checkedInAt: -1, createdAt: -1 });

    return NextResponse.json({
      success: true,
      count: stays.length,
      stays,
    });
  } catch (err: any) {
    console.error("Fetch stays error:", err);
    if (err.message?.includes("Unauthorized") || err.message?.includes("Forbidden")) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to load active stays." },
      { status: 500 }
    );
  }
}
