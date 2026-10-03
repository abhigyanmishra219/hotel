"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BedDouble,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wrench,
  Sparkles,
  Eye,
  Edit,
  PowerOff,
  RotateCcw,
  Loader2,
  Wifi,
  Tv,
  Coffee,
  ShieldCheck,
  Building2,
  Users,
  AlertTriangle,
  X,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import {
  ROOM_TYPES,
  ROOM_STATUSES,
  ROOM_TYPE_LABELS,
  ROOM_STATUS_LABELS,
  VALID_ROOM_TYPES,
  VALID_ROOM_STATUSES,
  RoomType,
  RoomStatus,
  IRoomData,
} from "@/types/room";

export default function ManagerRoomsListPage() {
  const router = useRouter();
  const { user, token } = useUser();

  const [rooms, setRooms] = useState<IRoomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [quota, setQuota] = useState<{
    allowed: boolean;
    current: number;
    max: number;
    planName: string;
  } | null>(null);
  const [availableFloors, setAvailableFloors] = useState<string[]>([]);
  const [hotelName, setHotelName] = useState("");

  // Filters and search state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [floorFilter, setFloorFilter] = useState("ALL");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("true");
  const [sortBy, setSortBy] = useState("roomNumber");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Deactivate Modal state
  const [deactivatingRoom, setDeactivatingRoom] = useState<IRoomData | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  // Fetch rooms from backend API with multi-tenant scoping
  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const queryParams = new URLSearchParams();
      if (search.trim()) queryParams.set("search", search.trim());
      if (statusFilter !== "ALL") queryParams.set("status", statusFilter);
      if (typeFilter !== "ALL") queryParams.set("roomType", typeFilter);
      if (floorFilter !== "ALL") queryParams.set("floor", floorFilter);
      if (activeFilter !== "all") queryParams.set("isActive", activeFilter);
      queryParams.set("sortBy", sortBy);
      queryParams.set("sortOrder", sortOrder);

      const res = await fetch(`/api/manager/rooms?${queryParams.toString()}`, {
        headers,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load hotel rooms");
      }

      setRooms(data.rooms || []);
      setQuota(data.quota || null);
      setAvailableFloors(data.availableFloors || []);
      if (data.hotelName) setHotelName(data.hotelName);
    } catch (err: any) {
      console.error("Error fetching rooms:", err);
      setError(err.message || "Failed to load room inventory");
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter, typeFilter, floorFilter, activeFilter, sortBy, sortOrder]);

  useEffect(() => {
    if (user && token) {
      fetchRooms();
    }
  }, [user, token, fetchRooms]);

  // Handle Deactivate action
  const confirmDeactivate = async () => {
    if (!deactivatingRoom) return;
    setDeactivating(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/manager/rooms/${deactivatingRoom._id}/status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ action: "deactivate" }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to deactivate room");
      }

      setSuccessMessage(`Room ${deactivatingRoom.roomNumber} deactivated successfully`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setDeactivatingRoom(null);
      fetchRooms();
    } catch (err: any) {
      setError(err.message || "Failed to deactivate room");
    } finally {
      setDeactivating(false);
    }
  };

  // Handle Reactivate action
  const handleReactivate = async (room: IRoomData) => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/manager/rooms/${room._id}/status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ action: "reactivate" }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reactivate room");
      }

      setSuccessMessage(`Room ${room.roomNumber} reactivated and set to AVAILABLE`);
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchRooms();
    } catch (err: any) {
      setError(err.message || "Failed to reactivate room");
    }
  };

  // Helper for Status Badge
  const getStatusBadge = (status: RoomStatus, isActive: boolean) => {
    if (!isActive) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          Inactive
        </span>
      );
    }

    switch (status) {
      case ROOM_STATUSES.AVAILABLE:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Available
          </span>
        );
      case ROOM_STATUSES.OCCUPIED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            Occupied
          </span>
        );
      case ROOM_STATUSES.RESERVED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            Reserved
          </span>
        );
      case ROOM_STATUSES.CLEANING:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Cleaning
          </span>
        );
      case ROOM_STATUSES.MAINTENANCE:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Maintenance
          </span>
        );
      case ROOM_STATUSES.OUT_OF_SERVICE:
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Out of Service
          </span>
        );
    }
  };

  // Helper for Type Badge
  const getTypeBadge = (type: RoomType | string) => {
    const norm = String(type).toUpperCase();
    const label = ROOM_TYPE_LABELS[norm as RoomType] || type;
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800/80 text-amber-300 border border-slate-700/60">
        {label}
      </span>
    );
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Room Management
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
              Phase 2 Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage rooms, guest capacity, price per night, and live housekeeping statuses for{" "}
            <strong className="text-slate-200">{hotelName || user?.hotelName || "Your Hotel"}</strong>.
          </p>
        </div>

        <Link
          href="/manager/rooms/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-[0.99] transition flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Room</span>
        </Link>
      </div>

      {/* Subscription Quota Progress Card */}
      {quota && (
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <BedDouble className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">Room Quota:</span>
                <span className="font-bold text-amber-400">
                  {quota.current} / {quota.max === -1 ? "Unlimited" : quota.max} rooms used
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">
                  {quota.planName}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] mt-0.5">
                {quota.max === -1
                  ? "Your enterprise plan includes unlimited room capacity."
                  : `${Math.max(0, quota.max - quota.current)} room slot(s) available for new creation.`}
              </p>
            </div>
          </div>

          {quota.max > 0 && (
            <div className="w-full sm:w-48 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/60">
              <div
                className={`h-full transition-all duration-300 ${
                  quota.current >= quota.max
                    ? "bg-rose-500"
                    : quota.current / quota.max > 0.8
                    ? "bg-amber-400"
                    : "bg-emerald-400"
                }`}
                style={{ width: `${Math.min(100, (quota.current / quota.max) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Success / Error Banners */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filters Card */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by room #, code or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-800/60 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/80 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              {VALID_ROOM_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {ROOM_STATUS_LABELS[st]}
                </option>
              ))}
            </select>
          </div>

          {/* Room Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/80 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition cursor-pointer"
            >
              <option value="ALL">All Room Types</option>
              {VALID_ROOM_TYPES.map((rt) => (
                <option key={rt} value={rt}>
                  {ROOM_TYPE_LABELS[rt]}
                </option>
              ))}
            </select>
          </div>

          {/* Floor Filter */}
          <div>
            <select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/80 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition cursor-pointer"
            >
              <option value="ALL">All Floors</option>
              {availableFloors.map((fl) => (
                <option key={fl} value={fl}>
                  Floor {fl}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Tabs & Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
          {/* Active Tabs */}
          <div className="flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setActiveFilter("true")}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                activeFilter === "true"
                  ? "bg-amber-400 text-slate-950 font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Active Rooms
            </button>
            <button
              onClick={() => setActiveFilter("false")}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                activeFilter === "false"
                  ? "bg-amber-400 text-slate-950 font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Inactive
            </button>
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                activeFilter === "all"
                  ? "bg-amber-400 text-slate-950 font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All
            </button>
          </div>

          {/* Sorting Dropdowns */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" />
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1 bg-slate-800/60 border border-slate-700/80 rounded-lg text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="roomNumber">Room Number</option>
              <option value="price">Price (₹)</option>
              <option value="floor">Floor</option>
              <option value="status">Status</option>
              <option value="createdAt">Date Created</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs font-mono"
              title="Toggle sort direction"
            >
              {sortOrder === "asc" ? "▲ ASC" : "▼ DESC"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Rooms Table / List */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          /* Loading Skeletons */
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-slate-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
              <BedDouble className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No rooms found</h3>
              <p className="text-xs text-slate-400 mt-1">
                {search || statusFilter !== "ALL" || typeFilter !== "ALL" || floorFilter !== "ALL" || activeFilter !== "all"
                  ? "No room records match your active search and filter criteria."
                  : "No rooms have been added to your hotel property yet. Add your first room to start managing hotel inventory."}
              </p>
            </div>
            <Link
              href="/manager/rooms/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition shadow-md shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Room</span>
            </Link>
          </div>
        ) : (
          /* Responsive Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 border-b border-slate-700/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    Room #
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Floor
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Capacity
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Price / Night
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Amenities
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rooms.map((room) => (
                  <tr
                    key={room._id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      !room.isActive ? "opacity-60 bg-slate-950/30" : ""
                    }`}
                  >
                    {/* Room # & Code */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 font-bold text-xs">
                          {room.roomNumber}
                        </div>
                        <div>
                          <span className="font-bold text-white text-sm block">
                            Room {room.roomNumber}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {room.roomCode || "ROOM-000000"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Floor */}
                    <td className="px-4 py-4 whitespace-nowrap font-medium text-slate-200">
                      Floor {room.floor || "1"}
                    </td>

                    {/* Type */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getTypeBadge(room.roomType || room.type || "DELUXE")}
                    </td>

                    {/* Capacity */}
                    <td className="px-4 py-4 whitespace-nowrap text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{room.capacity || 2} Guests</span>
                      </div>
                    </td>

                    {/* Price per night in INR */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="font-bold text-amber-300 font-mono text-sm">
                        ₹{(room.pricePerNight || 0).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-slate-500 block">/ night</span>
                    </td>

                    {/* Amenities pills */}
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {(room.amenities || []).slice(0, 3).map((amenity, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700/50"
                          >
                            {amenity}
                          </span>
                        ))}
                        {(room.amenities || []).length > 3 && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            +{room.amenities.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getStatusBadge(room.status, room.isActive)}
                    </td>

                    {/* Action buttons */}
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View */}
                        <Link
                          href={`/manager/rooms/${room._id}`}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="View Room Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>

                        {/* Edit */}
                        <Link
                          href={`/manager/rooms/${room._id}/edit`}
                          className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/20 transition"
                          title="Edit Room"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Link>

                        {/* Deactivate / Reactivate */}
                        {room.isActive ? (
                          <button
                            onClick={() => setDeactivatingRoom(room)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/20 transition"
                            title="Deactivate Room"
                          >
                            <PowerOff className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(room)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 border border-emerald-500/20 transition"
                            title="Reactivate Room"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
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

      {/* Deactivation Confirmation Modal Dialog */}
      {deactivatingRoom && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Deactivate Room {deactivatingRoom.roomNumber}?
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Code: {deactivatingRoom.roomCode || "ROOM-000000"}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Deactivating will mark this room as <strong>Out of Service</strong> and remove it from active booking availability. All historical booking logs and revenue records will be safely preserved.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeactivatingRoom(null)}
                disabled={deactivating}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeactivate}
                disabled={deactivating}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition flex items-center gap-2 disabled:opacity-60"
              >
                {deactivating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deactivating...</span>
                  </>
                ) : (
                  <span>Deactivate Room</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
