import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const CUSTOMER_GENDERS = ["MALE", "FEMALE", "OTHER", "UNSPECIFIED"] as const;
export type CustomerGender = (typeof CUSTOMER_GENDERS)[number];

export const CUSTOMER_ID_TYPES = [
  "AADHAAR",
  "PASSPORT",
  "DRIVING_LICENSE",
  "VOTER_ID",
  "NATIONAL_ID",
  "OTHER",
  "NONE",
] as const;
export type CustomerIdType = (typeof CUSTOMER_ID_TYPES)[number];

export interface ICustomer extends Document {
  customerId: string;
  hotelId: Types.ObjectId;
  fullName: string;
  phone: string;
  email?: string;
  dateOfBirth?: Date;
  gender: CustomerGender;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  idType: CustomerIdType;
  idNumber?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    customerId: {
      type: String,
      required: true,
      trim: true,
    },
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "hotelId is required. Customer must belong to a hotel."],
      index: true,
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [100, "Full name cannot exceed 100 characters"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      maxlength: [20, "Phone number cannot exceed 20 characters"],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: CUSTOMER_GENDERS,
      default: "UNSPECIFIED",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    state: {
      type: String,
      trim: true,
      default: "",
    },
    country: {
      type: String,
      trim: true,
      default: "India",
    },
    idType: {
      type: String,
      enum: CUSTOMER_ID_TYPES,
      default: "NONE",
    },
    idNumber: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
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

// Compound index: scoped lookups by hotel + phone / customerId
CustomerSchema.index({ hotelId: 1, phone: 1 });
CustomerSchema.index({ hotelId: 1, customerId: 1 }, { unique: true });
CustomerSchema.index({ hotelId: 1, fullName: 1 });

// Pre-validate middleware: auto-generate customer business ID if not present
CustomerSchema.pre("validate", async function () {
  if (this.isNew && !this.customerId) {
    const count = await mongoose.models.Customer
      ? await mongoose.models.Customer.countDocuments({ hotelId: this.hotelId })
      : 0;
    const nextSeq = count + 1;
    this.customerId = `CUS-${String(nextSeq).padStart(6, "0")}`;
  }
});

const Customer: Model<ICustomer> =
  mongoose.models.Customer || mongoose.model<ICustomer>("Customer", CustomerSchema);

export default Customer;
