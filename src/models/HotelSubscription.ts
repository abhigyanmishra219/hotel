import mongoose, { Document, Model, Schema, Types } from "mongoose";
import SubscriptionPlan from "./SubscriptionPlan";
import type {
  HotelSubscriptionStatus,
  PaymentStatus,
} from "@/types/subscription";

export type { HotelSubscriptionStatus, PaymentStatus };

export interface IHotelSubscription extends Document {
  hotelId: Types.ObjectId;
  planId: Types.ObjectId;
  status: HotelSubscriptionStatus;
  startDate: Date;
  endDate: Date;
  paymentStatus: PaymentStatus;
  isCurrent: boolean;
  changeReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HotelSubscriptionSchema = new Schema<IHotelSubscription>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "Hotel ID is required"],
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: [true, "Subscription Plan ID is required"],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "TRIAL", "EXPIRED", "SUSPENDED", "CANCELLED"],
        message: "{VALUE} is not a valid subscription status",
      },
      default: "ACTIVE",
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
      validate: {
        validator: function (this: any, val: Date) {
          if (!this.startDate || !val) return true;
          return new Date(val).getTime() >= new Date(this.startDate).getTime();
        },
        message: "End date must be on or after start date",
      },
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ["PAID", "PENDING", "FAILED"],
        message: "{VALUE} is not a valid payment status",
      },
      default: "PENDING",
    },
    isCurrent: {
      type: Boolean,
      default: true,
      index: true,
    },
    changeReason: {
      type: String,
      trim: true,
      default: "Initial plan assignment",
      maxlength: [500, "Change reason cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying the current subscription of a hotel quickly
HotelSubscriptionSchema.index({ hotelId: 1, isCurrent: 1, createdAt: -1 });

// Prevent duplicate model compilation in Next.js HMR
const HotelSubscription: Model<IHotelSubscription> =
  mongoose.models.HotelSubscription ||
  mongoose.model<IHotelSubscription>(
    "HotelSubscription",
    HotelSubscriptionSchema
  );

export default HotelSubscription;
