export type PlanStatus = "ACTIVE" | "INACTIVE";

export type HotelSubscriptionStatus =
  | "ACTIVE"
  | "TRIAL"
  | "EXPIRED"
  | "SUSPENDED"
  | "CANCELLED";

export type PaymentStatus = "PAID" | "PENDING" | "FAILED";

export const AVAILABLE_FEATURES = [
  { key: "booking", label: "Booking & Reservations", description: "Manage room bookings, check-ins, check-outs, and calendar availability" },
  { key: "billing", label: "Billing & Invoicing", description: "Automated billing, invoice generation, and folio management" },
  { key: "roomService", label: "Room Service", description: "Manage food orders, housekeeping requests, and maintenance tickets" },
  { key: "reports", label: "Operational Reports", description: "Comprehensive occupancy, revenue, and staff performance reports" },
  { key: "analytics", label: "Revenue Analytics", description: "Real-time KPI metrics, ADR, RevPAR, and forecasted trends" },
] as const;

export type StandardFeatureKey = (typeof AVAILABLE_FEATURES)[number]["key"];

export interface ISubscriptionPlanResponse {
  _id: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxRooms: number; // -1 represents Unlimited
  maxStaff: number; // -1 represents Unlimited
  maxReceptionists: number; // -1 represents Unlimited
  features: string[];
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ICreatePlanInput {
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxRooms: number;
  maxStaff: number;
  maxReceptionists: number;
  features: string[];
  status?: PlanStatus;
}

export interface IUpdatePlanInput {
  name?: string;
  description?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  maxRooms?: number;
  maxStaff?: number;
  maxReceptionists?: number;
  features?: string[];
  status?: PlanStatus;
}

export interface IHotelSubscriptionResponse {
  _id: string;
  hotelId: string | any;
  planId: ISubscriptionPlanResponse | string | any;
  status: HotelSubscriptionStatus;
  startDate: string;
  endDate: string;
  paymentStatus: PaymentStatus;
  isCurrent: boolean;
  changeReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IAssignSubscriptionInput {
  planId: string;
  billingCycle?: "MONTHLY" | "YEARLY";
  startDate?: string;
  endDate?: string;
  status?: HotelSubscriptionStatus;
  paymentStatus?: PaymentStatus;
  changeReason?: string;
}
