import { TaskPriority, TASK_PRIORITIES } from "./housekeeping";

export const ROOM_SERVICE_STATUSES = [
  "PENDING",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export type RoomServiceStatus = (typeof ROOM_SERVICE_STATUSES)[number];

export interface IRoomServiceItem {
  item: string;
  quantity: number;
}

export interface IRoomServiceRequestData {
  _id: string;
  requestId: string;
  hotelId: string;
  roomId: {
    _id: string;
    roomNumber: string;
    roomType: string;
    floor: string;
  } | any;
  bookingId?: {
    _id: string;
    bookingId: string;
    customerId?: any;
  } | any;
  requestedBy?: {
    _id: string;
    name: string;
    role: string;
  } | any;
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  } | any;
  items: IRoomServiceItem[];
  notes?: string;
  priority: TaskPriority;
  status: RoomServiceStatus;
  startedAt?: string | Date;
  completedAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}
