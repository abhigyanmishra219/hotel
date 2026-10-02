"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Receipt,
  Search,
  DollarSign,
  AlertCircle,
  Loader2,
  RefreshCw,
  DoorOpen,
  DoorClosed,
  Calendar,
  CreditCard,
  Printer,
  Download,
  Eye,
  ArrowRight,
  TrendingUp,
  Wallet,
  Building,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import PaymentModal from "@/components/operations/PaymentModal";
import CheckOutModal from "@/components/operations/CheckOutModal";
import FolioModal from "@/components/operations/FolioModal";
import InvoicePrintView from "@/components/operations/InvoicePrintView";

export default function ManagerBillingPage() {
  const { token } = useUser();
  const searchParams = useSearchParams();
  const initialBookingId = searchParams.get("bookingId");

  const [openFolios, setOpenFolios] = useState<any[]>([]);
  const [finalizedInvoices, setFinalizedInvoices] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    openFoliosCount: 0,
    finalizedInvoicesCount: 0,
    totalOpenBalance: 0,
    totalOpenCharges: 0,
    totalOpenPaid: 0,
    totalCollected: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Tabs
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<string>("ALL");
  const [stayStatus, setStayStatus] = useState<string>("ALL");
  const [activeSection, setActiveSection] = useState<"ALL" | "FOLIOS" | "INVOICES">("ALL");

  // Modals state
  const [selectedFolioId, setSelectedFolioId] = useState<string | null>(null);
  const [isFolioModalOpen, setIsFolioModalOpen] = useState(false);

  const [targetPaymentItem, setTargetPaymentItem] = useState<any | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [targetCheckoutBooking, setTargetCheckoutBooking] = useState<any | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // Dedicated Print-Only Invoice State
  const [printableInvoice, setPrintableInvoice] = useState<any | null>(null);
  const [hotelInfo, setHotelInfo] = useState<any | null>(null);

  // Fetch billing ledger
  const fetchBillingData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (paymentStatus !== "ALL") params.set("paymentStatus", paymentStatus);
      if (stayStatus !== "ALL") params.set("stayStatus", stayStatus);

      const res = await fetch(`/api/billing?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load billing records");
      }

      setOpenFolios(data.openFolios || []);
      setFinalizedInvoices(data.finalizedInvoices || []);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load property billing ledger");
    } finally {
      setLoading(false);
    }
  }, [token, search, paymentStatus, stayStatus]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  // Handle URL pre-selection of booking folio (e.g. from reservations page)
  useEffect(() => {
    if (initialBookingId && !isFolioModalOpen) {
      setSelectedFolioId(initialBookingId);
      setIsFolioModalOpen(true);
    }
  }, [initialBookingId]);

  // Handlers for interactive actions
  const handleOpenFolio = (id: string) => {
    setSelectedFolioId(id);
    setIsFolioModalOpen(true);
  };

  const handleOpenPayment = (item: any) => {
    setTargetPaymentItem(item);
    setIsPaymentModalOpen(true);
  };

  const handleOpenCheckout = (folio: any) => {
    const bookingObj = {
      _id: folio._id,
      bookingId: folio.bookingId,
      customerId: {
        _id: folio.customerId,
        fullName: folio.guestName,
        phone: folio.guestPhone,
        email: folio.guestEmail,
      },
      roomId: {
        _id: folio.roomId,
        roomNumber: folio.roomNumber,
        roomType: folio.roomType,
      },
      checkInDate: folio.checkInDate,
      checkOutDate: folio.checkOutDate,
      numberOfNights: folio.numberOfNights,
      pricePerNight: folio.pricePerNight,
      discount: folio.discount || 0,
      totalPaid: folio.totalPaid || 0,
    };
    setTargetCheckoutBooking(bookingObj);
    setIsCheckoutModalOpen(true);
  };

  // Dedicated single-invoice print trigger
  const handlePrintOnlyInvoice = async (inv: any) => {
    let invoiceData = inv;
    let hotelData = hotelInfo;

    try {
      const res = await fetch(`/api/billing/${inv._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const resJson = await res.json();
      if (resJson.invoice) {
        invoiceData = resJson.invoice;
      }
      if (resJson.hotel) {
        hotelData = resJson.hotel;
        setHotelInfo(resJson.hotel);
      }
    } catch {
      // Fallback to table item
    }

    setPrintableInvoice(invoiceData);

    // Give DOM time to update with only this invoice before opening print dialog
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const hasAnyRecords = openFolios.length > 0 || finalizedInvoices.length > 0;

  return (
    <>
      {/* 1. MAIN BILLING DASHBOARD (Completely hidden during printing) */}
      <div className="dashboard-hide-print space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-20">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
              <Receipt className="w-4 h-4" />
              <span>Financial Operations &amp; Cashiering</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Billing &amp; Folios
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              In-house guest charges, realtime folios, checkout settlements, and finalized invoices.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchBillingData}
              disabled={loading}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700/80 transition"
              title="Refresh billing data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
            </button>
            <Link
              href="/manager/bookings"
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition"
            >
              <DoorOpen className="w-4 h-4" />
              <span>View Reservations</span>
            </Link>
          </div>
        </div>

        {/* Financial KPIs Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Active Stays
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <DoorOpen className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white mt-2">
              {summary.openFoliosCount}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Open guest folios in house
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Unsettled Balance
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-rose-400 mt-2 font-mono">
              ₹{summary.totalOpenBalance?.toLocaleString() || "0"}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Due across active stays
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Collected
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2 font-mono">
              ₹{summary.totalCollected?.toLocaleString() || "0"}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Deposits + settled receipts
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Finalized Invoices
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white mt-2">
              {summary.finalizedInvoicesCount}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Archived tax invoices
            </span>
          </div>
        </div>

        {/* Filter and View Controls */}
        <div className="p-4 bg-slate-900/70 border border-slate-800/80 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search booking ID, invoice, guest, room, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
            />
          </div>

          {/* Section View Tabs & Payment Status Filter */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
            {/* Section Selector */}
            <div className="flex items-center bg-slate-800/70 border border-slate-700/70 rounded-xl p-1 text-xs">
              <button
                onClick={() => setActiveSection("ALL")}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  activeSection === "ALL"
                    ? "bg-amber-500 text-slate-950 font-bold shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All Sections
              </button>
              <button
                onClick={() => setActiveSection("FOLIOS")}
                className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                  activeSection === "FOLIOS"
                    ? "bg-amber-500 text-slate-950 font-bold shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>Active Stays</span>
                <span className="px-1.5 py-0.2 bg-slate-950/40 rounded text-[10px] font-mono">
                  {openFolios.length}
                </span>
              </button>
              <button
                onClick={() => setActiveSection("INVOICES")}
                className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                  activeSection === "INVOICES"
                    ? "bg-amber-500 text-slate-950 font-bold shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>Final Invoices</span>
                <span className="px-1.5 py-0.2 bg-slate-950/40 rounded text-[10px] font-mono">
                  {finalizedInvoices.length}
                </span>
              </button>
            </div>

            {/* Payment Status Dropdown */}
            <div className="flex items-center gap-1 bg-slate-800/70 border border-slate-700/70 rounded-xl p-1 text-xs">
              {(["ALL", "UNPAID", "PARTIALLY_PAID", "PAID"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setPaymentStatus(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    paymentStatus === st
                      ? "bg-slate-700 text-white font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {st === "ALL" ? "All" : st === "PARTIALLY_PAID" ? "Partial" : st === "PAID" ? "Paid" : "Unpaid"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
            <p className="text-sm font-medium">Synchronizing billing records &amp; guest folios...</p>
          </div>
        ) : !hasAnyRecords ? (
          <div className="p-16 text-center bg-slate-900/50 rounded-3xl border border-slate-800/80">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400 mx-auto mb-4">
              <Receipt className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-white">No billing records found</h3>
            <p className="text-slate-400 text-xs max-w-md mx-auto mt-1 mb-6">
              {search || paymentStatus !== "ALL"
                ? "No billing folios or invoices matched your search filter criteria."
                : "No active guest stays or completed tax invoices recorded yet."}
            </p>
            <Link
              href="/manager/bookings"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition"
            >
              <DoorOpen className="w-4 h-4 text-amber-400" />
              <span>Go to Reservations</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {/* SECTION 1: ACTIVE / OPEN FOLIOS */}
            {(activeSection === "ALL" || activeSection === "FOLIOS") && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                      <DoorOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                        <span>Active / Open Folios</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {openFolios.length} {openFolios.length === 1 ? "Stay" : "Stays"}
                        </span>
                      </h2>
                      <p className="text-slate-400 text-xs">
                        Live charges for guests currently checked-in or scheduled reservations
                      </p>
                    </div>
                  </div>
                </div>

                {openFolios.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800/60">
                    <p className="text-xs text-slate-400">
                      No active in-house stays match your filter criteria.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {openFolios.map((folio) => (
                      <div
                        key={folio._id}
                        className="bg-slate-900/80 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between space-y-4"
                      >
                        {/* Card Header */}
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-mono uppercase font-bold text-amber-400">
                                Room {folio.roomNumber} ({folio.roomType})
                              </span>
                              <h3 className="text-base font-bold text-white truncate max-w-[200px]">
                                {folio.guestName}
                              </h3>
                              {folio.guestPhone && (
                                <p className="text-[11px] text-slate-400 font-mono">
                                  {folio.guestPhone}
                                </p>
                              )}
                            </div>

                            <div className="text-right">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  folio.bookingStatus === "CHECKED_IN"
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                    : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                {folio.bookingStatus === "CHECKED_IN" ? "In-House" : folio.bookingStatus}
                              </span>
                              <Link
                                href={`/manager/bookings/${folio._id}`}
                                className="text-[11px] font-mono text-slate-400 hover:text-amber-400 transition block mt-1 flex items-center justify-end gap-1"
                                title="View reservation dossier"
                              >
                                <span>{folio.bookingId}</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </div>
                          </div>

                          {/* Stay Dates */}
                          <div className="mt-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs flex items-center justify-between text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-amber-400" />
                              <span>
                                {new Date(folio.checkInDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                {" → "}
                                {new Date(folio.checkOutDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            </div>
                            <span className="font-mono text-slate-400 text-[11px]">
                              {folio.numberOfNights}N
                            </span>
                          </div>

                          {/* Financial Ledger Mini Summary */}
                          <div className="mt-3.5 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between text-slate-400">
                              <span>Total Charges:</span>
                              <span className="font-mono text-white font-semibold">
                                ₹{folio.totalCharges.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-slate-400">
                              <span>Total Paid:</span>
                              <span className="font-mono text-emerald-400 font-semibold">
                                ₹{folio.totalPaid.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-800">
                              <span className="font-bold text-slate-200">Balance Due:</span>
                              <span
                                className={`font-mono text-sm font-black ${
                                  folio.balance > 0 ? "text-amber-400" : "text-emerald-400"
                                }`}
                              >
                                ₹{folio.balance.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                          <button
                            onClick={() => handleOpenFolio(folio._id)}
                            className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition flex items-center justify-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span>View Bill</span>
                          </button>

                          <button
                            onClick={() => handleOpenPayment(folio)}
                            className="py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-semibold text-xs border border-emerald-500/30 transition flex items-center justify-center gap-1"
                            title="Record payment receipt"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Add Pay</span>
                          </button>

                          {folio.bookingStatus === "CHECKED_IN" && (
                            <button
                              onClick={() => handleOpenCheckout(folio)}
                              className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition flex items-center justify-center gap-1"
                              title="Check out guest"
                            >
                              <DoorClosed className="w-3.5 h-3.5" />
                              <span>Checkout</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SECTION 2: FINALIZED INVOICES */}
            {(activeSection === "ALL" || activeSection === "INVOICES") && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                        <span>Finalized Invoices</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {finalizedInvoices.length}
                        </span>
                      </h2>
                      <p className="text-slate-400 text-xs">
                        Official tax invoices generated upon checkout settlement
                      </p>
                    </div>
                  </div>
                </div>

                {finalizedInvoices.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800/60">
                    <p className="text-xs text-slate-400">
                      No finalized invoices recorded yet. Invoices appear here once stays are checked out.
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="py-3.5 px-4 sm:px-6">Invoice #</th>
                            <th className="py-3.5 px-4">Guest</th>
                            <th className="py-3.5 px-4">Booking Ref</th>
                            <th className="py-3.5 px-4">Room</th>
                            <th className="py-3.5 px-4">Invoice Date</th>
                            <th className="py-3.5 px-4 text-right">Total</th>
                            <th className="py-3.5 px-4 text-right">Paid</th>
                            <th className="py-3.5 px-4 text-center">Status</th>
                            <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {finalizedInvoices.map((inv) => (
                            <tr key={inv._id} className="hover:bg-slate-800/30 transition">
                              <td className="py-4 px-4 sm:px-6">
                                <Link
                                  href={`/manager/invoices/${inv._id}`}
                                  className="font-mono font-bold text-amber-400 hover:text-amber-300 transition text-left"
                                >
                                  {inv.invoiceId}
                                </Link>
                              </td>

                              <td className="py-4 px-4">
                                <span className="font-semibold text-white block">
                                  {inv.guestName}
                                </span>
                                {inv.guestPhone && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {inv.guestPhone}
                                  </span>
                                )}
                              </td>

                              <td className="py-4 px-4 font-mono font-medium">
                                {inv.bookingDbId ? (
                                  <Link
                                    href={`/manager/bookings/${inv.bookingDbId}`}
                                    className="text-slate-300 hover:text-amber-400 transition flex items-center gap-1"
                                  >
                                    <span>{inv.bookingRef}</span>
                                    <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
                                  </Link>
                                ) : (
                                  <span className="text-slate-400">{inv.bookingRef}</span>
                                )}
                              </td>

                              <td className="py-4 px-4">
                                <span className="font-semibold text-slate-200">
                                  Room {inv.roomNumber}
                                </span>
                              </td>

                              <td className="py-4 px-4 font-mono text-slate-400">
                                {new Date(inv.invoiceDate).toLocaleDateString()}
                              </td>

                              <td className="py-4 px-4 text-right font-mono font-bold text-white">
                                ₹{inv.totalAmount?.toLocaleString()}
                              </td>

                              <td className="py-4 px-4 text-right font-mono text-emerald-400">
                                ₹{inv.amountPaid?.toLocaleString()}
                              </td>

                              <td className="py-4 px-4 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    inv.paymentStatus === "PAID"
                                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                      : inv.paymentStatus === "PARTIALLY_PAID"
                                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                      : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                  }`}
                                >
                                  {inv.paymentStatus === "PAID"
                                    ? "Paid"
                                    : inv.paymentStatus === "PARTIALLY_PAID"
                                    ? "Partial"
                                    : "Unpaid"}
                                </span>
                              </td>

                              <td className="py-4 px-4 sm:px-6 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Link
                                    href={`/manager/invoices/${inv._id}`}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                                    title="View invoice"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </Link>
                                  <button
                                    onClick={() => handlePrintOnlyInvoice(inv)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                                    title="Print invoice"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                                  </button>
                                  <button
                                    onClick={() => handlePrintOnlyInvoice(inv)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                                    title="Download PDF"
                                  >
                                    <Download className="w-3.5 h-3.5 text-blue-400" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* INTERACTIVE FOLIO & INVOICE PREVIEW MODAL */}
        <FolioModal
          isOpen={isFolioModalOpen}
          onClose={() => setIsFolioModalOpen(false)}
          targetId={selectedFolioId}
          onAddPayment={(item) => handleOpenPayment(item)}
          onCheckout={(b) => handleOpenCheckout(b)}
        />

        {/* RECORD PAYMENT MODAL */}
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          invoice={targetPaymentItem}
          onSuccess={() => {
            fetchBillingData();
          }}
        />

        {/* CHECKOUT MODAL */}
        <CheckOutModal
          isOpen={isCheckoutModalOpen}
          onClose={() => setIsCheckoutModalOpen(false)}
          booking={targetCheckoutBooking}
          portalType="manager"
          onSuccess={() => {
            fetchBillingData();
          }}
        />
      </div>

      {/* 2. DEDICATED PRINT CONTAINER: Completely hidden on screen, ONLY element rendered during window.print() */}
      {printableInvoice && (
        <div className="hidden print:block">
          <InvoicePrintView invoice={printableInvoice} hotel={hotelInfo} />
        </div>
      )}
    </>
  );
}
