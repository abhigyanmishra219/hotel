"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BedDouble,
  Building2,
  Calendar,
  Clock,
  Edit,
  PowerOff,
  RotateCcw,
  ShieldCheck,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  AlertTriangle,
  DollarSign,
  Tag,
  Layers,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import {
  ROOM_STATUSES,
  ROOM_TYPE_LABELS,
  ROOM_STATUS_LABELS,
  RoomStatus,
  RoomType,
  IRoomData,
} from "@/types/room";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RoomDetailsPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user, token } = useUser();

  const [room, setRoom] = useState<IRoomData | null>(null);
  const [operations, setOperations] = useState<any>(null);
  const [hotelInfo, setHotelInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Deactivate modal state
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    async function fetchRoom() {
      setLoading(true);
      setError(null);

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`/api/manager/rooms/${id}`, { headers });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Room not found in your hotel property");
        }

        setRoom(data.room);
        setOperations(data.operations || null);
        setHotelInfo(data.hotel);
      } catch (err: any) {
        setError(err.message || "Failed to load room details");
      } finally {
        setLoading(false);
      }
    }

    if (token && id) {
      fetchRoom();
    }
  }, [token, id]);

  // Handle Deactivate
  const handleDeactivate = async () => {
    if (!room) return;
    setDeactivating(true);

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
        body: JSON.stringify({ action: "deactivate" }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to deactivate room");
      }

      setRoom(data.room);
      setShowDeactivateModal(false);
      setSuccessMessage(`Room ${room.roomNumber} has been deactivated`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to deactivate room");
    } finally {
      setDeactivating(false);
    }
  };

  // Handle Reactivate
  const handleReactivate = async () => {
    if (!room) return;

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

      setRoom(data.room);
      setSuccessMessage(`Room ${room.roomNumber} has been reactivated`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to reactivate room");
    }
  };

  const getStatusBadge = (status: RoomStatus, isActive: boolean) => {
    if (!isActive) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
          <span className="w-2 h-2 rounded-full bg-slate-500" />
          Inactive (Out of Service)
        </span>
      );
    }

    switch (status) {
      case ROOM_STATUSES.AVAILABLE:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Available for Booking
          </span>
        );
      case ROOM_STATUSES.OCCUPIED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            Occupied by Guest
          </span>
        );
      case ROOM_STATUSES.RESERVED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            Reserved
          </span>
        );
      case ROOM_STATUSES.CLEANING:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Housekeeping in Progress
          </span>
        );
      case ROOM_STATUSES.MAINTENANCE:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Under Maintenance
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
        <p className="text-sm">Loading room details...</p>
      </main>
    );
  }

  if (error || !room) {
    return (
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <Link
          href="/manager/rooms"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-amber-400 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Room Inventory</span>
        </Link>

        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Room Access Denied or Not Found</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {error || "The requested room does not exist or does not belong to your hotel property."}
          </p>
          <Link
            href="/manager/rooms"
            className="inline-block mt-3 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
          >
            Return to Rooms
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back button */}
      <Link
        href="/manager/rooms"
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-amber-400 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Room Inventory</span>
      </Link>

      {/* Success alert */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950 border border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-300/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-extrabold text-lg shadow-md shadow-amber-500/10">
              {room.roomNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  {ROOM_TYPE_LABELS[room.roomType] || room.roomType}
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {room.roomCode || "ROOM-000000"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
                Room {room.roomNumber}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {getStatusBadge(room.status, room.isActive)}
          </div>
        </div>

        {/* Specifications Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Price per night */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <span className="text-[11px] text-slate-400 uppercase font-medium tracking-wider block mb-1">
              Rate / Night
            </span>
            <span className="text-xl font-extrabold text-amber-300 font-mono">
              ₹{(room.pricePerNight || 0).toLocaleString("en-IN")}
            </span>
            <span className="text-[10px] text-slate-500 block">Excl. taxes</span>
          </div>

          {/* Floor */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <span className="text-[11px] text-slate-400 uppercase font-medium tracking-wider block mb-1">
              Floor Level
            </span>
            <span className="text-base font-bold text-white">
              Floor {room.floor || "1"}
            </span>
            <span className="text-[10px] text-slate-400 block">Property section</span>
          </div>

          {/* Capacity */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <span className="text-[11px] text-slate-400 uppercase font-medium tracking-wider block mb-1">
              Max Occupancy
            </span>
            <div className="flex items-center gap-1.5 text-base font-bold text-white">
              <Users className="w-4 h-4 text-slate-400" />
              <span>{room.capacity || 2} Guests</span>
            </div>
            <span className="text-[10px] text-slate-400 block">Standard allocation</span>
          </div>

          {/* Assigned Hotel */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <span className="text-[11px] text-slate-400 uppercase font-medium tracking-wider block mb-1">
              Property Tenant
            </span>
            <span className="text-xs font-bold text-slate-200 truncate block">
              {hotelInfo?.name || user?.hotelName || "Grand Royale Hotel"}
            </span>
            {hotelInfo?.city && (
              <span className="text-[10px] text-slate-400">
                {hotelInfo.city}{hotelInfo.state ? `, ${hotelInfo.state}` : ""}
              </span>
            )}
          </div>
        </div>

        {/* Amenities section */}
        <div className="p-5 rounded-xl bg-slate-800/30 border border-slate-700/40 space-y-2.5">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Room Amenities &amp; Features
          </span>
          <div className="flex flex-wrap gap-2">
            {(room.amenities || []).map((amenity, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700/70 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{amenity}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Description section */}
        {room.description && (
          <div className="p-5 rounded-xl bg-slate-800/30 border border-slate-700/40 space-y-1.5">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Description
            </span>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {room.description}
            </p>
          </div>
        )}

        {/* Action CTAs */}
        <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 font-mono">
            ID: {room._id} • Added on {room.createdAt ? new Date(room.createdAt).toLocaleDateString() : "N/A"}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Edit */}
            <Link
              href={`/manager/rooms/${room._id}/edit`}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition flex items-center gap-1.5"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Room</span>
            </Link>

            {/* Deactivate / Reactivate */}
            {room.isActive ? (
              <button
                onClick={() => setShowDeactivateModal(true)}
                className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold text-xs transition flex items-center gap-1.5"
              >
                <PowerOff className="w-3.5 h-3.5" />
                <span>Deactivate</span>
              </button>
            ) : (
              <button
                onClick={handleReactivate}
                className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold text-xs transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reactivate Room</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Operational Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Current Active Stay */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-white">
                Current Guest &amp; Stay
              </h3>
            </div>
            {operations?.currentBooking ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                CHECKED IN
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 font-medium">No Active Stay</span>
            )}
          </div>

          {operations?.currentBooking ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Guest Name</span>
                <span className="font-bold text-white">
                  {operations.currentBooking.customerId?.fullName || "Guest"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Contact</span>
                <span className="text-slate-300">
                  {operations.currentBooking.customerId?.phone || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Booking ID</span>
                <span className="font-mono font-bold text-amber-400">
                  {operations.currentBooking.bookingId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Scheduled Departure</span>
                <span className="text-slate-300">
                  {new Date(operations.currentBooking.checkOutDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-3 text-center">
              Room is currently not occupied by an active guest.
            </p>
          )}
        </div>

        {/* 2. Housekeeping Log */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-white">
                Housekeeping Tasks
              </h3>
            </div>
            <Link
              href="/manager/housekeeping"
              className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold"
            >
              All Tasks →
            </Link>
          </div>

          {operations?.housekeepingTasks?.length > 0 ? (
            <div className="space-y-2">
              {operations.housekeepingTasks.map((hk: any) => (
                <div
                  key={hk._id}
                  className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">{hk.taskId}</span>
                      <span className="text-[10px] text-slate-400">
                        {hk.type?.replace("_", " ")}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Assignee: {hk.assignedTo?.name || "Unassigned"}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      hk.status === "COMPLETED"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : hk.status === "IN_PROGRESS"
                        ? "bg-cyan-500/20 text-cyan-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {hk.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-3 text-center">
              No recent housekeeping tasks recorded for this room.
            </p>
          )}
        </div>

        {/* 3. Maintenance Issues */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-white">
                Maintenance Logs
              </h3>
            </div>
            <Link
              href="/manager/maintenance"
              className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              Manage →
            </Link>
          </div>

          {operations?.maintenanceRequests?.length > 0 ? (
            <div className="space-y-2">
              {operations.maintenanceRequests.map((mt: any) => (
                <div
                  key={mt._id}
                  className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="max-w-[70%]">
                    <span className="font-mono font-bold text-white block">{mt.requestId}</span>
                    <span className="text-[11px] text-slate-300 line-clamp-1">{mt.issue}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      mt.status === "RESOLVED"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-rose-500/20 text-rose-300"
                    }`}
                  >
                    {mt.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-3 text-center">
              No maintenance issues reported for this room.
            </p>
          )}
        </div>

        {/* 4. Room Service */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-white">
                Room Service Requests
              </h3>
            </div>
            <Link
              href="/manager/room-service"
              className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold"
            >
              All Requests →
            </Link>
          </div>

          {operations?.roomServiceRequests?.length > 0 ? (
            <div className="space-y-2">
              {operations.roomServiceRequests.map((rs: any) => (
                <div
                  key={rs._id}
                  className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-white block">{rs.requestId}</span>
                    <span className="text-[11px] text-slate-300">
                      {rs.items?.map((it: any) => `${it.item} (×${it.quantity})`).join(", ")}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      rs.status === "COMPLETED"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {rs.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-3 text-center">
              No recent room service requests for this room.
            </p>
          )}
        </div>
      </div>

      {/* Deactivate confirmation modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Deactivate Room {room.roomNumber}?</h3>
                <span className="text-[11px] text-slate-400 font-mono">Code: {room.roomCode}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will set the room to <strong>Out of Service</strong> and remove it from active inventory. Historical booking data will remain intact.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeactivateModal(false)}
                disabled={deactivating}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
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
