"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  DollarSign,
  Users,
  Layers,
  Sparkles,
  ShieldCheck,
  Check,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import {
  ROOM_TYPES,
  ROOM_STATUSES,
  ROOM_TYPE_LABELS,
  ROOM_STATUS_LABELS,
  VALID_ROOM_TYPES,
  VALID_ROOM_STATUSES,
  STANDARD_AMENITIES,
  RoomType,
  RoomStatus,
} from "@/types/room";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditRoomPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user, token } = useUser();

  const [formData, setFormData] = useState({
    roomNumber: "",
    floor: "1",
    roomType: ROOM_TYPES.DELUXE as RoomType,
    pricePerNight: 2500,
    capacity: 2,
    amenities: [] as string[],
    description: "",
    status: ROOM_STATUSES.AVAILABLE as RoomStatus,
  });

  const [roomCode, setRoomCode] = useState("");
  const [hotelInfo, setHotelInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchRoomData() {
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

        const rm = data.room;
        setFormData({
          roomNumber: rm.roomNumber || "",
          floor: rm.floor || "1",
          roomType: (rm.roomType || rm.type || ROOM_TYPES.DELUXE) as RoomType,
          pricePerNight: rm.pricePerNight || 2500,
          capacity: rm.capacity || 2,
          amenities: Array.isArray(rm.amenities) ? rm.amenities : ["WiFi", "AC", "TV"],
          description: rm.description || "",
          status: (rm.status || ROOM_STATUSES.AVAILABLE) as RoomStatus,
        });
        setRoomCode(rm.roomCode || "");
        setHotelInfo(data.hotel);
      } catch (err: any) {
        setError(err.message || "Failed to load room data for editing");
      } finally {
        setLoading(false);
      }
    }

    if (token && id) {
      fetchRoomData();
    }
  }, [token, id]);

  const toggleAmenity = (amenity: string) => {
    setFormData((prev) => {
      const exists = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a !== amenity)
          : [...prev.amenities, amenity],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.roomNumber.trim()) {
      setError("Room number cannot be empty.");
      return;
    }

    if (!formData.floor.trim()) {
      setError("Floor cannot be empty.");
      return;
    }

    if (!formData.pricePerNight || Number(formData.pricePerNight) <= 0) {
      setError("Price per night must be greater than ₹0.");
      return;
    }

    if (!formData.capacity || Number(formData.capacity) < 1) {
      setError("Capacity must be at least 1 guest.");
      return;
    }

    setSaving(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/manager/rooms/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          roomNumber: formData.roomNumber.trim(),
          floor: formData.floor.trim(),
          roomType: formData.roomType,
          pricePerNight: Number(formData.pricePerNight),
          capacity: Number(formData.capacity),
          amenities: formData.amenities,
          description: formData.description.trim(),
          status: formData.status,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update room");
      }

      setSuccess(true);
      setTimeout(() => {
        router.replace("/manager/rooms");
      }, 700);
    } catch (err: any) {
      setError(err.message || "Failed to update room.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
        <p className="text-sm">Loading room for editing...</p>
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

      {/* Main Edit Container */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950 border border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-300/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/10">
              <Edit className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  Edit Room Specs
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">
                  {roomCode}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Edit Room {formData.roomNumber}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/50 self-start sm:self-auto">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>{hotelInfo?.name || "Grand Royale"} ({hotelInfo?.hotelCode || "HOTEL"})</span>
          </div>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Room updated successfully! Redirecting...</span>
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Room Number */}
            <div>
              <label
                htmlFor="roomNumber"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Room Number <span className="text-rose-400">*</span>
              </label>
              <input
                id="roomNumber"
                type="text"
                required
                value={formData.roomNumber}
                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-800/60 border border-slate-700/80 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition"
              />
            </div>

            {/* Floor */}
            <div>
              <label
                htmlFor="floor"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Floor Level <span className="text-rose-400">*</span>
              </label>
              <input
                id="floor"
                type="text"
                required
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-800/60 border border-slate-700/80 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition"
              />
            </div>

            {/* Room Type */}
            <div>
              <label
                htmlFor="roomType"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Room Type <span className="text-rose-400">*</span>
              </label>
              <select
                id="roomType"
                value={formData.roomType}
                onChange={(e) => setFormData({ ...formData, roomType: e.target.value as RoomType })}
                className="w-full px-3.5 py-2.5 bg-slate-800/60 border border-slate-700/80 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition cursor-pointer"
              >
                {VALID_ROOM_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ROOM_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Price per night in INR */}
            <div>
              <label
                htmlFor="pricePerNight"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Price Per Night (₹ INR) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                <input
                  id="pricePerNight"
                  type="number"
                  required
                  min="1"
                  value={formData.pricePerNight}
                  onChange={(e) => setFormData({ ...formData, pricePerNight: Number(e.target.value) })}
                  className="w-full pl-8 pr-3.5 py-2.5 bg-slate-800/60 border border-slate-700/80 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition"
                />
              </div>
            </div>

            {/* Capacity */}
            <div>
              <label
                htmlFor="capacity"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Guest Capacity <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="capacity"
                  type="number"
                  required
                  min="1"
                  max="12"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/60 border border-slate-700/80 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition"
                />
                <span className="absolute right-3.5 top-2.5 text-slate-400 text-xs">Guests</span>
              </div>
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="status"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Operational Status <span className="text-rose-400">*</span>
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as RoomStatus })}
                className="w-full px-3.5 py-2.5 bg-slate-800/60 border border-slate-700/80 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition cursor-pointer"
              >
                {VALID_ROOM_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {ROOM_STATUS_LABELS[st]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amenities Multi-Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Room Amenities
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {STANDARD_AMENITIES.map((amenity) => {
                const selected = formData.amenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center justify-between transition-all ${
                      selected
                        ? "bg-amber-400/15 border-amber-400/40 text-amber-300 font-semibold shadow-sm"
                        : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <span>{amenity}</span>
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] border ${
                        selected
                          ? "bg-amber-400 text-slate-950 border-amber-400"
                          : "border-slate-600"
                      }`}
                    >
                      {selected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Room Description (Optional)
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-800/60 border border-slate-700/80 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition resize-none"
            />
          </div>

          {/* CTAs */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <Link
              href="/manager/rooms"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving || success}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-[0.99] transition flex items-center gap-2 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
