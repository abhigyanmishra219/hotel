import { UserRole } from "./roles";

export interface IReceptionistMember {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  hotelId: string;
  hotelName?: string;
  hotelCode?: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IReceptionistQueryParams {
  search?: string;
  status?: "ALL" | "ACTIVE" | "INACTIVE";
  page?: number;
  limit?: number;
  sortBy?: "name" | "email" | "createdAt" | "isActive";
  sortOrder?: "asc" | "desc";
}

export interface IReceptionistCreateInput {
  name: string;
  email: string;
  phone?: string;
  password?: string;
}

export interface IReceptionistUpdateInput {
  name?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}
