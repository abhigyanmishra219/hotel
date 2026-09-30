import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { UserRole, USER_ROLES, VALID_ROLES } from "@/types/roles";

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: UserRole;
  hotelId?: Types.ObjectId | string | null;
  shift?: string;
  mustChangePassword: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false, // Don't return password by default in queries
    },
    role: {
      type: String,
      enum: {
        values: VALID_ROLES,
        message: "{VALUE} is not a valid role",
      },
      default: USER_ROLES.SYSTEM_ADMIN,
    },
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      default: null,
      index: true,
      validate: {
        validator: function (this: any, val: any) {
          // SYSTEM_ADMIN is platform-level and can have a null/undefined hotelId
          if (this.role === USER_ROLES.SYSTEM_ADMIN) {
            return true;
          }
          // MANAGER, RECEPTIONIST, and STAFF MUST have a valid hotelId
          return val !== null && val !== undefined && val !== "";
        },
        message: "hotelId is required for MANAGER, RECEPTIONIST, and STAFF roles",
      },
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    shift: {
      type: String,
      default: "09:00 AM - 06:00 PM (General Shift)",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast multi-tenant staff/receptionist lookups
UserSchema.index({ hotelId: 1, role: 1, isActive: 1 });

// Prevent mongoose model overwrite error in Next.js hot reload
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
