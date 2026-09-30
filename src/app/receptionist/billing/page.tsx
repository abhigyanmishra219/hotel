"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Receipt,
  Search,
  Filter,
  Eye,
  DollarSign,
  AlertCircle,
  Loader2,
  RefreshCw,
  Plus,
  Printer,
  CheckCircle2,
  Clock,
  Ban,
  DoorOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { IInvoiceData, PaymentStatus } from "@/types/invoice";
import PaymentModal from "@/components/operations/PaymentModal";

export default function ReceptionistBillingPage() {
  const { token } = useUser();

  const [invoices, setInvoices] = useState<IInvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "ALL">("ALL");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // Payment Recording Modal
  const [selectedInvoice, setSelectedInvoice] = useState<IInvoiceData | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const fetchInvoices = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (paymentStatus !== "ALL") params.set("paymentStatus", paymentStatus);
      if (dateFilter !== "all") params.set("dateFilter", dateFilter);
      if (dateFilter === "custom") {
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
      }
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(`/api/invoices?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load invoices");
      }

      setInvoices(data.invoices || []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load billing ledger");
    } finally {
      setLoading(false);
    }
  }, [token, search, paymentStatus, dateFilter, startDate, endDate, page, limit]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Handle filter changes that should reset to page 1
  const handleStatusChange = (st: PaymentStatus | "ALL") => {
    setPaymentStatus(st);
    setPage(1);
  };

  const handleDateFilterChange = (df: "all" | "today" | "week" | "month" | "custom") => {
    setDateFilter(df);
    setPage(1);
  };

  // Quick Totals Calculation
  const totalBilled = useMemo(() => {
    return invoices.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  }, [invoices]);

  const totalCollected = useMemo(() => {
    return invoices.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);
  }, [invoices]);

  const totalBalanceDue = useMemo(() => {
    return invoices.reduce((acc, curr) => acc + (curr.amountDue || 0), 0);
  }, [invoices]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4" />
            <span>Cashiering &amp; Folios</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Billing &amp; Invoices
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Review guest folios, record incremental balance payments, and print official GST tax invoices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchInvoices}
            disabled={loading}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700/80 transition"
            title="Refresh invoices"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
          <Link
            href="/receptionist/check-out"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-cyan-500/20 transition"
          >
            <DoorOpen className="w-4 h-4" />
            <span>Check-out &amp; Settle</span>
          </Link>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Total Invoiced (Page)</span>
            <p className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
              ₹{totalBilled.toLocaleString()}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Collected Revenue</span>
            <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">
              ₹{totalCollected.toLocaleString()}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Outstanding Balance Due</span>
            <p className="text-xl sm:text-2xl font-black text-amber-400 font-mono mt-1">
              ₹{totalBalanceDue.toLocaleString()}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Invoice ID, Booking Ref, Customer Name, Phone, Room..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            />
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/60 rounded-xl p-1 text-xs overflow-x-auto">
            {(["ALL", "PAID", "PARTIALLY_PAID", "UNPAID"] as const).map((st) => (
              <button
                key={st}
                onClick={() => handleStatusChange(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                  paymentStatus === st
                    ? "bg-cyan-500 text-slate-950 shadow-sm font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {st === "ALL"
                  ? "All Statuses"
                  : st === "PAID"
                  ? "Paid"
                  : st === "PARTIALLY_PAID"
                  ? "Partial"
                  : "Unpaid"}
              </button>
            ))}
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/60 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>Date Filter:</span>
            </span>
            {(["all", "today", "week", "month", "custom"] as const).map((df) => (
              <button
                key={df}
                onClick={() => handleDateFilterChange(df)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  dateFilter === df
                    ? "bg-slate-700 text-white border border-slate-600 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {df === "all"
                  ? "All Time"
                  : df === "today"
                  ? "Today"
                  : df === "week"
                  ? "This Week"
                  : df === "month"
                  ? "This Month"
                  : "Custom Range"}
              </button>
            ))}
          </div>

          {dateFilter === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
              <span className="text-slate-500 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>
          )}

          {/* Record Limit Selector */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-slate-400 text-[11px]">Rows:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-[11px] focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
            <p className="text-sm font-medium">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400 mx-auto mb-4">
              <Receipt className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">No invoices found</h3>
            <p className="text-slate-400 text-xs max-w-md mx-auto mt-1 mb-6">
              {search || paymentStatus !== "ALL" || dateFilter !== "all"
                ? "No billing records match your search or filter criteria."
                : "Invoices are generated automatically during guest check-out or billing settlement."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Invoice ID</th>
                  <th className="py-3.5 px-4">Booking Ref</th>
                  <th className="py-3.5 px-4">Guest</th>
                  <th className="py-3.5 px-4">Room</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Paid / Due</th>
                  <th className="py-3.5 px-4">Payment Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                {invoices.map((inv: any) => (
                  <tr key={inv._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-4 sm:px-6">
                      <Link
                        href={`/receptionist/invoices/${inv._id}`}
                        className="font-mono font-bold text-cyan-400 hover:text-cyan-300 transition block"
                      >
                        {inv.invoiceId}
                      </Link>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono font-semibold text-slate-300">
                      {inv.bookingId?.bookingId || "BK-XXXXXX"}
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-semibold text-white">
                        {inv.customerId?.fullName || "Guest"}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {inv.customerId?.phone || "No phone"}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-semibold text-slate-200">
                        Room {inv.roomId?.roomNumber || "N/A"}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {inv.roomId?.roomType}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-bold text-white text-sm">
                        ₹{inv.totalAmount?.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Incl. 12% GST
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono">
                      <span className="text-emerald-400 block font-semibold">
                        ₹{inv.amountPaid?.toLocaleString()} Paid
                      </span>
                      {inv.amountDue > 0 ? (
                        <span className="text-amber-400 text-[11px] font-bold">
                          ₹{inv.amountDue?.toLocaleString()} Due
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Zero Balance</span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          inv.paymentStatus === "PAID"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : inv.paymentStatus === "PARTIALLY_PAID"
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            inv.paymentStatus === "PAID"
                              ? "bg-emerald-400"
                              : inv.paymentStatus === "PARTIALLY_PAID"
                              ? "bg-amber-400 animate-pulse"
                              : "bg-rose-400"
                          }`}
                        />
                        {inv.paymentStatus === "PAID"
                          ? "PAID"
                          : inv.paymentStatus === "PARTIALLY_PAID"
                          ? "PARTIAL"
                          : "UNPAID"}
                      </span>
                    </td>

                    <td className="py-4 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/receptionist/invoices/${inv._id}`}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                          title="View & Print Folio"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>

                        {inv.amountDue > 0 && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsPaymentModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition flex items-center gap-1"
                            title="Record Payment"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>Pay</span>
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

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              Showing <span className="text-white font-semibold">{invoices.length}</span> of{" "}
              <span className="text-white font-semibold">{pagination.total}</span> total invoices
              (Page {pagination.page} of {pagination.totalPages})
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pNum = i + 1;
                  if (pagination.totalPages > 5 && page > 3) {
                    pNum = page - 3 + i;
                    if (pNum > pagination.totalPages) pNum = pagination.totalPages - (4 - i);
                  }
                  return (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                        page === pNum
                          ? "bg-cyan-500 text-slate-950"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages || loading}
                className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PAYMENT RECORDING MODAL */}
      <PaymentModal
        invoice={selectedInvoice}
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedInvoice(null);
        }}
        onSuccess={() => {
          fetchInvoices();
        }}
      />
    </div>
  );
}
