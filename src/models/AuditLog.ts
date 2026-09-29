import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { AUDIT_ACTIONS, AuditAction } from "@/types/audit";

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId | null;
  hotelId?: Types.ObjectId | null;
  action: AuditAction;
  entity: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
      index: true,
    },
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      required: false,
      default: null,
      index: true,
    },
    action: {
      type: String,
      required: [true, "Audit action type is required"],
      index: true,
      trim: true,
    },
    entity: {
      type: String,
      required: [true, "Affected entity type is required"],
      index: true,
      trim: true,
    },
    entityId: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Audit log description is required"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for high-performance administrative queries and filtering
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ hotelId: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;
