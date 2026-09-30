"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BedDouble,
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Sparkles,
  Wrench,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { USER_ROLES } from "@/types/roles";

interface RoomOperationalItem {
  _id: string;
  roomNumber: string;
  roomType: string;
  floor: string;
  pricePerNight: number;
  capacity: number;
  status: string;
  isActive: boolean;
  housekeepingStatus?: string;
  housekeepingPriority?: string;
  activeMaintenance?: string;
}

export default function ReceptionistRoomsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useUser();

  const [rooms, setRooms] = useState<RoomOperationalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<RoomOperationalItem | null>(null);

  // Auth Protection
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace("/login");
      } else if (user.mustChangePassword) {
        router.replace("/change-password");
      } else if (
        user.role !== USER_ROLES.RECEPTIONIST &&
        user.role !== USER_ROLES.MANAGER &&
        user.role !== USER_ROLES.SYSTEM_ADMIN
      ) {
        router.replace("/");
      }
    }
  }, [user, authLoading, router]);

  const fetchRoomsAndOperationalStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [roomsRes, hkRes, mtRes] = await Promise.all([
        fetch("/api/rooms?isActive=true"),
        fetch("/api/housekeeping?status=PENDING&status=ASSIGNED&status=IN_PROGRESS"),
        fetch("/api/maintenance?status=OPEN&status=ASSIGNED&status=IN_PROGRESS"),
      ]);

      const [roomsData, hkData, mtData] = await Promise.all([
        roomsRes.json(),
        hkRes.json().catch(() => ({ tasks: [] })),
        mtRes.json().catch(() => ({ requests: [] })),
      ]);

      if (!roomsRes.ok) {
        throw new Error(roomsData.error || "Failed to load hotel rooms.");
      }

      const rawRooms: any[] = roomsData.rooms || [];
      const hkTasks: any[] = hkData.tasks || [];
      const mtRequests: any[] = mtData.requests || [];

      // Map operational status onto rooms
      const mappedRooms: RoomOperationalItem[] = rawRooms.map((room) => {
        const hk = hkTasks.find((t) => t.roomId?._id === room._id || t.roomId === room._id);
        const mt = mtRequests.find((m) => m.roomId?._id === room._id || m.roomId === room._id);

        let hkLabel = "Ready";
        if (room.status === "OCCUPIED") {
          hkLabel = "Guest Checked In";
        } else if (hk) {
          hkLabel = `${hk.type?.replace("_", " ")} (${hk.status})`;
        } else if (room.status === "CLEANING") {
          hkLabel = "Cleaning Required";
        }

        return {
          ...room,
          housekeepingStatus: hkLabel,
          housekeepingPriority: hk?.priority,
          activeMaintenance: mt ? mt.issue : undefined,
        };
      });

      setRooms(mappedRooms);
    } catch (err: any) {
      setError(err.message || "Failed to fetch room operational data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchRoomsAndOperationalStatus();
    }
  }, [user, fetchRoomsAndOperationalStatus]);

  if (authLoading || !user) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
        <p className="text-sm font-medium">Verifying Front Desk Credentials...</p>
      </div>
    );
  }

  // Filtered rooms
  const filteredRooms = rooms.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (typeFilter !== "ALL" && r.roomType !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.roomNumber.toLowerCase().includes(q) ||
        r.roomType.toLowerCase().includes(q) ||
        r.floor.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const availableCount = rooms.filter((r) => r.status === "AVAILABLE").length;
  const occupiedCount = rooms.filter((r) => r.status === "OCCUPIED").length;
  const cleaningCount = rooms.filter((r) => r.status === "CLEANING").length;
  const maintenanceCount = rooms.filter((r) => r.status === "MAINTENANCE").length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
            <BedDouble className="w-6 h-6 text-cyan-400" />
            <span>Room Operational Overview</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time status of all hotel rooms, housekeeping readiness, and maintenance locks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/receptionist/rooms/available"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Check Availability</span>
          </Link>
          <button
            onClick={fetchRoomsAndOperationalStatus}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Available (Ready)</span>
            <span className="text-xl font-bold text-emerald-400">{availableCount}</span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-400/40" />
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Occupied Stays</span>
            <span className="text-xl font-bold text-blue-400">{occupiedCount}</span>
          </div>
          <BedDouble className="w-5 h-5 text-blue-400/40" />
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Cleaning Required</span>
            <span className="text-xl font-bold text-amber-400">{cleaningCount}</span>
          </div>
          <Sparkles className="w-5 h-5 text-amber-400/40" />
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Under Maintenance</span>
            <span className="text-xl font-bold text-rose-400">{maintenanceCount}</span>
          </div>
          <Wrench className="w-5 h-5 text-rose-400/40" />
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Room Number or Floor..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 flex-1 md:flex-initial">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500 transition"
            >
              <option value="ALL">All Operational Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="CLEANING">Cleaning</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="OUT_OF_SERVICE">Out of Service</option>
            </select>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500 transition"
          >
            <option value="ALL">All Room Types</option>
            <option value="SINGLE">Single</option>
            <option value="DOUBLE">Double</option>
            <option value="DELUXE">Deluxe</option>
            <option value="SUITE">Suite</option>
            <option value="FAMILY">Family</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
            <p className="text-xs font-semibold">Loading room operational statuses...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 text-cyan-400/40 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-white">No rooms match your filters.</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4">Room Number</th>
                  <th className="py-3.5 px-4">Floor</th>
                  <th className="py-3.5 px-4">Room Type</th>
                  <th className="py-3.5 px-4">Rate / Night</th>
                  <th className="py-3.5 px-4">Operational Status</th>
                  <th className="py-3.5 px-4">Housekeeping Status</th>
                  <th className="py-3.5 px-4">Maintenance Status</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredRooms.map((room) => (
                  <tr key={room._id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-white text-sm">
                      Room {room.roomNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      Floor {room.floor}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-medium text-slate-200">
                        {room.roomType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-white">
                      ₹{room.pricePerNight}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          room.status === "AVAILABLE"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : room.status === "OCCUPIED"
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            : room.status === "CLEANING"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : room.status === "MAINTENANCE"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "bg-slate-800 text-slate-500 border border-slate-700"
                        }`}
                      >
                        {room.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400/80" />
                        <span>{room.housekeepingStatus}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {room.activeMaintenance ? (
                        <span className="text-[11px] font-medium text-rose-400 flex items-center gap-1.5 line-clamp-1 max-w-xs">
                          <Wrench className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{room.activeMaintenance}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">Normal</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedRoom(room)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        title="View Room Overview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Room Overview */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BedDouble className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-base text-white">
                  Room {selectedRoom.roomNumber} Overview
                </h3>
              </div>
              <button
                onClick={() => setSelectedRoom(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Room Category</span>
                <span className="font-bold text-white">{selectedRoom.roomType}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Floor</span>
                <span className="font-medium text-white">{selectedRoom.floor}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Operational State</span>
                <span className="font-bold text-cyan-400">{selectedRoom.status}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Housekeeping Status</span>
                <span className="text-amber-400 font-semibold">{selectedRoom.housekeepingStatus}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Maintenance</span>
                <span className="text-slate-300">{selectedRoom.activeMaintenance || "No issues reported"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Nightly Rate</span>
                <span className="font-mono font-bold text-white">₹{selectedRoom.pricePerNight}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedRoom(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
