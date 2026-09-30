"use client";

import React from "react";
import {
  X,
  Calendar,
  BedDouble,
  User,
  CreditCard,
  CheckCircle2,
  Clock,
  Ban,
  Receipt,
  Phone,
  Mail,
  MapPin,
  Sparkles,
} from "lucide-react";

export interface BookingDetailsData {
  _id: string;
  bookingId: string;
  customer: {
    fullName: string;
    phone: string;
    email?: string;
    city?: string;
    state?: string;
  };
  room: {
    roomNumber: string;
    roomType: string;
    floor: number;
    pricePerNight: number;
  };
  checkInDate: string;
  checkOutDate: string;
  actualCheckIn?: string;
  actualCheckOut?: string;
  numberOfGuests: number;
  status: "CONFIRMED" | "CHECKED_IN" | "COMPLETED" | "CANCELLED";
  paymentStatus: "PAID" | "PARTIALLY_PAID" | "UNPAID";
  // Financial breakdown
  totalPrice: number;
  roomCharges?: number;
  additionalCharges?: number;
  discount?: number;
  taxAmount?: number;
  amountPaid: number;
  amountDue: number;
  paymentMethod?: string;
  createdAt: string;
}

interface BookingDetailsModalProps {
  booking: BookingDetailsData | null;
  onClose: () => void;
}

export default function BookingDetailsModal({
  booking,
  onClose,
}: BookingDetailsModalProps) {
  if (!booking) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed Stay
          </span>
        );
      case "CHECKED_IN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Clock className="w-3.5 h-3.5 animate-pulse" /> Currently Checked-In
          </span>
        );
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Calendar className="w-3.5 h-3.5" /> Confirmed
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <Ban className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  const getPaymentBadge = (payStatus: string) => {
    switch (payStatus) {
      case "PAID":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            PAID
          </span>
        );
      case "PARTIALLY_PAID":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            PARTIAL
          </span>
        );
      case "UNPAID":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            UNPAID
          </span>
        );
      default:
        return <span>{payStatus}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {booking.bookingId}
                </h3>
                {getStatusBadge(booking.status)}
              </div>
              <p className="text-xs text-slate-400">
                Booked on {new Date(booking.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Guest & Room Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Details */}
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <User className="w-3.5 h-3.5" /> Guest Information
              </div>
              <p className="text-sm font-bold text-white">
                {booking.customer?.fullName || "—"}
              </p>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-slate-400">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>{booking.customer?.phone || "—"}</span>
                </div>
                {booking.customer?.email && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{booking.customer.email}</span>
                  </div>
                )}
                {(booking.customer?.city || booking.customer?.state) && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {[booking.customer.city, booking.customer.state].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Room Details */}
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <BedDouble className="w-3.5 h-3.5" /> Room Allocation
              </div>
              <p className="text-sm font-bold text-white">
                Room {booking.room?.roomNumber || "—"}{" "}
                <span className="text-xs font-normal text-slate-400">
                  ({booking.room?.roomType || "—"})
                </span>
              </p>
              <div className="space-y-1 text-xs text-slate-300">
                <p>
                  <span className="text-slate-500">Floor:</span> {booking.room?.floor || "Ground"}
                </p>
                <p>
                  <span className="text-slate-500">Rate / Night:</span> ₹
                  {(booking.room?.pricePerNight || 0).toLocaleString()}
                </p>
                <p>
                  <span className="text-slate-500">Number of Guests:</span>{" "}
                  {booking.numberOfGuests || 1}
                </p>
              </div>
            </div>
          </div>

          {/* Stay Timeline */}
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5" /> Stay Dates & Timeline
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">SCHEDULED CHECK-IN</span>
                <span className="font-bold text-white">
                  {new Date(booking.checkInDate).toLocaleDateString()}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">SCHEDULED CHECK-OUT</span>
                <span className="font-bold text-white">
                  {new Date(booking.checkOutDate).toLocaleDateString()}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">ACTUAL CHECK-IN</span>
                <span className="font-semibold text-cyan-400">
                  {booking.actualCheckIn
                    ? new Date(booking.actualCheckIn).toLocaleString()
                    : "—"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">ACTUAL CHECK-OUT</span>
                <span className="font-semibold text-emerald-400">
                  {booking.actualCheckOut
                    ? new Date(booking.actualCheckOut).toLocaleString()
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <CreditCard className="w-3.5 h-3.5" /> Financial Summary
              </div>
              <div>{getPaymentBadge(booking.paymentStatus)}</div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300 divide-y divide-slate-800/60">
              <div className="flex justify-between pt-1">
                <span className="text-slate-400">Room Charges:</span>
                <span className="font-medium text-white">
                  ₹{(booking.roomCharges || booking.totalPrice || 0).toLocaleString()}
                </span>
              </div>
              {!!booking.additionalCharges && (
                <div className="flex justify-between pt-1">
                  <span className="text-slate-400">Additional Charges (Room Service):</span>
                  <span className="font-medium text-amber-300">
                    +₹{booking.additionalCharges.toLocaleString()}
                  </span>
                </div>
              )}
              {!!booking.taxAmount && (
                <div className="flex justify-between pt-1">
                  <span className="text-slate-400">Taxes & GST:</span>
                  <span className="font-medium text-slate-300">
                    +₹{booking.taxAmount.toLocaleString()}
                  </span>
                </div>
              )}
              {!!booking.discount && (
                <div className="flex justify-between pt-1">
                  <span className="text-slate-400">Discount:</span>
                  <span className="font-medium text-emerald-400">
                    -₹{booking.discount.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 text-sm font-bold">
                <span className="text-white">Total Amount:</span>
                <span className="text-amber-400">
                  ₹{(booking.totalPrice || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-1 text-xs">
                <span className="text-slate-400">Amount Paid:</span>
                <span className="font-bold text-emerald-400">
                  ₹{(booking.amountPaid || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-1 text-xs font-bold">
                <span className="text-slate-400">Outstanding Due:</span>
                <span className={booking.amountDue > 0 ? "text-rose-400" : "text-slate-400"}>
                  ₹{(booking.amountDue || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
