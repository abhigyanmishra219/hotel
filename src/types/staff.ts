import { UserRole } from "./roles";

export interface IStaffMember {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  hotelId: string;
  hotelName?: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IStaffQueryParams {
  search?: string;
  status?: "ALL" | "ACTIVE" | "INACTIVE";
  role?: string;
  page?: number;
  limit?: number;
  sortBy?: "name" | "email" | "createdAt" | "isActive";
  sortOrder?: "asc" | "desc";
}

export interface IStaffCreateInput {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role?: string; // Evaluated/enforced on server side
}

export interface IStaffUpdateInput {
  name?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}

/**
 * Generates a strong random temporary password for staff account creation.
 * Follows password policy: at least 10 chars, uppercase, lowercase, digit, special char.
 */
export function generateTemporaryPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%^&*";

  let password = "";
  password += upper.charAt(Math.floor(Math.random() * upper.length));
  password += lower.charAt(Math.floor(Math.random() * lower.length));
  password += digits.charAt(Math.floor(Math.random() * digits.length));
  password += special.charAt(Math.floor(Math.random() * special.length));

  const allChars = upper + lower + digits + special;
  for (let i = password.length; i < 10; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }

  // Shuffle the password characters
  return password
    .split("")
    .sort(() => 0.5 - Math.random())
    .join("");
}
