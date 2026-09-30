import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Customer from "@/models/Customer";
import Booking from "@/models/Booking";
import Hotel from "@/models/Hotel";
import { requireFrontDeskUser, handleAuthError } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/customers/[id]
 * Retrieves customer profile and their booking history within this hotel.
 * Returns 404 for cross-hotel access attempts.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await requireFrontDeskUser(req);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    await connectToDatabase();

    // STRICT MULTI-TENANT QUERY
    const customer = await Customer.findOne({
      _id: id,
      hotelId: authUser.hotelId,
    }).lean();

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found or does not belong to your hotel" },
        { status: 404 }
      );
    }

    // Fetch this customer's bookings in this hotel
    const bookings = await Booking.find({
      hotelId: authUser.hotelId,
      customerId: id,
    })
      .populate("roomId", "roomNumber roomType pricePerNight floor")
      .sort({ checkInDate: -1 })
      .lean();

    const hotel = await Hotel.findById(authUser.hotelId).select("name hotelCode").lean();

    return NextResponse.json({
      success: true,
      customer: {
        ...customer,
        hotelName: hotel?.name || "Your Hotel",
        hotelCode: hotel?.hotelCode || "HOT-000000",
      },
      bookings,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * PATCH /api/customers/[id]
 * Updates customer details. Prevents modifying customerId or hotelId.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await requireFrontDeskUser(req);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    await connectToDatabase();

    const existingCustomer = await Customer.findOne({
      _id: id,
      hotelId: authUser.hotelId,
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { error: "Customer not found or access denied" },
        { status: 404 }
      );
    }

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
      isActive,
    } = body;

    if (fullName !== undefined) {
      if (!fullName || !String(fullName).trim()) {
        return NextResponse.json({ error: "Full Name cannot be empty" }, { status: 400 });
      }
      existingCustomer.fullName = String(fullName).trim();
    }

    if (phone !== undefined) {
      const cleanPhone = String(phone).trim();
      if (!cleanPhone) {
        return NextResponse.json({ error: "Phone number cannot be empty" }, { status: 400 });
      }
      // Check phone uniqueness within this hotel if changed
      if (cleanPhone !== existingCustomer.phone) {
        const conflict = await Customer.findOne({
          hotelId: authUser.hotelId,
          phone: cleanPhone,
          _id: { $ne: existingCustomer._id },
        });
        if (conflict) {
          return NextResponse.json(
            { error: `Another customer in your hotel already has phone '${cleanPhone}'` },
            { status: 409 }
          );
        }
      }
      existingCustomer.phone = cleanPhone;
    }

    if (email !== undefined) existingCustomer.email = String(email || "").toLowerCase().trim();
    if (dateOfBirth !== undefined) existingCustomer.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : undefined;
    if (gender !== undefined) existingCustomer.gender = gender;
    if (address !== undefined) existingCustomer.address = String(address || "").trim();
    if (city !== undefined) existingCustomer.city = String(city || "").trim();
    if (state !== undefined) existingCustomer.state = String(state || "").trim();
    if (country !== undefined) existingCustomer.country = String(country || "India").trim();
    if (idType !== undefined) existingCustomer.idType = idType;
    if (idNumber !== undefined) existingCustomer.idNumber = String(idNumber || "").trim();
    if (notes !== undefined) existingCustomer.notes = String(notes || "").trim();
    if (isActive !== undefined) existingCustomer.isActive = Boolean(isActive);

    // Explicitly guarantee hotelId is unchanged
    existingCustomer.hotelId = authUser.hotelId as any;

    await existingCustomer.save();

    return NextResponse.json({
      success: true,
      message: `Customer '${existingCustomer.fullName}' updated successfully`,
      customer: existingCustomer,
    });
  } catch (error: any) {
    return handleAuthError(error);
  }
}

/**
 * DELETE /api/customers/[id]
 * Soft delete / deactivation
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await requireFrontDeskUser(req);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    await connectToDatabase();

    const customer = await Customer.findOne({
      _id: id,
      hotelId: authUser.hotelId,
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found or access denied" },
        { status: 404 }
      );
    }

    customer.isActive = false;
    await customer.save();

    return NextResponse.json({
      success: true,
      message: `Customer '${customer.fullName}' has been deactivated`,
      customer: {
        _id: customer._id,
        fullName: customer.fullName,
        isActive: false,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
