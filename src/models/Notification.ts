import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const NOTIFICATION_TYPES = [
  "TASK_ASSIGNED",
  "TASK_UPDATED",
  "TASK_COMPLETED",
  "SYSTEM_ALERT",
  "GENERAL",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface INotification extends Document {
  hotelId: Types.ObjectId;
  recipientId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  relatedTaskId?: string;
  relatedTaskType?: "HOUSEKEEPING" | "ROOM_SERVICE" | "MAINTENANCE";
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "hotelId is required"],
      index: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "recipientId is required"],
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      default: "TASK_ASSIGNED",
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
    },
    relatedTaskId: {
      type: String,
      trim: true,
    },
    relatedTaskType: {
      type: String,
      enum: ["HOUSEKEEPING", "ROOM_SERVICE", "MAINTENANCE"],
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal tenant and recipient queries
NotificationSchema.index({ hotelId: 1, recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ hotelId: 1, createdAt: -1 });

const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
