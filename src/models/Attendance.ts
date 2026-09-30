import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const ATTENDANCE_STATUSES = [
  "NOT_STARTED",
  "CHECKED_IN",
  "ON_BREAK",
  "CHECKED_OUT",
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export interface IAttendance extends Document {
  hotelId: Types.ObjectId;
  staffId: Types.ObjectId;
  date: Date;
  status: AttendanceStatus;
  checkIn: Date;
  checkOut?: Date;
  workingMinutes?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "hotelId is required"],
      index: true,
    },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "staffId is required"],
      index: true,
    },
    date: {
      type: Date,
      required: [true, "date is required"],
      index: true,
    },
    status: {
      type: String,
      enum: ATTENDANCE_STATUSES,
      default: "CHECKED_IN",
      index: true,
    },
    checkIn: {
      type: Date,
      required: [true, "checkIn timestamp is required"],
    },
    checkOut: {
      type: Date,
    },
    workingMinutes: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Compound Unique Index: Enforces exactly one daily attendance record per staff per hotel
AttendanceSchema.index({ hotelId: 1, staffId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ hotelId: 1, staffId: 1, createdAt: -1 });

const Attendance: Model<IAttendance> =
  mongoose.models.Attendance ||
  mongoose.model<IAttendance>("Attendance", AttendanceSchema);

export default Attendance;
