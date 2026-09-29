export const USER_ROLES = {
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  MANAGER: "MANAGER",
  RECEPTIONIST: "RECEPTIONIST",
  STAFF: "STAFF",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const VALID_ROLES: readonly UserRole[] = [
  USER_ROLES.SYSTEM_ADMIN,
  USER_ROLES.MANAGER,
  USER_ROLES.RECEPTIONIST,
  USER_ROLES.STAFF,
];

export function isValidRole(role: string): role is UserRole {
  return VALID_ROLES.includes(role as UserRole);
}

export function getRoleDashboardPath(role: UserRole | string): string {
  switch (role) {
    case USER_ROLES.SYSTEM_ADMIN:
      return "/admin/dashboard";
    case USER_ROLES.MANAGER:
      return "/manager/dashboard";
    case USER_ROLES.RECEPTIONIST:
      return "/receptionist/dashboard";
    case USER_ROLES.STAFF:
      return "/staff/dashboard";
    default:
      return "/";
  }
}
