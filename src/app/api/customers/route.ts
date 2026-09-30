import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Customer from "@/models/Customer";
import Hotel from "@/models/Hotel";
import Booking from "@/models/Booking";
import { requireFrontDeskUser, handleAuthError } from "@/lib/auth";

/**
 * GET /api/customers
 * Lists all customers/guests belonging ONLY to the authenticated user's hotel.
 * Supports: search (fullName, phone, email, customerId), pagination, sorting.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await requireFrontDeskUser(req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    // STRICT MULTI-TENANT QUERY: Must match authenticated hotelId
    const query: any = {
      hotelId: authUser.hotelId,
      isActive: true,
    };

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { fullName: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { customerId: searchRegex },
      ];
    }

    const sortOptions: any = {};
    if (sortBy === "fullName") {
      sortOptions.fullName = sortOrder;
    } else if (sortBy === "phone") {
      sortOptions.phone = sortOrder;
    } else if (sortBy === "customerId") {
      sortOptions.customerId = sortOrder;
    } else {
      sortOptions.createdAt = sortOrder;
    }

    const total = await Customer.countDocuments(query);
    const skip = (page - 1) * limit;

    const customers = await Customer.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    // Fetch booking counts for each customer in this hotel
    const customerIds = customers.map((c) => c._id);
    const bookingCounts = await Booking.aggregate([
      {
        $match: {
          hotelId: authUser.hotelId as any,
          customerId: { $in: customerIds },
        },
      },
      {
        $group: {
          _id: "$customerId",
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = new Map(bookingCounts.map((b) => [b._id.toString(), b.count]));

    const hotel = await Hotel.findById(authUser.hotelId).select("name hotelCode").lean();

    return NextResponse.json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      customers: customers.map((c: any) => ({
        ...c,
        hotelName: hotel?.name || "Your Hotel",
        bookingCount: countMap.get(c._id.toString()) || 0,
      })),
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * POST /api/customers
 * Creates a new customer record strictly attached to authenticated user's hotelId.
 * Checks for existing customer by phone number within the same hotel.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await requireFrontDeskUser(req);
    await connectToDatabase();

    const body = await req.json();
    const {
      fullName,
      phone,
      email,
      dateOfBirth,
      gender,
      address,
      city,
      state,
      country,
      idType,
      idNumber,
      notes,
    } = body;

    // 1. Validation
    if (!fullName || !String(fullName).trim()) {
      return NextResponse.json({ error: "Customer full name is required" }, { status: 400 });
    }

    if (!phone || !String(phone).trim()) {
      return NextResponse.json({ error: "Customer phone number is required" }, { status: 400 });
    }

    const cleanPhone = String(phone).trim();
    const cleanName = String(fullName).trim();
    const cleanEmail = email ? String(email).toLowerCase().trim() : "";

    // 2. Duplicate detection by phone number within the same hotel
    const existing = await Customer.findOne({
      hotelId: authUser.hotelId,
      phone: cleanPhone,
    });

    if (existing) {
      return NextResponse.json(
        {
          error: `A customer with phone '${cleanPhone}' already exists in your hotel.`,
          existingCustomer: {
            _id: existing._id,
            customerId: existing.customerId,
            fullName: existing.fullName,
            phone: existing.phone,
            email: existing.email,
          },
        },
        { status: 409 }
      );
    }

    // 3. Generate sequential customer business ID for this hotel
    const count = await Customer.countDocuments({ hotelId: authUser.hotelId });
    const customerId = `CUS-${String(count + 1).padStart(6, "0")}`;

    // 4. Create customer record strictly bound to authUser.hotelId
    const newCustomer: any = await Customer.create({
      customerId,
      hotelId: authUser.hotelId,
      fullName: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender: gender || "UNSPECIFIED",
      address: String(address || "").trim(),
      city: String(city || "").trim(),
      state: String(state || "").trim(),
      country: String(country || "India").trim(),
      idType: idType || "NONE",
      idNumber: String(idNumber || "").trim(),
      notes: String(notes || "").trim(),
      isActive: true,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Customer '${newCustomer.fullName}' registered successfully`,
        customer: newCustomer,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "A customer with this record already exists in your hotel" },
        { status: 409 }
      );
    }
    return handleAuthError(error);
  }
}
