"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BedDouble,
  Calendar,
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Plus,
  DoorOpen,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

interface AvailableRoom {
  _id: string;
  roomNumber: string;
  floor: string;
  roomType: string;
  pricePerNight: number;
  estimatedTotal: number;
  capacity: number;
  amenities: string[];
  status: string;
}

export default function ReceptionistAvailableRoomsPage() {
  const router = useRouter();
  const { token } = useUser();

  const getTodayString = () => new Date().toISOString().split("T")[0];
  const getTomorrowString = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  const [checkInDate, setCheckInDate] = useState(getTodayString());
  const [checkOutDate, setCheckOutDate] = useState(getTomorrowString());
  const [roomType, setRoomType] = useState("ALL");
  const [capacity, setCapacity] = useState(1);

  const [rooms, setRooms] = useState<AvailableRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchAvailableRooms = useCallback(async () => {
    if (!token || !checkInDate || !checkOutDate) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        checkInDate,
        checkOutDate,
        capacity: String(capacity),
      });

      if (roomType !== "ALL") {
        params.set("roomType", roomType);
      }

      const res = await fetch(`/api/rooms/available?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch available rooms");
      }

      setRooms(data.rooms || []);
    } catch (err: any) {
      setError(err.message || "An error occurred while checking room availability");
    } finally {
      setLoading(false);
    }
  }, [token, checkInDate, checkOutDate, roomType, capacity]);

  useEffect(() => {
    fetchAvailableRooms();
  }, [fetchAvailableRooms]);

  const filteredRooms = rooms.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.roomNumber.toLowerCase().includes(q) ||
      r.roomType.toLowerCase().includes(q) ||
      r.floor.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            <BedDouble className="w-4 h-4" />
            <span>Front Desk Inventory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Available Rooms Lookup
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Real-time room availability calculation accounting for existing bookings, stay windows, and status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/receptionist/rooms"
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            All Rooms
          </Link>
          <Link
            href="/receptionist/bookings/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Booking</span>
          </Link>
        </div>
      </div>

      {/* Date & Filter Form */}
      <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Calendar className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">Select Stay Dates &amp; Requirements</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Check-in Date *
            </label>
            <input
              type="date"
              required
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Check-out Date *
            </label>
            <input
              type="date"
              required
              value={checkOutDate}
              min={checkInDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Room Category
            </label>
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            >
              <option value="ALL">All Categories</option>
              <option value="SINGLE">Single</option>
              <option value="DOUBLE">Double</option>
              <option value="DELUXE">Deluxe</option>
              <option value="SUITE">Suite</option>
              <option value="FAMILY">Family</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Minimum Guests / Capacity
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={capacity}
              onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            />
          </div>
        </div>
      </div>

      {/* Search & Quick Results Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search room number, type, floor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            Found <strong className="text-cyan-400">{filteredRooms.length}</strong> available rooms
          </span>
          <button
            onClick={fetchAvailableRooms}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
            title="Refresh availability"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Available Rooms Grid */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
          <p className="text-sm font-medium">Checking live room availability...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800">
          <BedDouble className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No rooms are available for the selected dates.</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            All rooms in your hotel property are booked or locked during this stay window. Try adjusting the dates or guest capacity.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => (
            <div
              key={room._id}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition duration-150 flex flex-col justify-between space-y-4 shadow-lg group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <DoorOpen className="w-5 h-5 text-cyan-400" />
                    <span className="text-lg font-extrabold text-white">
                      Room {room.roomNumber}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    Ready to Book
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Category:</span>
                    <strong className="text-white">{room.roomType}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Floor:</span>
                    <span className="text-slate-200">Floor {room.floor}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Max Capacity:</span>
                    <span className="text-slate-200">{room.capacity} Guests</span>
                  </div>

                  {room.amenities && room.amenities.length > 0 && (
                    <div className="pt-2">
                      <div className="flex flex-wrap gap-1">
                        {room.amenities.map((am) => (
                          <span
                            key={am}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                          >
                            {am}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">Nightly Rate</span>
                  <span className="text-base font-black text-cyan-400">
                    ₹{room.pricePerNight?.toLocaleString()}
                  </span>
                </div>

                <Link
                  href={`/receptionist/bookings/new?roomId=${room._id}&checkInDate=${checkInDate}&checkOutDate=${checkOutDate}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 font-bold text-xs transition"
                >
                  <span>Book Room</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
