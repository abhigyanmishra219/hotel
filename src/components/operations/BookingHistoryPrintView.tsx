"use client";

import React from "react";
import { Building2, Calendar, Filter, Phone, Mail, MapPin } from "lucide-react";

export interface BookingHistoryPrintViewProps {
  bookings: any[];
  summary?: {
    total?: number;
    completed?: number;
    checkedIn?: number;
    confirmed?: number;
    cancelled?: number;
    totalRevenue?: number;
  };
  hotel?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    phone?: string;
    email?: string;
    gstNumber?: string;
    hotelCode?: string;
  } | null;
  filters?: {
    preset?: string;
    status?: string;
    paymentStatus?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  };
  className?: string;
}

export default function BookingHistoryPrintView({
  bookings = [],
  summary,
  hotel,
  filters,
  className = "",
}: BookingHistoryPrintViewProps) {
  const currentDateFormatted = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const currentTimeFormatted = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Calculate stats from bookings array if summary not explicitly provided
  const totalCount = summary?.total ?? bookings.length;
  const confirmedCount =
    summary?.confirmed ?? bookings.filter((b) => b.status === "CONFIRMED").length;
  const completedCount =
    summary?.completed ?? bookings.filter((b) => b.status === "COMPLETED").length;
  const checkedInCount =
    summary?.checkedIn ?? bookings.filter((b) => b.status === "CHECKED_IN").length;
  const cancelledCount =
    summary?.cancelled ?? bookings.filter((b) => b.status === "CANCELLED").length;

  const totalRevenue =
    summary?.totalRevenue ??
    bookings.reduce((sum, b) => sum + (Number(b.totalPrice ?? b.totalAmount) || 0), 0);

  // Filter labels for the header
  const getFilterSummary = () => {
    const parts: string[] = [];

    if (filters?.search) {
      parts.push(`Search: "${filters.search}"`);
    }

    if (filters?.status && filters.status !== "ALL") {
      parts.push(`Status: ${filters.status}`);
    }

    if (filters?.paymentStatus && filters.paymentStatus !== "ALL") {
      parts.push(`Payment: ${filters.paymentStatus}`);
    }

    if (filters?.startDate && filters?.endDate) {
      parts.push(`Date Range: ${filters.startDate} to ${filters.endDate}`);
    } else if (filters?.preset && filters.preset !== "CUSTOM") {
      parts.push(`Period: ${filters.preset.replace(/_/g, " ")}`);
    }

    return parts.length > 0 ? parts.join("  |  ") : "All Bookings (No Filters Applied)";
  };

  const hotelAddress = [hotel?.address, hotel?.city, hotel?.state, hotel?.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className={`booking-history-print bg-white text-slate-900 font-sans p-8 max-w-none w-full print:p-0 ${className}`}
      style={{ boxSizing: "border-box" }}
    >
      {/* 1. HOTEL HEADER */}
      <div className="border-b-2 border-slate-900 pb-5 mb-5 flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-slate-900" />
            <h1 className="text-2xl font-black uppercase tracking-wider text-slate-950">
              {hotel?.name || "Hotel Management Ledger"}
            </h1>
          </div>
          {hotelAddress && (
            <p className="text-xs text-slate-700 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500 inline-block flex-shrink-0" />
              <span>{hotelAddress}</span>
            </p>
          )}
          <div className="text-xs text-slate-700 flex flex-wrap gap-4 mt-1">
            {hotel?.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-500 inline-block" /> {hotel.phone}
              </span>
            )}
            {hotel?.email && (
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3 text-slate-500 inline-block" /> {hotel.email}
              </span>
            )}
            {hotel?.gstNumber && (
              <span className="font-semibold">GSTIN: {hotel.gstNumber}</span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block bg-slate-950 text-white text-xs font-black tracking-widest uppercase px-3 py-1.5 rounded">
            BOOKING HISTORY
          </div>
          <p className="text-xs text-slate-600 mt-2">
            <span className="font-medium">Generated Date:</span> {currentDateFormatted}
          </p>
          <p className="text-[11px] text-slate-500">
            <span className="font-medium">Time:</span> {currentTimeFormatted}
          </p>
        </div>
      </div>

      {/* 2. FILTER INFORMATION */}
      <div className="bg-slate-100 border border-slate-300 rounded p-2.5 mb-5 text-xs text-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
          <span className="font-bold uppercase tracking-wide text-slate-700">Filter Scope:</span>
          <span className="font-medium">{getFilterSummary()}</span>
        </div>
        <div className="text-right text-[11px] text-slate-600">
          Showing <strong className="text-slate-900">{bookings.length}</strong> record(s)
        </div>
      </div>

      {/* 3. BOOKING TABLE */}
      <table className="w-full text-xs text-left border-collapse border border-slate-300 mb-6">
        <thead className="bg-slate-200 text-slate-900 font-bold uppercase tracking-wider border-b border-slate-400">
          <tr>
            <th className="p-2 border border-slate-300 text-center w-10">#</th>
            <th className="p-2 border border-slate-300">Booking ID</th>
            <th className="p-2 border border-slate-300">Guest Name</th>
            <th className="p-2 border border-slate-300">Phone</th>
            <th className="p-2 border border-slate-300">Room</th>
            <th className="p-2 border border-slate-300">Check-in</th>
            <th className="p-2 border border-slate-300">Check-out</th>
            <th className="p-2 border border-slate-300 text-center">Nights</th>
            <th className="p-2 border border-slate-300">Status</th>
            <th className="p-2 border border-slate-300">Payment</th>
            <th className="p-2 border border-slate-300 text-right">Total Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-slate-800">
          {bookings.length === 0 ? (
            <tr>
              <td colSpan={11} className="p-6 text-center text-slate-500 italic">
                No booking records found for the selected criteria.
              </td>
            </tr>
          ) : (
            bookings.map((b: any, index: number) => {
              const cust = b.customer || b.customerId || {};
              const rm = b.room || b.roomId || {};
              const price = b.totalPrice ?? b.totalAmount ?? 0;
              const nights =
                b.numberOfNights ||
                (b.checkInDate && b.checkOutDate
                  ? Math.max(
                      1,
                      Math.round(
                        (new Date(b.checkOutDate).getTime() - new Date(b.checkInDate).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    )
                  : 1);

              return (
                <tr key={b._id || index} className={index % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                  <td className="p-2 border border-slate-300 text-center font-mono text-[11px] text-slate-500">
                    {index + 1}
                  </td>
                  <td className="p-2 border border-slate-300 font-mono font-bold text-slate-950">
                    {b.bookingId || "—"}
                  </td>
                  <td className="p-2 border border-slate-300 font-medium text-slate-900">
                    {cust.fullName || "Guest"}
                  </td>
                  <td className="p-2 border border-slate-300 text-slate-700">
                    {cust.phone || "—"}
                  </td>
                  <td className="p-2 border border-slate-300">
                    <span className="font-semibold text-slate-900">
                      {rm.roomNumber ? `Rm ${rm.roomNumber}` : "N/A"}
                    </span>
                    {rm.roomType && (
                      <span className="text-[10px] text-slate-500 block">{rm.roomType}</span>
                    )}
                  </td>
                  <td className="p-2 border border-slate-300">
                    <div className="font-medium text-slate-950">
                      {b.actualCheckIn
                        ? new Date(b.actualCheckIn).toLocaleDateString("en-IN")
                        : b.checkInDate
                        ? new Date(b.checkInDate).toLocaleDateString("en-IN")
                        : "—"}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {b.actualCheckIn
                        ? new Date(b.actualCheckIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : b.checkInAt
                        ? new Date(b.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "02:00 PM"}
                    </div>
                  </td>
                  <td className="p-2 border border-slate-300">
                    <div className="font-medium text-slate-950">
                      {b.actualCheckOut
                        ? new Date(b.actualCheckOut).toLocaleDateString("en-IN")
                        : b.checkOutDate
                        ? new Date(b.checkOutDate).toLocaleDateString("en-IN")
                        : "—"}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {b.actualCheckOut
                        ? new Date(b.actualCheckOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : b.checkOutAt
                        ? new Date(b.checkOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "11:00 AM"}
                    </div>
                  </td>
                  <td className="p-2 border border-slate-300 text-center font-medium">
                    {nights}
                  </td>
                  <td className="p-2 border border-slate-300 font-bold text-[11px]">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase ${
                        b.status === "CONFIRMED"
                          ? "bg-amber-100 text-amber-900"
                          : b.status === "CHECKED_IN"
                          ? "bg-blue-100 text-blue-900"
                          : b.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-900"
                          : b.status === "CANCELLED"
                          ? "bg-rose-100 text-rose-900"
                          : "text-slate-700"
                      }`}
                    >
                      {b.status || "—"}
                    </span>
                  </td>
                  <td className="p-2 border border-slate-300 font-bold text-[11px]">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase ${
                        b.paymentStatus === "PAID"
                          ? "text-emerald-800"
                          : b.paymentStatus === "PARTIALLY_PAID"
                          ? "text-amber-800"
                          : "text-rose-800"
                      }`}
                    >
                      {b.paymentStatus || "UNPAID"}
                    </span>
                  </td>
                  <td className="p-2 border border-slate-300 text-right font-bold text-slate-950">
                    ₹{Number(price).toLocaleString("en-IN")}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* 4. SUMMARY */}
      <div className="border border-slate-300 rounded p-4 mb-6 bg-slate-50 flex flex-wrap justify-between items-center gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-slate-500 uppercase font-semibold text-[10px] block">
              Total Bookings
            </span>
            <span className="text-base font-black text-slate-950">{totalCount}</span>
          </div>
          <div>
            <span className="text-slate-500 uppercase font-semibold text-[10px] block">
              Confirmed
            </span>
            <span className="text-base font-black text-amber-700">{confirmedCount}</span>
          </div>
          <div>
            <span className="text-slate-500 uppercase font-semibold text-[10px] block">
              Checked In
            </span>
            <span className="text-base font-black text-blue-700">{checkedInCount}</span>
          </div>
          <div>
            <span className="text-slate-500 uppercase font-semibold text-[10px] block">
              Completed
            </span>
            <span className="text-base font-black text-emerald-700">{completedCount}</span>
          </div>
          <div>
            <span className="text-slate-500 uppercase font-semibold text-[10px] block">
              Cancelled
            </span>
            <span className="text-base font-black text-rose-700">{cancelledCount}</span>
          </div>
        </div>

        <div className="text-right border-l-2 border-slate-300 pl-6">
          <span className="text-slate-500 uppercase font-semibold text-[10px] block">
            Total Revenue
          </span>
          <span className="text-xl font-black text-slate-950">
            ₹{Number(totalRevenue).toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* 5. FOOTER */}
      <div className="border-t border-slate-300 pt-3 text-[11px] text-slate-500 flex justify-between items-center">
        <div>
          <span className="font-semibold text-slate-800">
            {hotel?.name || "GrandStay Hotel"}
          </span>
          {" • "}
          <span>Official Ledger Document</span>
        </div>
        <div>
          Generated on: {currentDateFormatted} at {currentTimeFormatted}
        </div>
      </div>
    </div>
  );
}
