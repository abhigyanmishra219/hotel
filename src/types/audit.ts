export const AUDIT_ACTIONS = {
  // Hotel Lifecycle
  HOTEL_CREATED: "HOTEL_CREATED",
  HOTEL_UPDATED: "HOTEL_UPDATED",
  HOTEL_ACTIVATED: "HOTEL_ACTIVATED",
  HOTEL_SUSPENDED: "HOTEL_SUSPENDED",

  // Manager Lifecycle
  MANAGER_CREATED: "MANAGER_CREATED",
  MANAGER_DISABLED: "MANAGER_DISABLED",
  MANAGER_ENABLED: "MANAGER_ENABLED",
  MANAGER_PASSWORD_RESET: "MANAGER_PASSWORD_RESET",

  // Plan Lifecycle
  PLAN_CREATED: "PLAN_CREATED",
  PLAN_UPDATED: "PLAN_UPDATED",
  PLAN_ACTIVATED: "PLAN_ACTIVATED",
  PLAN_DEACTIVATED: "PLAN_DEACTIVATED",

  // Subscription Lifecycle
  SUBSCRIPTION_ASSIGNED: "SUBSCRIPTION_ASSIGNED",
  SUBSCRIPTION_CHANGED: "SUBSCRIPTION_CHANGED",
  SUBSCRIPTION_SUSPENDED: "SUBSCRIPTION_SUSPENDED",
  SUBSCRIPTION_CANCELLED: "SUBSCRIPTION_CANCELLED",
  SUBSCRIPTION_REACTIVATED: "SUBSCRIPTION_REACTIVATED",

  // Security / Limits
  LIMIT_REACHED: "LIMIT_REACHED",
  UNAUTHORIZED_ACCESS: "UNAUTHORIZED_ACCESS",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS] | string;

export interface IAuditLogPopulated {
  _id: string;
  userId?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  hotelId?: {
    _id: string;
    hotelCode: string;
    name: string;
    city?: string;
  } | null;
  action: AuditAction;
  entity: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
}
