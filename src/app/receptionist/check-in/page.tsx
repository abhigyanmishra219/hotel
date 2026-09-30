"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  DoorOpen,
  DoorClosed,
  CalendarCheck,
  Calendar,
  User,
  Search,
  AlertCircle,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { IBookingData } from "@/types/booking";
import CheckInModal from "@/components/operations/CheckInModal";
import CheckOutModal from "@/components/operations/CheckOutModal";

export default function ReceptionistCheckInPage() {
  const { token } = useUser();

  const [activeTab, setActiveTab] = useState<"ARRIVALS" | "ACTIVE_STAYS">("ARRIVALS");
  const [arrivals, setArrivals] = useState<IBookingData[]>([]);
  const [activeStays, setActiveStays] = useState<IBookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Modals
  const [selectedCheckInBooking, setSelectedCheckInBooking] = useState<IBookingData | null>(null);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);

  const [selectedCheckOutBooking, setSelectedCheckOutBooking] = useState<IBookingData | null>(null);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);

  const fetchOperationsData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch Expected Arrivals (CONFIRMED bookings)
      const arrivalsRes = await fetch(`/api/bookings?status=CONFIRMED&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const arrivalsData = await arrivalsRes.json();
      if (arrivalsRes.ok) {
        setArrivals(arrivalsData.bookings || []);
      }

      // 2. Fetch Active Stays (CHECKED_IN bookings)
      const staysRes = await fetch(`/api/stays`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const staysData = await staysRes.json();
      if (staysRes.ok) {
        setActiveStays(staysData.stays || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load check-in ledger");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOperationsData();
  }, [fetchOperationsData]);

  // Filter lists based on search
  const filteredArrivals = arrivals.filter((b: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.bookingId?.toLowerCase().includes(q) ||
      b.customerId?.fullName?.toLowerCase().includes(q) ||
      b.customerId?.phone?.toLowerCase().includes(q) ||
      b.roomId?.roomNumber?.toLowerCase().includes(q)
    );
  });

  const filteredActiveStays = activeStays.filter((b: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.bookingId?.toLowerCase().includes(q) ||
      b.customerId?.fullName?.toLowerCase().includes(q) ||
      b.customerId?.phone?.toLowerCase().includes(q) ||
      b.roomId?.roomNumber?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            <DoorOpen className="w-4 h-4" />
            <span>Front Desk Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Guest Check-in &amp; Check-out
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Process guest arrivals, activate room occupancy, and execute check-out settlements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOperationsData}
            disabled={loading}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700/80 transition"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
          <Link
            href="/receptionist/bookings/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-cyan-500/20 transition"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Walk-in Reservation</span>
          </Link>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-950/60 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("ARRIVALS")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === "ARRIVALS"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <DoorOpen className="w-4 h-4" />
            <span>Expected Arrivals ({arrivals.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("ACTIVE_STAYS")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === "ACTIVE_STAYS"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <DoorClosed className="w-4 h-4" />
            <span>Current In-House Stays ({activeStays.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search guest, room, phone, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: EXPECTED ARRIVALS */}
      {activeTab === "ARRIVALS" && (
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
              <p className="text-sm font-medium">Loading expected arrivals...</p>
            </div>
          ) : filteredArrivals.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400 mx-auto mb-4">
                <DoorOpen className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">No guests scheduled for check-in today</h3>
              <p className="text-slate-400 text-xs max-w-md mx-auto mt-1 mb-6">
                {search
                  ? "No reservations match your search query."
                  : "All current reservations have either been checked in or no new arrivals are due."}
              </p>
              <Link
                href="/receptionist/bookings/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-cyan-500/20"
              >
                <span>Create Walk-in Booking</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">Booking ID</th>
                    <th className="py-3.5 px-4">Guest</th>
                    <th className="py-3.5 px-4">Room Allocation</th>
                    <th className="py-3.5 px-4">Stay Schedule</th>
                    <th className="py-3.5 px-4">Guests</th>
                    <th className="py-3.5 px-4">Total Amount</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                  {filteredArrivals.map((b: any) => (
                    <tr key={b._id} className="hover:bg-slate-800/30 transition">
                      <td className="py-4 px-4 sm:px-6">
                        <Link
                          href={`/receptionist/bookings/${b._id}`}
                          className="font-mono font-bold text-cyan-400 hover:text-cyan-300 transition block"
                        >
                          {b.bookingId}
                        </Link>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Source: {b.bookingSource}
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
                        <div className="font-bold text-slate-200 flex items-center gap-1.5">
                          <DoorOpen className="w-3.5 h-3.5 text-cyan-400" />
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
                        <span className="text-[10px] text-cyan-400 font-mono font-semibold">
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
                      </td>

                      <td className="py-4 px-4 sm:px-6 text-right">
                        <button
                          onClick={() => {
                            setSelectedCheckInBooking(b);
                            setIsCheckInOpen(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition flex items-center gap-1.5 ml-auto"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Check In</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CURRENT ACTIVE STAYS */}
      {activeTab === "ACTIVE_STAYS" && (
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
              <p className="text-sm font-medium">Loading current in-house stays...</p>
            </div>
          ) : filteredActiveStays.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400 mx-auto mb-4">
                <DoorClosed className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">No guests are currently checked in</h3>
              <p className="text-slate-400 text-xs max-w-md mx-auto mt-1 mb-6">
                Check in an arriving guest from the Expected Arrivals tab to monitor in-house stays.
              </p>
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
                    <th className="py-3.5 px-4">Expected Check-out</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                  {filteredActiveStays.map((b: any) => (
                    <tr key={b._id} className="hover:bg-slate-800/30 transition">
                      <td className="py-4 px-4 sm:px-6">
                        <Link
                          href={`/receptionist/bookings/${b._id}`}
                          className="font-mono font-bold text-cyan-400 hover:text-cyan-300 transition block"
                        >
                          {b.bookingId}
                        </Link>
                        <span className="text-[10px] text-slate-500">
                          {b.numberOfNights} Nights stay
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
                            ? new Date(b.actualCheckInDate).toLocaleString()
                            : new Date(b.checkInDate).toLocaleDateString()}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          By: {b.checkedInBy?.name || "Front Desk"}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-slate-200">
                          {new Date(b.checkOutDate).toLocaleDateString()}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          <span>In Stay</span>
                        </span>
                      </td>

                      <td className="py-4 px-4 sm:px-6 text-right">
                        <button
                          onClick={() => {
                            setSelectedCheckOutBooking(b);
                            setIsCheckOutOpen(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition flex items-center gap-1.5 ml-auto"
                        >
                          <DoorClosed className="w-3.5 h-3.5" />
                          <span>Check Out</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CHECK-IN MODAL */}
      <CheckInModal
        booking={selectedCheckInBooking}
        isOpen={isCheckInOpen}
        onClose={() => {
          setIsCheckInOpen(false);
          setSelectedCheckInBooking(null);
        }}
        onSuccess={() => {
          fetchOperationsData();
        }}
      />

      {/* CHECK-OUT MODAL */}
      <CheckOutModal
        booking={selectedCheckOutBooking}
        isOpen={isCheckOutOpen}
        portalType="receptionist"
        onClose={() => {
          setIsCheckOutOpen(false);
          setSelectedCheckOutBooking(null);
        }}
        onSuccess={() => {
          fetchOperationsData();
        }}
      />
    </div>
  );
}
