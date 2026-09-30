export const ROOM_TYPES = {
  SINGLE: "SINGLE",
  DOUBLE: "DOUBLE",
  DELUXE: "DELUXE",
  SUITE: "SUITE",
  FAMILY: "FAMILY",
} as const;

export type RoomType = (typeof ROOM_TYPES)[keyof typeof ROOM_TYPES];

export const VALID_ROOM_TYPES: readonly RoomType[] = [
  ROOM_TYPES.SINGLE,
  ROOM_TYPES.DOUBLE,
  ROOM_TYPES.DELUXE,
  ROOM_TYPES.SUITE,
  ROOM_TYPES.FAMILY,
];

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  SINGLE: "Single Room",
  DOUBLE: "Double Room",
  DELUXE: "Deluxe Room",
  SUITE: "Executive Suite",
  FAMILY: "Family Suite",
};

export const ROOM_STATUSES = {
  AVAILABLE: "AVAILABLE",
  RESERVED: "RESERVED",
  OCCUPIED: "OCCUPIED",
  CLEANING: "CLEANING",
  MAINTENANCE: "MAINTENANCE",
  OUT_OF_SERVICE: "OUT_OF_SERVICE",
} as const;

export type RoomStatus = (typeof ROOM_STATUSES)[keyof typeof ROOM_STATUSES];

export const VALID_ROOM_STATUSES: readonly RoomStatus[] = [
  ROOM_STATUSES.AVAILABLE,
  ROOM_STATUSES.RESERVED,
  ROOM_STATUSES.OCCUPIED,
  ROOM_STATUSES.CLEANING,
  ROOM_STATUSES.MAINTENANCE,
  ROOM_STATUSES.OUT_OF_SERVICE,
];

export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  OCCUPIED: "Occupied",
  CLEANING: "Cleaning",
  MAINTENANCE: "Maintenance",
  OUT_OF_SERVICE: "Out of Service",
};

export const STANDARD_AMENITIES = [
  "WiFi",
  "AC",
  "TV",
  "Mini Bar",
  "Room Service",
  "Balcony",
  "Bathtub",
  "Parking",
  "Breakfast",
] as const;

export type Amenity = (typeof STANDARD_AMENITIES)[number];

export interface IRoomData {
  _id: string;
  roomCode?: string;
  roomNumber: string;
  hotelId: string;
  floor: string;
  roomType: RoomType;
  type?: string;
  pricePerNight: number;
  capacity: number;
  amenities: string[];
  status: RoomStatus;
  description?: string;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
