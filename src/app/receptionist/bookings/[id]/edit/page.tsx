"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { useUser } from "@/context/UserContext";
import BookingForm from "@/components/booking/BookingForm";
import { IBookingData } from "@/types/booking";

export default function ReceptionistEditBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { token } = useUser();

  const [booking, setBooking] = useState<IBookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !resolvedParams.id) return;
    setLoading(true);
    setError(null);

    fetch(`/api/bookings/${resolvedParams.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setBooking(data.booking);
      })
      .catch((err) => setError(err.message || "Failed to load booking"))
      .finally(() => setLoading(false));
  }, [token, resolvedParams.id]);

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
        <p className="text-sm font-medium">Loading booking editor...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Booking Record Unavailable</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          {error || "Booking not found or not editable."}
        </p>
        <Link
          href="/receptionist/bookings"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Bookings</span>
        </Link>
      </div>
    );
  }

  return <BookingForm portalType="receptionist" initialData={booking} isEdit={true} />;
}
