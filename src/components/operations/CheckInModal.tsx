"use client";

import React, { useState } from "react";
import {
  DoorOpen,
  Calendar,
  User,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { IBookingData } from "@/types/booking";

interface CheckInModalProps {
  booking: IBookingData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CheckInModal({
  booking,
  isOpen,
  onClose,
  onSuccess,
}: CheckInModalProps) {
  const { token } = useUser();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const customer: any = booking.customerId || {};
  const room: any = booking.roomId || {};

  const handleConfirmCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/bookings/${booking._id}/check-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process check-in");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred during check-in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <DoorOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Confirm Guest Check-in</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Booking ID: {booking.bookingId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleConfirmCheckIn} className="space-y-4">
          {/* Summary Details Card */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400">Guest Name:</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-white text-sm block">
                  {customer.fullName || "Guest"}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {customer.phone || "No phone"} {customer.email ? `• ${customer.email}` : ""}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-slate-400">Identity Verification:</span>
              <div className="text-right">
                {customer.idType ? (
                  <span className="font-mono text-slate-200 bg-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-700">
                    {customer.idType}: {customer.idNumber || "Not recorded"}
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1 justify-end">
                    <AlertCircle className="w-3 h-3" />
                    <span>No ID on file (Verify at desk)</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <DoorOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400">Assigned Room:</span>
              </div>
              <span className="font-bold text-cyan-400">
                Room {room.roomNumber} ({room.roomType})
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400">Stay Duration:</span>
              </div>
              <span className="font-semibold text-slate-200">
                {new Date(booking.checkInDate).toLocaleDateString()} →{" "}
                {new Date(booking.checkOutDate).toLocaleDateString()} (
                {booking.numberOfNights} Nights)
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-slate-400">Occupancy:</span>
              <span className="text-slate-200">
                {booking.adults || 1} Adult{booking.adults === 1 ? "" : "s"}
                {booking.children ? ` + ${booking.children} Child` : ""}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Total Booking Amount:</span>
              <span className="font-black text-white text-sm">
                ₹{booking.totalAmount?.toLocaleString()}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Check-in Notes / Requests (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Identity verified, keycard issued"
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            />
          </div>

          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center gap-2.5 text-xs text-cyan-300">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>
              Checking in transitions the room status to <strong>OCCUPIED</strong> and logs your user audit timestamp.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking In...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Check In Guest</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
