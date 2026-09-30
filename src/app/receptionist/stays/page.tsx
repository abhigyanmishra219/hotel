"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  DoorClosed,
  DoorOpen,
  Search,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  CalendarCheck,
  Calendar,
  Users,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { IBookingData } from "@/types/booking";
import CheckOutModal from "@/components/operations/CheckOutModal";

export default function ReceptionistStaysPage() {
  const { token } = useUser();

  const [activeStays, setActiveStays] = useState<IBookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [selectedBooking, setSelectedBooking] = useState<IBookingData | null>(null);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);

  const fetchStays = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/stays?search=${encodeURIComponent(search.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load active stays");
      setActiveStays(data.stays || []);
    } catch (err: any) {
      setError(err.message || "Failed to load active stays");
    } finally {
      setLoading(false);
    }
  }, [token, search]);

  useEffect(() => {
    fetchStays();
  }, [fetchStays]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            <DoorOpen className="w-4 h-4" />
            <span>Front Desk In-House Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Active Guest Stays
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Monitor all currently occupied hotel rooms, arrival timestamps, and expected departure dates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStays}
            disabled={loading}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700/80 transition"
            title="Refresh active stays"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
          <Link
            href="/receptionist/check-in"
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-cyan-500/20"
          >
            <DoorOpen className="w-4 h-4" />
            <span>Process Check-in</span>
          </Link>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search guest name, room, phone, booking ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
          />
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {activeStays.length} active in-house {activeStays.length === 1 ? "stay" : "stays"}
        </span>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
            <p className="text-sm font-medium">Loading in-house guest stays...</p>
          </div>
        ) : activeStays.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400 mx-auto mb-4">
              <DoorClosed className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">No active stays currently</h3>
            <p className="text-slate-400 text-xs max-w-md mx-auto mt-1 mb-6">
              {search
                ? "No in-house stays match your search query."
                : "Check in arriving guests to activate in-house room occupancy."}
            </p>
            <Link
              href="/receptionist/check-in"
              className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-cyan-500/20"
            >
              <span>Go to Arrivals &amp; Check-in</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Booking ID</th>
                  <th className="py-3.5 px-4">Guest</th>
                  <th className="py-3.5 px-4">Room</th>
                  <th className="py-3.5 px-4">Checked In At</th>
                  <th className="py-3.5 px-4">Expected Departure</th>
                  <th className="py-3.5 px-4">Guests</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                {activeStays.map((b: any) => (
                  <tr key={b._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-4 sm:px-6">
                      <Link
                        href={`/receptionist/bookings/${b._id}`}
                        className="font-mono font-bold text-cyan-400 hover:text-cyan-300 transition block"
                      >
                        {b.bookingId}
                      </Link>
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
                      <div className="font-bold text-amber-400 flex items-center gap-1.5">
                        <DoorOpen className="w-3.5 h-3.5" />
                        <span>Room {b.roomId?.roomNumber || "N/A"}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        {b.roomId?.roomType} • Fl. {b.roomId?.floor}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="text-slate-200">
                        {b.actualCheckInDate
                          ? new Date(b.actualCheckInDate).toLocaleDateString()
                          : new Date(b.checkInDate).toLocaleDateString()}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        By: {b.checkedInBy?.name || "Front Desk"}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="text-slate-200">
                        {new Date(b.checkOutDate).toLocaleDateString()}
                      </div>
                      <span className="text-[10px] text-cyan-400 font-mono">
                        {b.numberOfNights} Nights total
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
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <span>In Stay</span>
                      </span>
                    </td>

                    <td className="py-4 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/receptionist/bookings/${b._id}`}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => {
                            setSelectedBooking(b);
                            setIsCheckOutOpen(true);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition flex items-center gap-1"
                        >
                          <DoorClosed className="w-3.5 h-3.5" />
                          <span>Check Out</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CHECK-OUT MODAL */}
      <CheckOutModal
        booking={selectedBooking}
        isOpen={isCheckOutOpen}
        portalType="receptionist"
        onClose={() => {
          setIsCheckOutOpen(false);
          setSelectedBooking(null);
        }}
        onSuccess={() => {
          fetchStays();
        }}
      />
    </div>
  );
}
