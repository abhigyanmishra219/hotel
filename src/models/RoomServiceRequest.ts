import mongoose, { Document, Model, Schema, Types } from "mongoose";
import {
  RoomServiceStatus,
  ROOM_SERVICE_STATUSES,
} from "@/types/roomService";
import { TaskPriority, TASK_PRIORITIES } from "@/types/housekeeping";

export interface IRoomServiceRequest extends Document {
  requestId: string;
  hotelId: Types.ObjectId;
  roomId: Types.ObjectId;
  bookingId?: Types.ObjectId;
  requestedBy?: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  items: Array<{
    item: string;
    quantity: number;
  }>;
  notes?: string;
  priority: TaskPriority;
  status: RoomServiceStatus;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RoomServiceItemSchema = new Schema(
  {
    item: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false }
);

const RoomServiceRequestSchema = new Schema<IRoomServiceRequest>(
  {
    requestId: {
      type: String,
      required: true,
      trim: true,
    },
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "hotelId is required"],
      index: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: [true, "roomId is required"],
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      index: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    items: {
      type: [RoomServiceItemSchema],
      required: true,
      validate: [(v: any[]) => v.length > 0, "At least one service item is required"],
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: "MEDIUM",
    },
    status: {
      type: String,
      enum: ROOM_SERVICE_STATUSES,
      default: "PENDING",
      index: true,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
RoomServiceRequestSchema.index({ hotelId: 1, requestId: 1 }, { unique: true });
RoomServiceRequestSchema.index({ hotelId: 1, roomId: 1 });
RoomServiceRequestSchema.index({ hotelId: 1, assignedTo: 1, status: 1 });
RoomServiceRequestSchema.index({ hotelId: 1, createdAt: -1 });

// Pre-validate middleware: auto-generate sequential business ID RS-000001
RoomServiceRequestSchema.pre("validate", async function () {
  if (this.isNew && !this.requestId) {
    const count = await mongoose.models.RoomServiceRequest
      ? await mongoose.models.RoomServiceRequest.countDocuments({ hotelId: this.hotelId })
      : 0;
    const nextSeq = count + 1;
    this.requestId = `RS-${String(nextSeq).padStart(6, "0")}`;
  }
});

const RoomServiceRequest: Model<IRoomServiceRequest> =
  mongoose.models.RoomServiceRequest ||
  mongoose.model<IRoomServiceRequest>("RoomServiceRequest", RoomServiceRequestSchema);

export default RoomServiceRequest;
