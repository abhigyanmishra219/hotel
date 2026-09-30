import mongoose, { Document, Model, Schema, Types } from "mongoose";
import {
  MaintenanceStatus,
  MAINTENANCE_STATUSES,
} from "@/types/maintenance";
import { TaskPriority, TASK_PRIORITIES } from "@/types/housekeeping";

export interface IMaintenanceRequest extends Document {
  requestId: string;
  hotelId: Types.ObjectId;
  roomId: Types.ObjectId;
  reportedBy: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  issue: string;
  priority: TaskPriority;
  status: MaintenanceStatus;
  notes?: string;
  startedAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceRequestSchema = new Schema<IMaintenanceRequest>(
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
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    issue: {
      type: String,
      required: [true, "Issue description is required"],
      trim: true,
      maxlength: [1000, "Issue description cannot exceed 1000 characters"],
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: "MEDIUM",
    },
    status: {
      type: String,
      enum: MAINTENANCE_STATUSES,
      default: "OPEN",
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
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
MaintenanceRequestSchema.index({ hotelId: 1, requestId: 1 }, { unique: true });
MaintenanceRequestSchema.index({ hotelId: 1, roomId: 1, status: 1 });
MaintenanceRequestSchema.index({ hotelId: 1, assignedTo: 1, status: 1 });
MaintenanceRequestSchema.index({ hotelId: 1, createdAt: -1 });

// Pre-validate middleware: auto-generate sequential business ID MT-000001
MaintenanceRequestSchema.pre("validate", async function () {
  if (this.isNew && !this.requestId) {
    const count = await mongoose.models.MaintenanceRequest
      ? await mongoose.models.MaintenanceRequest.countDocuments({ hotelId: this.hotelId })
      : 0;
    const nextSeq = count + 1;
    this.requestId = `MT-${String(nextSeq).padStart(6, "0")}`;
  }
});

const MaintenanceRequest: Model<IMaintenanceRequest> =
  mongoose.models.MaintenanceRequest ||
  mongoose.model<IMaintenanceRequest>("MaintenanceRequest", MaintenanceRequestSchema);

export default MaintenanceRequest;
