"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BedDouble,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Sparkles,
  DollarSign,
  Users,
  Layers,
  FileText,
  ShieldCheck,
  Check,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import {
  ROOM_TYPES,
  ROOM_TYPE_LABELS,
  VALID_ROOM_TYPES,
  STANDARD_AMENITIES,
  RoomType,
} from "@/types/room";

export default function AddRoomPage() {
  const router = useRouter();
  const { user, token } = useUser();

  const [formData, setFormData] = useState({
    roomNumber: "",
    floor: "1",
    roomType: ROOM_TYPES.DELUXE as RoomType,
    pricePerNight: 2500,
    capacity: 2,
    amenities: ["WiFi", "AC", "TV"] as string[],
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Toggle amenity chip selection
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

    // 1. Client-side validation
    if (!formData.roomNumber.trim()) {
      setError("Please enter a room number (e.g. 101, 204).");
      return;
    }

    if (!formData.floor.trim()) {
      setError("Please specify a floor (e.g. Ground, 1, 2).");
      return;
    }

    if (!formData.pricePerNight || Number(formData.pricePerNight) <= 0) {
      setError("Price per night must be greater than ₹0.");
      return;
    }

    if (!formData.capacity || Number(formData.capacity) < 1) {
      setError("Room capacity must be at least 1 guest.");
      return;
    }

    setLoading(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/manager/rooms", {
        method: "POST",
        headers,
        body: JSON.stringify({
          roomNumber: formData.roomNumber.trim(),
          floor: formData.floor.trim(),
          roomType: formData.roomType,
          pricePerNight: Number(formData.pricePerNight),
          capacity: Number(formData.capacity),
          amenities: formData.amenities,
          description: formData.description.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create room");
      }

      setSuccess(true);
      setTimeout(() => {
        router.replace("/manager/rooms");
      }, 700);
    } catch (err: any) {
      setError(err.message || "Failed to create room.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back button link */}
      <Link
        href="/manager/rooms"
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-amber-400 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Room Inventory</span>
      </Link>

      {/* Main Form Container */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950 border border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-300/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/10">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                Phase 2 Inventory
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Add New Room
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/50 self-start sm:self-auto">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Scoped to: {user?.hotelId ? `HOT-${String(user.hotelId).slice(-6).toUpperCase()}` : "Your Hotel"}</span>
          </div>
        </div>

        {/* Feedback Banners */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Room created successfully! Redirecting to room list...</span>
          </div>
        )}

        {/* Add Room Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Room Specs (Row 1) */}
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
                placeholder="e.g. 101, 204"
                value={formData.roomNumber}
                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-800/60 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition"
              />
              <p className="text-[10px] text-slate-500 mt-1">Unique identifier per floor</p>
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
                placeholder="e.g. Ground, 1, 2, 3"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-800/60 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition"
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
                className="w-full px-3.5 py-2.5 bg-slate-800/60 border border-slate-700/80 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition cursor-pointer"
              >
                {VALID_ROOM_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ROOM_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing & Capacity (Row 2) */}
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
                  placeholder="2500"
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

            {/* Initial Status (Read-only default) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Initial Status
              </label>
              <div className="px-3.5 py-2.5 bg-slate-800/30 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-emerald-400">
                <div className="flex items-center gap-1.5 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>AVAILABLE</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal">Ready for booking</span>
              </div>
            </div>
          </div>

          {/* Amenities Multi-Select Chips */}
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
              placeholder="e.g. Spacious corner deluxe room with floor-to-ceiling windows and city skyline views..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-800/60 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition resize-none"
            />
          </div>

          {/* Submit / Cancel CTAs */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <Link
              href="/manager/rooms"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading || success}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-[0.99] transition flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Room...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Room</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
