import mongoose, { Document, Model, Schema, Types } from "mongoose";
import {
  HousekeepingType,
  TaskPriority,
  TaskStatus,
  HOUSEKEEPING_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "@/types/housekeeping";

export interface IHousekeepingTask extends Document {
  taskId: string;
  hotelId: Types.ObjectId;
  roomId: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  bookingId?: Types.ObjectId;
  type: HousekeepingType;
  priority: TaskPriority;
  status: TaskStatus;
  notes?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const HousekeepingTaskSchema = new Schema<IHousekeepingTask>(
  {
    taskId: {
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
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      index: true,
    },
    type: {
      type: String,
      enum: HOUSEKEEPING_TYPES,
      default: "ROOM_CLEANING",
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: "MEDIUM",
    },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: "PENDING",
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for hotel-isolated queries and staff feeds
HousekeepingTaskSchema.index({ hotelId: 1, taskId: 1 }, { unique: true });
HousekeepingTaskSchema.index({ hotelId: 1, roomId: 1, status: 1 });
HousekeepingTaskSchema.index({ hotelId: 1, assignedTo: 1, status: 1 });
HousekeepingTaskSchema.index({ hotelId: 1, createdAt: -1 });

// Pre-validate middleware: auto-generate sequential business ID HK-000001
HousekeepingTaskSchema.pre("validate", async function () {
  if (this.isNew && !this.taskId) {
    const count = await mongoose.models.HousekeepingTask
      ? await mongoose.models.HousekeepingTask.countDocuments({ hotelId: this.hotelId })
      : 0;
    const nextSeq = count + 1;
    this.taskId = `HK-${String(nextSeq).padStart(6, "0")}`;
  }
});

const HousekeepingTask: Model<IHousekeepingTask> =
  mongoose.models.HousekeepingTask ||
  mongoose.model<IHousekeepingTask>("HousekeepingTask", HousekeepingTaskSchema);

export default HousekeepingTask;
