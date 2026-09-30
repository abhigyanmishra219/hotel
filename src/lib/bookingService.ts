import mongoose, { Types } from "mongoose";
import Booking, { IBooking } from "@/models/Booking";
import Room, { IRoom } from "@/models/Room";

export interface BookingConflictCheckParams {
  hotelId: string | Types.ObjectId;
  roomId: string | Types.ObjectId;
  checkInDate: Date;
  checkOutDate: Date;
  excludeBookingId?: string | Types.ObjectId;
}

export interface AvailableRoomsQueryParams {
  hotelId: string | Types.ObjectId;
  checkInDate: Date;
  checkOutDate: Date;
  roomType?: string;
  minCapacity?: number;
}

/**
 * Normalizes a date to start of day (midnight) to prevent hour/minute timezone comparison discrepancies.
 */
export function normalizeDateToMidnight(d: string | Date): Date {
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) {
    throw new Error("Invalid date format provided");
  }
  return new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Calculates the number of nights between check-in and check-out.
 * Must be at least 1 night.
 */
export function calculateStayNights(checkIn: Date, checkOut: Date): number {
  const diffTime = checkOut.getTime() - checkIn.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 1) {
    throw new Error("Check-out date must be strictly after check-in date (minimum stay is 1 night).");
  }
  return diffDays;
}

/**
 * Double-Booking Prevention:
 * Checks if there is any overlapping CONFIRMED booking for the requested room in the same hotel.
 * Conflict condition: (newCheckIn < existingCheckOut) AND (newCheckOut > existingCheckIn)
 */
export async function checkBookingConflict({
  hotelId,
  roomId,
  checkInDate,
  checkOutDate,
  excludeBookingId,
}: BookingConflictCheckParams): Promise<{ hasConflict: boolean; conflictingBooking: IBooking | null }> {
  const query: any = {
    hotelId: new mongoose.Types.ObjectId(hotelId.toString()),
    roomId: new mongoose.Types.ObjectId(roomId.toString()),
    status: { $in: ["CONFIRMED", "CHECKED_IN"] }, // Both confirmed reservations and active stays block rooms
    checkInDate: { $lt: checkOutDate },
    checkOutDate: { $gt: checkInDate },
  };

  if (excludeBookingId) {
    query._id = { $ne: new mongoose.Types.ObjectId(excludeBookingId.toString()) };
  }

  const conflictingBooking = await Booking.findOne(query);

  return {
    hasConflict: !!conflictingBooking,
    conflictingBooking,
  };
}

/**
 * Retrieves all active rooms that are NOT booked or occupied for the requested stay window.
 */
export async function getAvailableRooms({
  hotelId,
  checkInDate,
  checkOutDate,
  roomType,
  minCapacity,
}: AvailableRoomsQueryParams) {
  const formattedHotelId = new mongoose.Types.ObjectId(hotelId.toString());

  // 1. Find all active rooms for the hotel
  const roomQuery: any = {
    hotelId: formattedHotelId,
    isActive: true,
  };

  if (roomType && roomType !== "ALL") {
    roomQuery.roomType = roomType.toUpperCase();
  }

  if (minCapacity && minCapacity > 0) {
    roomQuery.capacity = { $gte: minCapacity };
  }

  const allHotelRooms = await Room.find(roomQuery).lean();

  if (allHotelRooms.length === 0) {
    return [];
  }

  // 2. Find all rooms with overlapping confirmed or checked-in bookings
  const overlappingBookings = await Booking.find({
    hotelId: formattedHotelId,
    status: { $in: ["CONFIRMED", "CHECKED_IN"] },
    checkInDate: { $lt: checkOutDate },
    checkOutDate: { $gt: checkInDate },
  }).select("roomId").lean();

  const bookedRoomIds = new Set(overlappingBookings.map((b) => b.roomId.toString()));

  // 3. Filter out booked rooms and rooms currently OCCUPIED or CLEANING or MAINTENANCE
  return allHotelRooms.filter((room) => !bookedRoomIds.has(room._id.toString()));
}

/**
 * Calculates complete pricing breakdown server-side (snapshot price, subtotal, discount, GST tax, total).
 */
export function calculateBookingPricing({
  pricePerNight,
  numberOfNights,
  discount = 0,
  taxRate = 0.12, // Standard 12% hotel GST
}: {
  pricePerNight: number;
  numberOfNights: number;
  discount?: number;
  taxRate?: number;
}) {
  const roomAmount = Math.round(pricePerNight * numberOfNights);
  const cleanDiscount = Math.max(0, Math.min(Math.round(discount), roomAmount));
  const taxableAmount = roomAmount - cleanDiscount;
  const tax = Math.round(taxableAmount * taxRate);
  const totalAmount = taxableAmount + tax;

  return {
    pricePerNight,
    numberOfNights,
    roomAmount,
    discount: cleanDiscount,
    tax,
    totalAmount,
  };
}

/**
 * Calculates final checkout billing statement including additional charges, stayed nights, and payment balances.
 */
export function calculateCheckoutBilling({
  pricePerNight,
  scheduledCheckIn,
  scheduledCheckOut,
  actualCheckOut,
  additionalCharges = [],
  discount = 0,
  amountPaid = 0,
  taxRate = 0.12,
}: {
  pricePerNight: number;
  scheduledCheckIn: Date;
  scheduledCheckOut: Date;
  actualCheckOut: Date;
  additionalCharges?: Array<{ description: string; amount: number; date?: Date }>;
  discount?: number;
  amountPaid?: number;
  taxRate?: number;
}) {
  // Determine billable nights:
  // Scheduled nights:
  const scheduledNights = calculateStayNights(
    normalizeDateToMidnight(scheduledCheckIn),
    normalizeDateToMidnight(scheduledCheckOut)
  );

  // Check if late checkout exceeds scheduled check-out day:
  const normActual = normalizeDateToMidnight(actualCheckOut);
  const normScheduledOut = normalizeDateToMidnight(scheduledCheckOut);

  let billableNights = scheduledNights;
  if (normActual > normScheduledOut) {
    // Guest stayed extra nights
    billableNights = calculateStayNights(
      normalizeDateToMidnight(scheduledCheckIn),
      normActual
    );
  }

  const roomAmount = Math.round(pricePerNight * billableNights);
  const additionalChargesTotal = additionalCharges.reduce(
    (acc, curr) => acc + (Math.max(0, Number(curr.amount)) || 0),
    0
  );

  const cleanDiscount = Math.max(0, Math.min(Math.round(discount || 0), roomAmount + additionalChargesTotal));
  const taxableAmount = Math.max(0, roomAmount + additionalChargesTotal - cleanDiscount);
  const tax = Math.round(taxableAmount * taxRate);
  const totalAmount = taxableAmount + tax;

  const cleanAmountPaid = Math.max(0, Math.min(Math.round(amountPaid || 0), totalAmount));
  const amountDue = Math.max(0, totalAmount - cleanAmountPaid);

  let paymentStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID" = "UNPAID";
  if (cleanAmountPaid >= totalAmount && totalAmount > 0) {
    paymentStatus = "PAID";
  } else if (cleanAmountPaid > 0) {
    paymentStatus = "PARTIALLY_PAID";
  } else if (totalAmount === 0) {
    paymentStatus = "PAID";
  }

  return {
    billableNights,
    pricePerNight,
    roomAmount,
    additionalChargesTotal,
    discount: cleanDiscount,
    taxableAmount,
    tax,
    totalAmount,
    amountPaid: cleanAmountPaid,
    amountDue,
    paymentStatus,
  };
}
