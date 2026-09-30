import mongoose, { Document, Model, Schema, Types } from "mongoose";
import {
  RoomType,
  RoomStatus,
  VALID_ROOM_TYPES,
  VALID_ROOM_STATUSES,
  ROOM_TYPES,
  ROOM_STATUSES,
} from "@/types/room";

export type { RoomType, RoomStatus };

export interface IRoom extends Document {
  roomCode: string;
  roomNumber: string;
  hotelId: Types.ObjectId;
  floor: string;
  roomType: RoomType;
  type?: string;
  pricePerNight: number;
  capacity: number;
  amenities: string[];
  status: RoomStatus;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    roomCode: {
      type: String,
      trim: true,
      index: true,
    },
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
      maxlength: [30, "Room number cannot exceed 30 characters"],
    },
    floor: {
      type: String,
      required: [true, "Floor is required"],
      trim: true,
      default: "1",
    },
    roomType: {
      type: String,
      enum: {
        values: VALID_ROOM_TYPES,
        message: "{VALUE} is not a valid room type",
      },
      default: ROOM_TYPES.DELUXE,
      index: true,
    },
    type: {
      type: String,
      trim: true,
    },
    pricePerNight: {
      type: Number,
      required: [true, "Price per night is required"],
      min: [1, "Price per night must be greater than 0"],
      default: 2500,
    },
    capacity: {
      type: Number,
      required: [true, "Room capacity is required"],
      min: [1, "Room capacity must be at least 1 guest"],
      default: 2,
    },
    amenities: {
      type: [String],
      default: ["WiFi", "AC", "TV"],
    },
    status: {
      type: String,
      enum: {
        values: VALID_ROOM_STATUSES,
        message: "{VALUE} is not a valid room status",
      },
      default: ROOM_STATUSES.AVAILABLE,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
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

// Auto-generate human-readable business ID: ROOM-000001, ROOM-000002 per property
RoomSchema.pre("validate", async function () {
  if (this.isNew && !this.roomCode) {
    const lastRoom = await mongoose
      .model<IRoom>("Room")
      .findOne({ roomCode: { $regex: /^ROOM-\d+$/ } }, { roomCode: 1 })
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    let nextNumber = 1;
    if (lastRoom && lastRoom.roomCode) {
      const match = lastRoom.roomCode.match(/^ROOM-(\d+)$/);
      if (match && match[1]) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    this.roomCode = `ROOM-${String(nextNumber).padStart(6, "0")}`;
  }

  // Ensure legacy type field stays in sync with roomType
  if (this.roomType && !this.type) {
    this.type = this.roomType;
  }
});

// Prevent duplicate room numbers within the same hotel property (hotelId + roomNumber unique)
RoomSchema.index({ hotelId: 1, roomNumber: 1 }, { unique: true });
RoomSchema.index({ hotelId: 1, status: 1 });
RoomSchema.index({ hotelId: 1, isActive: 1 });
RoomSchema.index({ hotelId: 1, roomType: 1 });

const Room: Model<IRoom> =
  mongoose.models.Room || mongoose.model<IRoom>("Room", RoomSchema);

export default Room;
