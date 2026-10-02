"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Plus,
  Search,
  Eye,
  Edit2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Ban,
  DoorOpen,
  Receipt,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { IBookingData } from "@/types/booking";

export default function ManagerBookingsPage() {
  const { token } = useUser();

  const [bookings, setBookings] = useState<IBookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CONFIRMED" | "CANCELLED">("ALL");
  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "UPCOMING" | "PAST">("ALL");
  const [sortBy, setSortBy] = useState<"checkInDate" | "createdAt" | "totalAmount" | "bookingId">("checkInDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Cancellation Modal State
  const [targetBooking, setTargetBooking] = useState<IBookingData | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (dateFilter !== "ALL") params.set("dateFilter", dateFilter);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);

      const res = await fetch(`/api/bookings?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load bookings");
      }

      setBookings(data.bookings || []);
    } catch (err: any) {
      setError(err.message || "Failed to load booking list");
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter, dateFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCancelBooking = async () => {
    if (!targetBooking) return;
    setIsCancelling(true);
    setCancelError(null);

    try {
      const res = await fetch(`/api/bookings/${targetBooking._id}/cancel`, {
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
      setTargetBooking(null);
      fetchBookings();
    } catch (err: any) {
      setCancelError(err.message || "An error occurred while cancelling booking");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            <CalendarCheck className="w-4 h-4" />
            <span>Property Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Hotel Reservations
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Oversee room occupancy, manage guest reservations, and monitor booking status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchBookings}
            disabled={loading}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700/80 transition"
            title="Refresh bookings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
          </button>
          <Link
            href="/manager/bookings/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20 transition duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>New Booking</span>
          </Link>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search booking ID, guest, phone, room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700/60 rounded-xl p-1 text-xs">
            {(["ALL", "CONFIRMED", "CANCELLED"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  statusFilter === st
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {st === "ALL" ? "All Status" : st === "CONFIRMED" ? "Confirmed" : "Cancelled"}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700/60 rounded-xl p-1 text-xs">
            {(["ALL", "TODAY", "UPCOMING", "PAST"] as const).map((df) => (
              <button
                key={df}
                onClick={() => setDateFilter(df)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  dateFilter === df
                    ? "bg-slate-700 text-amber-300 border border-slate-600 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {df === "ALL" ? "All Dates" : df === "TODAY" ? "Today" : df === "UPCOMING" ? "Upcoming" : "Past"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Bookings Table */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
            <p className="text-sm font-medium">Loading reservations...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400 mx-auto mb-4">
              <CalendarCheck className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">No bookings found</h3>
            <p className="text-slate-400 text-xs max-w-md mx-auto mt-1 mb-6">
              {search || statusFilter !== "ALL" || dateFilter !== "ALL"
                ? "No reservations match your filter criteria."
                : "Create a room reservation to start managing hotel bookings."}
            </p>
            {!search && statusFilter === "ALL" && (
              <Link
                href="/manager/bookings/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-amber-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Booking</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Booking ID</th>
                  <th className="py-3.5 px-4">Guest</th>
                  <th className="py-3.5 px-4">Room</th>
                  <th className="py-3.5 px-4">Stay Dates</th>
                  <th className="py-3.5 px-4">Guests</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                {bookings.map((b: any) => (
                  <tr key={b._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-4 sm:px-6">
                      <Link
                        href={`/manager/bookings/${b._id}`}
                        className="font-mono font-bold text-amber-400 hover:text-amber-300 transition block"
                      >
                        {b.bookingId}
                      </Link>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-semibold text-white">
                        {b.customerId?.fullName || "Guest"}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {b.customerId?.phone}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-200">
                        <DoorOpen className="w-3.5 h-3.5 text-amber-400" />
                        <span>Room {b.roomId?.roomNumber || "N/A"}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        {b.roomId?.roomType} • Fl. {b.roomId?.floor}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="text-slate-200">
                        <span>{new Date(b.checkInDate).toLocaleDateString()}</span>
                        <span className="text-slate-500 mx-1">→</span>
                        <span>{new Date(b.checkOutDate).toLocaleDateString()}</span>
                      </div>
                      <span className="text-[10px] text-amber-400 font-mono font-semibold">
                        {b.numberOfNights} {b.numberOfNights === 1 ? "Night" : "Nights"}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="text-slate-200">
                        {b.adults} {b.adults === 1 ? "Adult" : "Adults"}
                      </span>
                      {b.children > 0 && (
                        <span className="text-[10px] text-slate-400 block">
                          +{b.children} Child
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-bold text-white text-sm">
                        ₹{b.totalAmount?.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        ₹{b.pricePerNight}/night
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          b.status === "CONFIRMED"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : b.status === "CANCELLED"
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            b.status === "CONFIRMED"
                              ? "bg-emerald-400 animate-pulse"
                              : b.status === "CANCELLED"
                              ? "bg-rose-400"
                              : "bg-blue-400"
                          }`}
                        />
                        {b.status}
                      </span>
                    </td>

                    <td className="py-4 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/manager/bookings/${b._id}`}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                          title="View Dossier"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/manager/billing?bookingId=${b._id}`}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 transition"
                          title="View Billing & Folio"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </Link>
                        {b.status === "CONFIRMED" && (
                          <>
                            <Link
                              href={`/manager/bookings/${b._id}/edit`}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                              title="Edit Booking"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={() => {
                                setTargetBooking(b);
                                setCancelError(null);
                                setIsCancelModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition"
                              title="Cancel Booking"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CANCEL BOOKING CONFIRMATION MODAL */}
      {isCancelModalOpen && targetBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto mb-3">
                <Ban className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">
                Cancel Booking {targetBooking.bookingId}?
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Are you sure you want to cancel this reservation for{" "}
                <strong className="text-white">{(targetBooking.customerId as any)?.fullName || "the guest"}</strong>?
                The room will immediately become available for other guests.
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
                onClick={() => {
                  setIsCancelModalOpen(false);
                  setTargetBooking(null);
                }}
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
