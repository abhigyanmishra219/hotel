import mongoose, { Document, Model, Schema } from "mongoose";

export type HotelStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface IHotel extends Document {
  hotelCode: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  gstNumber?: string;
  status: HotelStatus;
  createdAt: Date;
  updatedAt: Date;
}

const HotelSchema = new Schema<IHotel>(
  {
    hotelCode: {
      type: String,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Hotel name is required"],
      trim: true,
      maxlength: [150, "Hotel name cannot exceed 150 characters"],
    },
    email: {
      type: String,
      required: [true, "Hotel email is required"],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
      default: "USA",
    },
    gstNumber: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "INACTIVE", "SUSPENDED"],
        message: "{VALUE} is not a valid hotel status",
      },
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate unique human-readable hotelCode (e.g. HOT-000001, HOT-000002)
HotelSchema.pre("validate", async function () {
  if (this.isNew && !this.hotelCode) {
    const lastHotel = await mongoose
      .model<IHotel>("Hotel")
      .findOne({ hotelCode: { $regex: /^HOT-\d+$/ } }, { hotelCode: 1 })
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    let nextNumber = 1;
    if (lastHotel && lastHotel.hotelCode) {
      const match = lastHotel.hotelCode.match(/^HOT-(\d+)$/);
      if (match && match[1]) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    this.hotelCode = `HOT-${String(nextNumber).padStart(6, "0")}`;
  }
});

const Hotel: Model<IHotel> =
  mongoose.models.Hotel || mongoose.model<IHotel>("Hotel", HotelSchema);

export default Hotel;
