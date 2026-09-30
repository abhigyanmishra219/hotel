export const HOUSEKEEPING_TYPES = [
  "ROOM_CLEANING",
  "DEEP_CLEANING",
  "INSPECTION",
] as const;
export type HousekeepingType = (typeof HOUSEKEEPING_TYPES)[number];

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = [
  "PENDING",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface IHousekeepingTaskData {
  _id: string;
  taskId: string;
  hotelId: string;
  roomId: {
    _id: string;
    roomNumber: string;
    roomType: string;
    floor: string;
    status: string;
  } | any;
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  } | any;
  bookingId?: {
    _id: string;
    bookingId: string;
    customerId?: any;
  } | any;
  type: HousekeepingType;
  priority: TaskPriority;
  status: TaskStatus;
  notes?: string;
  startedAt?: string | Date;
  completedAt?: string | Date;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  } | any;
  createdAt: string | Date;
  updatedAt: string | Date;
}
