import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const BOOKING_STATUSES = ["CONFIRMED", "CHECKED_IN", "COMPLETED", "CANCELLED"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_SOURCES = ["WALK_IN", "PHONE", "WEBSITE", "OTHER"] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

export interface IBooking extends Document {
  bookingId: string;
  hotelId: Types.ObjectId;
  customerId: Types.ObjectId;
  roomId: Types.ObjectId;
  checkInDate: Date;
  checkOutDate: Date;
  numberOfGuests: number;
  adults: number;
  children: number;
  pricePerNight: number;
  numberOfNights: number;
  roomAmount: number;
  discount: number;
  tax: number;
  totalAmount: number;
  status: BookingStatus;
  bookingSource: BookingSource;
  notes?: string;
  createdBy: Types.ObjectId;
  checkInAt?: Date;
  checkOutAt?: Date;
  checkedInAt?: Date;
  actualCheckInAt?: Date;
  checkedInBy?: Types.ObjectId;
  actualCheckInDate?: Date;
  actualCheckOutDate?: Date;
  actualCheckOutAt?: Date;
  checkedOutBy?: Types.ObjectId;
  checkInNotes?: string;
  checkOutNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    bookingId: {
      type: String,
      required: true,
      trim: true,
    },
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "hotelId is required. Booking must belong to a hotel."],
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "customerId is required"],
      index: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: [true, "roomId is required"],
      index: true,
    },
    checkInDate: {
      type: Date,
      required: [true, "Check-in date is required"],
      index: true,
    },
    checkOutDate: {
      type: Date,
      required: [true, "Check-out date is required"],
      index: true,
    },
    numberOfGuests: {
      type: Number,
      required: true,
      min: [1, "At least 1 guest is required"],
    },
    adults: {
      type: Number,
      required: true,
      min: [1, "At least 1 adult is required"],
    },
    children: {
      type: Number,
      default: 0,
      min: [0, "Children count cannot be negative"],
    },
    pricePerNight: {
      type: Number,
      required: [true, "Price per night snapshot is required"],
      min: [1, "Price per night must be greater than 0"],
    },
    numberOfNights: {
      type: Number,
      required: [true, "Number of nights is required"],
      min: [1, "Minimum stay is 1 night"],
    },
    roomAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, "Tax cannot be negative"],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: "CONFIRMED",
      index: true,
    },
    bookingSource: {
      type: String,
      enum: BOOKING_SOURCES,
      default: "WALK_IN",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    checkInAt: {
      type: Date,
    },
    checkOutAt: {
      type: Date,
    },
    checkedInAt: {
      type: Date,
    },
    actualCheckInAt: {
      type: Date,
    },
    checkedInBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    actualCheckInDate: {
      type: Date,
    },
    actualCheckOutDate: {
      type: Date,
    },
    actualCheckOutAt: {
      type: Date,
    },
    checkedOutBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    checkInNotes: {
      type: String,
      trim: true,
      default: "",
    },
    checkOutNotes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Crucial compound index for double-booking conflict detection & date range lookups
BookingSchema.index({ hotelId: 1, roomId: 1, status: 1, checkInDate: 1, checkOutDate: 1 });
BookingSchema.index({ hotelId: 1, bookingId: 1 }, { unique: true });
BookingSchema.index({ hotelId: 1, customerId: 1 });
BookingSchema.index({ hotelId: 1, status: 1, checkInDate: 1 });

// Pre-validate middleware: auto-generate booking business ID if not present
BookingSchema.pre("validate", async function () {
  if (this.isNew && !this.bookingId) {
    const count = await mongoose.models.Booking
      ? await mongoose.models.Booking.countDocuments({ hotelId: this.hotelId })
      : 0;
    const nextSeq = count + 1;
    this.bookingId = `BK-${String(nextSeq).padStart(6, "0")}`;
  }
});

const Booking: Model<IBooking> =
  mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema);

export default Booking;
