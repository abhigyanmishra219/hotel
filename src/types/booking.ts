import { BookingStatus, BookingSource } from "@/models/Booking";
import { ICustomerData } from "./customer";
import { IRoomData } from "./room";

export interface IBookingData {
  _id: string;
  bookingId: string;
  hotelId: string;
  hotelName?: string;
  customerId: string | ICustomerData;
  roomId: string | IRoomData;
  checkInDate: string | Date;
  checkOutDate: string | Date;
  numberOfGuests: number;
  adults: number;
  children: number;
  pricePerNight: number;
  numberOfNights: number;
  roomAmount: number;
  discount: number;
  tax: number;
  totalAmount: number;
  status: BookingStatus;
  bookingSource: BookingSource;
  notes?: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  } | string;
  checkInAt?: string | Date;
  checkOutAt?: string | Date;
  checkedInAt?: string | Date;
  actualCheckInAt?: string | Date;
  checkedInBy?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  } | string;
  actualCheckInDate?: string | Date;
  actualCheckOutDate?: string | Date;
  actualCheckOutAt?: string | Date;
  checkedOutBy?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  } | string;
  checkInNotes?: string;
  checkOutNotes?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IBookingQueryParams {
  search?: string;
  status?: BookingStatus | "ALL";
  dateFilter?: "ALL" | "TODAY" | "UPCOMING" | "PAST";
  startDate?: string;
  endDate?: string;
  roomId?: string;
  customerId?: string;
  page?: number;
  limit?: number;
  sortBy?: "checkInDate" | "createdAt" | "totalAmount" | "bookingId";
  sortOrder?: "asc" | "desc";
}

export interface IBookingCreateInput {
  customerId: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children?: number;
  discount?: number;
  notes?: string;
  bookingSource?: BookingSource;
}

export interface IBookingUpdateInput {
  roomId?: string;
  checkInDate?: string;
  checkOutDate?: string;
  adults?: number;
  children?: number;
  discount?: number;
  notes?: string;
  status?: BookingStatus;
}
