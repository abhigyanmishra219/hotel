import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { PaymentStatus, PaymentMethod, PAYMENT_STATUSES, PAYMENT_METHODS } from "@/types/invoice";

export interface IInvoice extends Document {
  invoiceId: string;
  hotelId: Types.ObjectId;
  bookingId: Types.ObjectId;
  customerId: Types.ObjectId;
  roomId: Types.ObjectId;
  pricePerNight: number;
  numberOfNights: number;
  roomAmount: number;
  additionalCharges: Array<{
    description: string;
    amount: number;
    date?: Date;
  }>;
  discount: number;
  tax: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod | string;
  paymentHistory: Array<{
    amount: number;
    paymentMethod: string;
    transactionRef?: string;
    recordedBy: Types.ObjectId;
    recordedAt: Date;
    notes?: string;
  }>;
  generatedBy: Types.ObjectId;
  generatedAt: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdditionalChargeSchema = new Schema(
  {
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PaymentRecordSchema = new Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, default: "CASH" },
    transactionRef: { type: String, trim: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recordedAt: { type: Date, default: Date.now },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceId: {
      type: String,
      required: true,
      trim: true,
    },
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      required: [true, "hotelId is required"],
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "bookingId is required"],
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "customerId is required"],
      index: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: [true, "roomId is required"],
      index: true,
    },
    pricePerNight: {
      type: Number,
      required: true,
      min: 0,
    },
    numberOfNights: {
      type: Number,
      required: true,
      min: 1,
    },
    roomAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    additionalCharges: {
      type: [AdditionalChargeSchema],
      default: [],
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    amountDue: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "UNPAID",
      index: true,
    },
    paymentMethod: {
      type: String,
      default: "CASH",
    },
    paymentHistory: {
      type: [PaymentRecordSchema],
      default: [],
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Crucial compound indexes for tenant isolation and billing lookup
InvoiceSchema.index({ hotelId: 1, invoiceId: 1 }, { unique: true });
InvoiceSchema.index({ hotelId: 1, bookingId: 1 });
InvoiceSchema.index({ hotelId: 1, customerId: 1 });
InvoiceSchema.index({ hotelId: 1, paymentStatus: 1 });
InvoiceSchema.index({ hotelId: 1, createdAt: -1 });

// Pre-validate middleware: auto-generate invoice sequential business ID if not present
InvoiceSchema.pre("validate", async function () {
  if (this.isNew && !this.invoiceId) {
    const count = await mongoose.models.Invoice
      ? await mongoose.models.Invoice.countDocuments({ hotelId: this.hotelId })
      : 0;
    const nextSeq = count + 1;
    this.invoiceId = `INV-${String(nextSeq).padStart(6, "0")}`;
  }
});

const Invoice: Model<IInvoice> =
  mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema);

export default Invoice;
