"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Receipt,
  Search,
  Eye,
  DollarSign,
  AlertCircle,
  Loader2,
  RefreshCw,
  DoorOpen,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { IInvoiceData, PaymentStatus } from "@/types/invoice";
import PaymentModal from "@/components/operations/PaymentModal";

export default function ManagerBillingPage() {
  const { token } = useUser();

  const [invoices, setInvoices] = useState<IInvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "ALL">("ALL");

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
    } catch (err: any) {
      setError(err.message || "Failed to load billing ledger");
    } finally {
      setLoading(false);
    }
  }, [token, search, paymentStatus]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4" />
            <span>Financial Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Hotel Invoices &amp; Folios
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Property billing audit, guest stay settlements, and payment collection tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchInvoices}
            disabled={loading}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700/80 transition"
            title="Refresh invoices"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
          </button>
          <Link
            href="/manager/bookings"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20 transition"
          >
            <DoorOpen className="w-4 h-4" />
            <span>View Reservations</span>
          </Link>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search invoice ID, guest, phone, room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/60 rounded-xl p-1 text-xs w-full sm:w-auto justify-end">
          {(["ALL", "PAID", "PARTIALLY_PAID", "UNPAID"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setPaymentStatus(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                paymentStatus === st
                  ? "bg-amber-500 text-slate-950 shadow-sm font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {st === "ALL"
                ? "All Invoices"
                : st === "PAID"
                ? "Paid"
                : st === "PARTIALLY_PAID"
                ? "Partial"
                : "Unpaid"}
            </button>
          ))}
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
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
            <p className="text-sm font-medium">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400 mx-auto mb-4">
              <Receipt className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">No invoices found</h3>
            <p className="text-slate-400 text-xs max-w-md mx-auto mt-1 mb-6">
              {search || paymentStatus !== "ALL"
                ? "No billing records match your filter criteria."
                : "Invoices are generated automatically during guest check-out settlement."}
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
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                {invoices.map((inv: any) => (
                  <tr key={inv._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-4 sm:px-6">
                      <Link
                        href={`/manager/invoices/${inv._id}`}
                        className="font-mono font-bold text-amber-400 hover:text-amber-300 transition block"
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
                        {inv.customerId?.phone}
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
                        {inv.paymentStatus}
                      </span>
                    </td>

                    <td className="py-4 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/manager/invoices/${inv._id}`}
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
