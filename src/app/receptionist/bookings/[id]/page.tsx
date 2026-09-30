"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  Calendar,
  User,
  DoorOpen,
  Users,
  Receipt,
  Clock,
  Ban,
  Edit2,
  ArrowLeft,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Building2,
  FileText,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { IBookingData } from "@/types/booking";

export default function ReceptionistBookingDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { token } = useUser();

  const [booking, setBooking] = useState<IBookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetchBooking = useCallback(async () => {
    if (!token || !resolvedParams.id) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/bookings/${resolvedParams.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load booking details");
      }

      setBooking(data.booking);
    } catch (err: any) {
      setError(err.message || "Failed to load booking record");
    } finally {
      setLoading(false);
    }
  }, [token, resolvedParams.id]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const handleCancelBooking = async () => {
    if (!booking) return;
    setIsCancelling(true);
    setCancelError(null);

    try {
      const res = await fetch(`/api/bookings/${booking._id}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel booking");
      }

      setIsCancelModalOpen(false);
      fetchBooking();
    } catch (err: any) {
      setCancelError(err.message || "Failed to cancel reservation");
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
        <p className="text-sm font-medium">Loading booking dossier...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Booking Record Unavailable</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          {error || "The requested booking does not exist or you do not have permission to view it."}
        </p>
        <Link
          href="/receptionist/bookings"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Bookings</span>
        </Link>
      </div>
    );
  }

  const customer: any = booking.customerId || {};
  const room: any = booking.roomId || {};
  const createdBy: any = booking.createdBy || {};

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Breadcrumb / Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/receptionist/bookings"
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-0.5">
              <span>Reservation Dossier</span>
              <span>•</span>
              <span className="font-mono text-white">{booking.bookingId}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Booking Overview
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {booking.status === "CONFIRMED" && (
            <>
              <Link
                href={`/receptionist/bookings/${booking._id}/edit`}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Edit</span>
              </Link>
              <button
                onClick={() => {
                  setCancelError(null);
                  setIsCancelModalOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancel Reservation</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Status & Schedule Banner */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold ${
                booking.status === "CONFIRMED"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : booking.status === "CANCELLED"
                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                  : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  booking.status === "CONFIRMED"
                    ? "bg-emerald-400 animate-pulse"
                    : booking.status === "CANCELLED"
                    ? "bg-rose-400"
                    : "bg-blue-400"
                }`}
              />
              {booking.status}
            </span>

            <span className="text-xs text-slate-400 font-mono">
              Booked via: <strong className="text-white">{booking.bookingSource}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>
                {new Date(booking.checkInDate).toLocaleDateString("en-US", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className="text-slate-500 mx-1">→</span>
              <span>
                {new Date(booking.checkOutDate).toLocaleDateString("en-US", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono font-bold text-[11px] border border-cyan-500/20">
              {booking.numberOfNights} {booking.numberOfNights === 1 ? "Night" : "Nights"}
            </span>
          </div>
        </div>

        <div className="text-right md:border-l md:border-slate-800 md:pl-6">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Total Booking Valuation
          </span>
          <span className="text-2xl sm:text-3xl font-black text-white">
            ₹{booking.totalAmount?.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 block">
            ₹{booking.pricePerNight?.toLocaleString()} / night
          </span>
        </div>
      </div>

      {/* Grid Information Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Guest & Room Info */}
        <div className="space-y-6">
          {/* Guest Profile Box */}
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Guest Information</h3>
              </div>
              {customer._id && (
                <Link
                  href={`/receptionist/customers/${customer._id}`}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition underline"
                >
                  View Profile
                </Link>
              )}
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Full Name:</span>
                <span className="font-bold text-white">{customer.fullName || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Customer ID:</span>
                <span className="font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded text-[11px]">
                  {customer.customerId || "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Phone Number:</span>
                <span className="font-mono text-slate-200">{customer.phone || "N/A"}</span>
              </div>
              {customer.email && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="text-slate-200">{customer.email}</span>
                </div>
              )}
              {customer.idType && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Identity Doc:</span>
                  <span className="text-slate-200">
                    {customer.idType} ({customer.idNumber || "Not recorded"})
                  </span>
                </div>
              )}
              {customer.city && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Location:</span>
                  <span className="text-slate-200">
                    {[customer.city, customer.state, customer.country]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Room Allocation Box */}
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <DoorOpen className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Room Allocation</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Floor {room.floor || 1}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Room Number:</span>
                <span className="font-extrabold text-white text-sm">
                  Room {room.roomNumber || "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Room Category:</span>
                <span className="font-semibold text-slate-200">{room.roomType || "Standard"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Room Capacity:</span>
                <span className="text-slate-200">Max {room.capacity || 2} Guests</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current Occupancy:</span>
                <span className="font-semibold text-white">
                  {booking.adults} {booking.adults === 1 ? "Adult" : "Adults"}
                  {booking.children > 0 ? ` + ${booking.children} Child` : ""}
                </span>
              </div>

              {room.amenities && room.amenities.length > 0 && (
                <div className="pt-2">
                  <span className="text-slate-400 block mb-1.5">Amenities:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {room.amenities.map((am: string) => (
                      <span
                        key={am}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                      >
                        {am}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Financial Breakdown & Audit Ledger */}
        <div className="space-y-6">
          {/* Price Snapshot Calculation */}
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Financial Breakdown</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Snapshotted Rate
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Room Rate ({booking.numberOfNights} Nights × ₹{booking.pricePerNight}):</span>
                <span className="font-mono text-white">₹{booking.roomAmount?.toLocaleString()}</span>
              </div>

              {booking.discount > 0 && (
                <div className="flex items-center justify-between text-emerald-400">
                  <span>Direct Discount:</span>
                  <span className="font-mono">- ₹{booking.discount?.toLocaleString()}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-300">
                <span>GST Tax (12%):</span>
                <span className="font-mono text-white">₹{booking.tax?.toLocaleString()}</span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="font-bold text-white text-sm">Total Invoiced Amount:</span>
                <span className="font-black text-white text-lg">
                  ₹{booking.totalAmount?.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Audit Ledger & Notes */}
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Audit & Operational Notes</h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Created By:</span>
                <span className="text-slate-200">
                  {createdBy.name || "Reception Desk"} ({createdBy.role || "STAFF"})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Created On:</span>
                <span className="text-slate-200 font-mono">
                  {new Date(booking.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Last Modified:</span>
                <span className="text-slate-200 font-mono">
                  {new Date(booking.updatedAt).toLocaleString()}
                </span>
              </div>

              {booking.notes && (
                <div className="pt-2">
                  <span className="text-slate-400 block mb-1">Special Instructions:</span>
                  <p className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-slate-300 text-xs italic">
                    "{booking.notes}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CANCEL MODAL */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto mb-3">
                <Ban className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">
                Cancel Booking {booking.bookingId}?
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Are you sure you want to cancel this reservation for{" "}
                <strong className="text-white">{customer.fullName || "the guest"}</strong>?
                The room will immediately be released back into available inventory.
              </p>
            </div>

            {cancelError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleCancelBooking}
                className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold shadow-lg shadow-rose-500/20 transition flex items-center gap-2 disabled:opacity-60"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Cancel Booking</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
