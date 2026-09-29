import mongoose, { Document, Model, Schema } from "mongoose";
import type { PlanStatus } from "@/types/subscription";
import { AVAILABLE_FEATURES } from "@/types/subscription";

export type { PlanStatus };
export { AVAILABLE_FEATURES };

export interface ISubscriptionPlan extends Document {
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxRooms: number; // -1 represents Unlimited
  maxStaff: number; // -1 represents Unlimited
  maxReceptionists: number; // -1 represents Unlimited
  features: string[];
  status: PlanStatus;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: {
      type: String,
      required: [true, "Plan name is required"],
      unique: true,
      trim: true,
      maxlength: [100, "Plan name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    monthlyPrice: {
      type: Number,
      required: [true, "Monthly price is required"],
      min: [0, "Monthly price cannot be negative"],
    },
    yearlyPrice: {
      type: Number,
      required: [true, "Yearly price is required"],
      min: [0, "Yearly price cannot be negative"],
    },
    maxRooms: {
      type: Number,
      required: [true, "Maximum rooms limit is required"],
      validate: {
        validator: function (val: number) {
          return val === -1 || (Number.isInteger(val) && val >= 0);
        },
        message: "Maximum rooms must be non-negative integer or -1 for unlimited",
      },
    },
    maxStaff: {
      type: Number,
      required: [true, "Maximum staff limit is required"],
      validate: {
        validator: function (val: number) {
          return val === -1 || (Number.isInteger(val) && val >= 0);
        },
        message: "Maximum staff must be non-negative integer or -1 for unlimited",
      },
    },
    maxReceptionists: {
      type: Number,
      required: [true, "Maximum receptionists limit is required"],
      validate: {
        validator: function (val: number) {
          return val === -1 || (Number.isInteger(val) && val >= 0);
        },
        message: "Maximum receptionists must be non-negative integer or -1 for unlimited",
      },
    },
    features: {
      type: [String],
      default: [],
      validate: {
        validator: function (val: string[]) {
          return Array.isArray(val);
        },
        message: "Features must be an array of strings",
      },
    },
    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "INACTIVE"],
        message: "{VALUE} is not a valid plan status",
      },
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate model compilation in Next.js HMR
const SubscriptionPlan: Model<ISubscriptionPlan> =
  mongoose.models.SubscriptionPlan ||
  mongoose.model<ISubscriptionPlan>("SubscriptionPlan", SubscriptionPlanSchema);

export default SubscriptionPlan;
