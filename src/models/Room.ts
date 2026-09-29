import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type RoomStatus = "AVAILABLE" | "OCCUPIED" | "CLEANING" | "MAINTENANCE";

export interface IRoom extends Document {
  hotelId: Types.ObjectId;
  roomNumber: string;
  type: string;
  floor?: number;
  pricePerNight: number;
  status: RoomStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "Hotel ID is required"],
      index: true,
    },
    roomNumber: {
      type: String,
      required: [true, "Room number is required"],
      trim: true,
      maxlength: [20, "Room number cannot exceed 20 characters"],
    },
    type: {
      type: String,
      trim: true,
      default: "Deluxe Room",
    },
    floor: {
      type: Number,
      default: 1,
    },
    pricePerNight: {
      type: Number,
      required: [true, "Price per night is required"],
      min: [0, "Price per night cannot be negative"],
      default: 100,
    },
    status: {
      type: String,
      enum: {
        values: ["AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE"],
        message: "{VALUE} is not a valid room status",
      },
      default: "AVAILABLE",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate room numbers within the same hotel property
RoomSchema.index({ hotelId: 1, roomNumber: 1 }, { unique: true });

const Room: Model<IRoom> =
  mongoose.models.Room || mongoose.model<IRoom>("Room", RoomSchema);

export default Room;
