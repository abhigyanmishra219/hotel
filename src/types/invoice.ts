import { ICustomerData } from "./customer";
import { IRoomData } from "./room";
import { IBookingData } from "./booking";

export const PAYMENT_STATUSES = ["UNPAID", "PARTIALLY_PAID", "PAID"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["CASH", "CARD", "UPI", "BANK_TRANSFER", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface IAdditionalCharge {
  description: string;
  amount: number;
  date?: string | Date;
}

export interface IPaymentRecord {
  amount: number;
  paymentMethod: PaymentMethod | string;
  transactionRef?: string;
  recordedBy?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  } | string;
  recordedAt: string | Date;
  notes?: string;
}

export interface IInvoiceData {
  _id: string;
  invoiceId: string;
  hotelId: string;
  hotelName?: string;
  bookingId: string | IBookingData;
  customerId: string | ICustomerData;
  roomId: string | IRoomData;
  roomAmount: number;
  numberOfNights: number;
  pricePerNight: number;
  additionalCharges: IAdditionalCharge[];
  discount: number;
  tax: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod | string;
  paymentHistory?: IPaymentRecord[];
  generatedBy?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  } | string;
  generatedAt: string | Date;
  notes?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IInvoiceQueryParams {
  search?: string;
  paymentStatus?: PaymentStatus | "ALL";
  customerId?: string;
  bookingId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "totalAmount" | "amountDue" | "invoiceId";
  sortOrder?: "asc" | "desc";
}
