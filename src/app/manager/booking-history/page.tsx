"use client";

import React, { useState, useEffect } from "react";
import {
  History,
  Search,
  Calendar,
  BedDouble,
  User,
  CreditCard,
  CheckCircle2,
  Clock,
  Ban,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import ReportFilter, { DateRangePreset } from "@/components/reports/ReportFilter";
import BookingDetailsModal, {
  BookingDetailsData,
} from "@/components/reports/BookingDetailsModal";
import BookingHistoryPrintView from "@/components/operations/BookingHistoryPrintView";

export default function ManagerBookingHistoryPage() {
  const [preset, setPreset] = useState<DateRangePreset>("LAST_30_DAYS");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [status, setStatus] = useState("ALL");
  const [paymentStatus, setPaymentStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [bookings, setBookings] = useState<any[]>([]);
  const [hotel, setHotel] = useState<any | null>(null);
  const [summary, setSummary] = useState<any>({
    total: 0,
    completed: 0,
    checkedIn: 0,
    confirmed: 0,
    cancelled: 0,
    totalRevenue: 0,
  });
  const [pagination, setPagination] = useState<any>({
    page: 1,
    limit: 20,
    totalRecords: 0,
    totalPages: 1,
  });

  const [selectedBooking, setSelectedBooking] = useState<BookingDetailsData | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("preset", preset);
    if (preset === "CUSTOM" && customStart && customEnd) {
      params.set("startDate", customStart);
      params.set("endDate", customEnd);
    }
    if (status !== "ALL") params.set("status", status);
    if (paymentStatus !== "ALL") params.set("paymentStatus", paymentStatus);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    params.set("page", String(page));
    params.set("limit", String(limit));

    try {
      const res = await fetch(`/api/reports/bookings?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to load booking history.");
      }

      setBookings(data.bookings || []);
      setHotel(data.hotel || null);
      setSummary(data.summary || {});
      setPagination(data.pagination || { page: 1, limit: 20, totalRecords: 0, totalPages: 1 });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [preset, customStart, customEnd, status, paymentStatus, searchQuery, page]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("type", "bookings");
      params.set("preset", preset);
      if (preset === "CUSTOM" && customStart && customEnd) {
        params.set("startDate", customStart);
        params.set("endDate", customEnd);
      }

      const res = await fetch(`/api/reports/export?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to export booking history.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `booking_history_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (bStatus: string) => {
    switch (bStatus) {
      case "COMPLETED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            COMPLETED
          </span>
        );
      case "CHECKED_IN":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 animate-pulse">
            CHECKED IN
          </span>
        );
      case "CONFIRMED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            CONFIRMED
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            CANCELLED
          </span>
        );
      default:
        return <span className="text-slate-400">{bStatus}</span>;
    }
  };

  const getPaymentBadge = (pStatus: string) => {
    switch (pStatus) {
      case "PAID":
        return (
          <span className="text-[10px] font-bold text-emerald-400">PAID</span>
        );
      case "PARTIALLY_PAID":
        return (
          <span className="text-[10px] font-bold text-amber-400">PARTIAL</span>
        );
      case "UNPAID":
        return (
          <span className="text-[10px] font-bold text-rose-400">UNPAID</span>
        );
      default:
        return <span>{pStatus}</span>;
    }
  };

  return (
    <>
      {/* 1. SCREEN VIEW (Completely hidden during printing) */}
      <div className="dashboard-hide-print min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6 print:hidden">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
              <History className="w-4 h-4" /> Guest Stay Ledger
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Hotel Booking History & Archives
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Search, filter, and inspect comprehensive historical stays and invoices.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-700/80 rounded-xl hover:bg-slate-800 transition"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print Ledger</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isExporting ? "Exporting..." : "Export Bookings"}</span>
            </button>
          </div>
        </div>

        {/* Summary KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 print:hidden">
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total</span>
            <span className="text-xl font-extrabold text-white">{summary.total || 0}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Completed</span>
            <span className="text-xl font-extrabold text-emerald-400">{summary.completed || 0}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-cyan-400 block">Checked In</span>
            <span className="text-xl font-extrabold text-cyan-400">{summary.checkedIn || 0}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-amber-400 block">Confirmed</span>
            <span className="text-xl font-extrabold text-amber-400">{summary.confirmed || 0}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-rose-400 block">Cancelled</span>
            <span className="text-xl font-extrabold text-rose-400">{summary.cancelled || 0}</span>
          </div>
        </div>

        {/* Report Filter Bar */}
        <ReportFilter
          preset={preset}
          onPresetChange={(newPreset) => {
            setPreset(newPreset);
            setPage(1);
          }}
          startDate={customStart}
          endDate={customEnd}
          onCustomDateChange={(start, end) => {
            setCustomStart(start);
            setCustomEnd(end);
            setPage(1);
          }}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setPage(1);
          }}
          searchPlaceholder="Search by Booking ID, Customer Name, Phone, Room #..."
          status={status}
          onStatusChange={(s) => {
            setStatus(s);
            setPage(1);
          }}
          statusOptions={[
            { label: "All Booking Statuses", value: "ALL" },
            { label: "Completed Stays", value: "COMPLETED" },
            { label: "Checked In", value: "CHECKED_IN" },
            { label: "Confirmed", value: "CONFIRMED" },
            { label: "Cancelled", value: "CANCELLED" },
          ]}
          paymentStatus={paymentStatus}
          onPaymentStatusChange={(p) => {
            setPaymentStatus(p);
            setPage(1);
          }}
          paymentOptions={[
            { label: "All Payment Statuses", value: "ALL" },
            { label: "Paid In Full", value: "PAID" },
            { label: "Partially Paid", value: "PARTIALLY_PAID" },
            { label: "Unpaid", value: "UNPAID" },
          ]}
          onRefresh={fetchBookings}
          onExportCsv={handleExportCsv}
          onPrint={() => window.print()}
          isExporting={isExporting}
          isLoading={loading}
        />

        {/* Error state */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <p className="text-xs">{error}</p>
          </div>
        )}

        {/* Booking Ledger Table */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Historical Bookings</h3>
            <span className="text-xs text-slate-400">
              Showing {bookings.length} of {pagination.totalRecords} records
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 space-y-3">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Loading booking records...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No bookings found matching the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Booking ID</th>
                    <th className="p-3.5">Guest Name & Phone</th>
                    <th className="p-3.5">Room</th>
                    <th className="p-3.5">Stay Dates</th>
                    <th className="p-3.5">Actual Times</th>
                    <th className="p-3.5">Total (₹)</th>
                    <th className="p-3.5">Payment</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {bookings.map((b: any) => {
                    const cust = b.customer || b.customerId || {};
                    const rm = b.room || b.roomId || {};
                    const price = b.totalPrice ?? b.totalAmount ?? 0;
                    const actualIn = b.actualCheckIn || b.actualCheckInDate;
                    const actualOut = b.actualCheckOut || b.actualCheckOutDate;

                    return (
                      <tr key={b._id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-mono font-bold text-amber-400">
                          {b.bookingId}
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-white">{cust.fullName || "Guest"}</div>
                          <div className="text-[11px] text-slate-400">{cust.phone || "—"}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-white">Room {rm.roomNumber || "N/A"}</div>
                          <div className="text-[11px] text-slate-400">{rm.roomType || "Standard"}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="text-white font-medium">
                            {b.checkInDate ? new Date(b.checkInDate).toLocaleDateString() : "—"}{" "}
                            <span className="text-[11px] text-amber-400/90 font-mono">
                              {b.checkInAt ? new Date(b.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "14:00"}
                            </span>
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            to {b.checkOutDate ? new Date(b.checkOutDate).toLocaleDateString() : "—"}{" "}
                            <span className="text-slate-500 font-mono">
                              {b.checkOutAt ? new Date(b.checkOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "11:00"}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 text-[11px]">
                          <div className={actualIn ? "text-cyan-400" : "text-slate-500"}>
                            In: {actualIn ? new Date(actualIn).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                          </div>
                          <div className={actualOut ? "text-emerald-400" : "text-slate-500"}>
                            Out: {actualOut ? new Date(actualOut).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                          </div>
                        </td>
                        <td className="p-3.5 font-bold text-white">
                          ₹{Number(price).toLocaleString()}
                        </td>
                        <td className="p-3.5">{getPaymentBadge(b.paymentStatus)}</td>
                        <td className="p-3.5">{getStatusBadge(b.status)}</td>
                        <td className="p-3.5 text-right print:hidden">
                          <button
                            type="button"
                            onClick={() => setSelectedBooking(b)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Server-Side Pagination Bar */}
          {pagination.totalPages > 1 && (
            <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs print:hidden">
              <span className="text-slate-400">
                Page <span className="font-bold text-white">{pagination.page}</span> of{" "}
                <span className="font-bold text-white">{pagination.totalPages}</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1 || loading}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages || loading}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Booking Details Modal */}
        <BookingDetailsModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      </div>

      {/* 2. DEDICATED PRINT CONTAINER: Completely hidden on screen, ONLY element rendered during window.print() */}
      <div className="hidden print:block">
        <BookingHistoryPrintView
          bookings={bookings}
          summary={summary}
          hotel={hotel}
          filters={{
            preset,
            status,
            paymentStatus,
            search: searchQuery,
            startDate: customStart,
            endDate: customEnd,
          }}
        />
      </div>
    </>
  );
}
