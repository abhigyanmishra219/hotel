import { CustomerGender, CustomerIdType } from "@/models/Customer";

export interface ICustomerData {
  _id: string;
  customerId: string;
  hotelId: string;
  hotelName?: string;
  fullName: string;
  phone: string;
  email?: string;
  dateOfBirth?: string | Date;
  gender: CustomerGender;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  idType: CustomerIdType;
  idNumber?: string;
  notes?: string;
  isActive: boolean;
  bookingCount?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ICustomerQueryParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "fullName" | "phone" | "createdAt" | "customerId";
  sortOrder?: "asc" | "desc";
}

export interface ICustomerFormData {
  fullName: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  gender?: CustomerGender;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  idType?: CustomerIdType;
  idNumber?: string;
  notes?: string;
}
