"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  Users,
  ArrowLeft,
  Edit2,
  CalendarCheck,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Building2,
  AlertCircle,
  Loader2,
  BookOpen,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ManagerCustomerDetailsPage({ params }: PageProps) {
  const { id } = use(params);
  const { token } = useUser();

  const [customer, setCustomer] = useState<any | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/customers/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load customer details");
        }

        setCustomer(data.customer);
        setBookings(data.bookings || []);
      } catch (err: any) {
        setError(err.message || "Failed to load customer profile");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id, token]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
        <p className="text-sm font-medium">Loading customer profile...</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="max-w-2xl mx-auto p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Customer Not Found</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-6">
          {error || "This customer record does not exist or does not belong to your hotel."}
        </p>
        <Link
          href="/manager/customers"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/manager/customers"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href={`/manager/bookings/new?customerId=${customer._id}`}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Create Reservation</span>
          </Link>
          <Link
            href={`/manager/customers/${customer._id}/edit`}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </Link>
        </div>
      </div>

      {/* Guest Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-extrabold text-2xl sm:text-3xl shadow-lg shadow-amber-500/25 flex-shrink-0">
            {customer.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {customer.customerId}
              </span>
              <span className="text-[11px] text-slate-400">
                • {bookings.length} {bookings.length === 1 ? "Stay" : "Stays"} recorded
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {customer.fullName}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1">
              <span className="flex items-center gap-1 text-slate-300 font-medium">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                {customer.phone}
              </span>
              {customer.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  {customer.email}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile & Credentials Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact & Identity Details */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span>Identity &amp; Government ID</span>
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-medium block mb-1">ID Document Type</span>
              <span className="font-semibold text-white px-2 py-1 bg-slate-800 rounded-lg border border-slate-700 inline-block font-mono">
                {customer.idType || "NONE"}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1">Document Number</span>
              <p className="font-mono text-slate-200">
                {customer.idNumber || "Not provided"}
              </p>
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1">Gender</span>
              <p className="text-slate-200 font-medium">{customer.gender || "Unspecified"}</p>
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1">Date of Birth</span>
              <p className="text-slate-200">
                {customer.dateOfBirth
                  ? new Date(customer.dateOfBirth).toLocaleDateString()
                  : "Not provided"}
              </p>
            </div>
          </div>

          {customer.notes && (
            <div className="pt-3 border-t border-slate-800/80">
              <span className="text-slate-400 text-xs font-medium block mb-1">Front Desk Notes</span>
              <p className="text-xs text-amber-300/90 bg-amber-400/5 border border-amber-400/20 p-3 rounded-xl">
                {customer.notes}
              </p>
            </div>
          )}
        </div>

        {/* Address & Property Scope */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <MapPin className="w-4 h-4 text-amber-400" />
            <span>Address &amp; Property Information</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium block mb-1">Street Address</span>
              <p className="text-slate-200">{customer.address || "No address provided"}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 font-medium block mb-1">City</span>
                <p className="text-slate-200 font-medium">{customer.city || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium block mb-1">State / Country</span>
                <p className="text-slate-200">{customer.state ? `${customer.state}, ` : ""}{customer.country || "India"}</p>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1">Registered Hotel Property</span>
              <p className="text-white font-semibold flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>{customer.hotelName || "Your Hotel"}</span>
                <span className="text-[10px] font-mono text-amber-400 bg-slate-800 px-1.5 py-0.5 rounded">
                  {customer.hotelCode || "HOT-000000"}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Stay History */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Booking &amp; Stay History</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {bookings.length} {bookings.length === 1 ? "Record" : "Records"}
          </span>
        </div>

        {bookings.length === 0 ? (
          <div className="p-8 text-center">
            <CalendarCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">No bookings recorded for this guest yet.</p>
            <Link
              href={`/manager/bookings/new?customerId=${customer._id}`}
              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Create First Booking</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Booking ID</th>
                  <th className="py-2.5 px-3">Room</th>
                  <th className="py-2.5 px-3">Dates</th>
                  <th className="py-2.5 px-3">Nights</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                {bookings.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-3">
                      <Link
                        href={`/manager/bookings/${b._id}`}
                        className="font-mono font-bold text-amber-400 hover:text-amber-300 transition"
                      >
                        {b.bookingId}
                      </Link>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-white">
                        Room {b.roomId?.roomNumber || "N/A"}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        {b.roomId?.roomType || "Standard"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-300">
                      <span>{new Date(b.checkInDate).toLocaleDateString()}</span>
                      <span className="text-slate-500 mx-1">→</span>
                      <span>{new Date(b.checkOutDate).toLocaleDateString()}</span>
                    </td>
                    <td className="py-3 px-3 font-mono">{b.numberOfNights}N</td>
                    <td className="py-3 px-3 font-bold text-white">₹{b.totalAmount?.toLocaleString()}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.status === "CHECKED_IN"
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            : b.status === "COMPLETED"
                            ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                            : b.status === "CONFIRMED"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/manager/bookings/${b._id}`}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] transition"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
