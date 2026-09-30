import { TaskPriority, TASK_PRIORITIES } from "./housekeeping";

export const MAINTENANCE_STATUSES = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CANCELLED",
] as const;
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export interface IMaintenanceRequestData {
  _id: string;
  requestId: string;
  hotelId: string;
  roomId: {
    _id: string;
    roomNumber: string;
    roomType: string;
    floor: string;
    status: string;
  } | any;
  reportedBy: {
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
  issue: string;
  priority: TaskPriority;
  status: MaintenanceStatus;
  notes?: string;
  startedAt?: string | Date;
  resolvedAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}
