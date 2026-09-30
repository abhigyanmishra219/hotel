"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Users,
  BedDouble,
  Sparkles,
  UtensilsCrossed,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  Clock,
  Building2,
  Receipt,
  DoorOpen,
  ArrowDownLeft,
  ArrowUpRight,
  UserCheck,
  Percent,
} from "lucide-react";
import ReportFilter, { DateRangePreset } from "@/components/reports/ReportFilter";
import { useUser } from "@/context/UserContext";

type ReportTab =
  | "overview"
  | "bookings"
  | "occupancy"
  | "billing"
  | "payments"
  | "customers"
  | "housekeeping"
  | "room-service";

export default function ReceptionistReportsPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");
  const [preset, setPreset] = useState<DateRangePreset>("LAST_30_DAYS");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Tab Data States
  const [overviewData, setOverviewData] = useState<any>(null);
  const [bookingsData, setBookingsData] = useState<any>(null);
  const [occupancyData, setOccupancyData] = useState<any>(null);
  const [billingData, setBillingData] = useState<any>(null);
  const [paymentsData, setPaymentsData] = useState<any>(null);
  const [customersData, setCustomersData] = useState<any>(null);
  const [housekeepingData, setHousekeepingData] = useState<any>(null);
  const [roomServiceData, setRoomServiceData] = useState<any>(null);

  // Filter States for tabular views
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchTabData = async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("preset", preset);
    if (preset === "CUSTOM" && customStart && customEnd) {
      params.set("startDate", customStart);
      params.set("endDate", customEnd);
    }

    if (searchQuery) params.set("search", searchQuery);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (paymentStatusFilter !== "ALL") params.set("paymentStatus", paymentStatusFilter);
    params.set("page", String(currentPage));

    try {
      let endpoint = `/api/reports/${activeTab}?${params.toString()}`;
      if (activeTab === "billing") {
        endpoint = `/api/reports/revenue?${params.toString()}`;
      }

      const res = await fetch(endpoint);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to load report.");
      }

      switch (activeTab) {
        case "overview":
          setOverviewData(data);
          break;
        case "bookings":
          setBookingsData(data);
          break;
        case "occupancy":
          setOccupancyData(data);
          break;
        case "billing":
          setBillingData(data);
          break;
        case "payments":
          setPaymentsData(data);
          break;
        case "customers":
          setCustomersData(data);
          break;
        case "housekeeping":
          setHousekeepingData(data);
          break;
        case "room-service":
          setRoomServiceData(data);
          break;
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while fetching reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTabData();
  }, [activeTab, preset, customStart, customEnd, statusFilter, paymentStatusFilter, currentPage]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      let exportType = activeTab === "billing" ? "revenue" : activeTab;
      if (exportType === "overview") exportType = "bookings";
      params.set("type", exportType);
      params.set("preset", preset);
      if (preset === "CUSTOM" && customStart && customEnd) {
        params.set("startDate", customStart);
        params.set("endDate", customEnd);
      }

      const res = await fetch(`/api/reports/export?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to generate CSV export.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hotel_${activeTab}_report_${new Date().toISOString().split("T")[0]}.csv`;
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

  const handlePrint = () => {
    window.print();
  };

  const tabs: Array<{ id: ReportTab; label: string; icon: any }> = [
    { id: "overview", label: "Executive Overview", icon: BarChart3 },
    { id: "bookings", label: "Bookings & Stays", icon: Calendar },
    { id: "occupancy", label: "Occupancy Information", icon: BedDouble },
    { id: "billing", label: "Billing & Revenue", icon: Receipt },
    { id: "payments", label: "Payments & Balances", icon: CreditCard },
    { id: "customers", label: "Guest Insights", icon: Users },
    { id: "housekeeping", label: "Housekeeping", icon: Sparkles },
    { id: "room-service", label: "Room Service", icon: UtensilsCrossed },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" /> Front Desk Reports & Analytics
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Hotel Operational & Financial Reports
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative, real-time metrics strictly scoped to your property database.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-700/80 rounded-xl hover:bg-slate-800 transition"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>Print Report</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 rounded-xl shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isExporting ? "Generating CSV..." : "Export to CSV"}</span>
          </button>
        </div>
      </div>

      {/* Print-only Header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold text-black">GrandStay Front Desk Management</h1>
        <h2 className="text-base font-semibold text-slate-800">
          {tabs.find((t) => t.id === activeTab)?.label} Report
        </h2>
        <p className="text-xs text-slate-600">
          Generated on {new Date().toLocaleString()} | Period: {preset}
        </p>
        <hr className="my-2 border-slate-400" />
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800 print:hidden">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentPage(1);
                setStatusFilter("ALL");
                setPaymentStatusFilter("ALL");
              }}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-extrabold"
                  : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Reusable Filter Bar */}
      <ReportFilter
        preset={preset}
        onPresetChange={(newPreset) => {
          setPreset(newPreset);
          setCurrentPage(1);
        }}
        startDate={customStart}
        endDate={customEnd}
        onCustomDateChange={(start, end) => {
          setCustomStart(start);
          setCustomEnd(end);
          setCurrentPage(1);
        }}
        onRefresh={fetchTabData}
        onExportCsv={handleExportCsv}
        onPrint={handlePrint}
        isExporting={isExporting}
        isLoading={loading}
      />

      {/* Error State Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-bold">Unable to load report</p>
            <p className="text-rose-400/80">{error}</p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-900/80 border border-slate-800" />
            ))}
          </div>
          <div className="h-72 rounded-2xl bg-slate-900/80 border border-slate-800" />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT: Overview */}
      {/* ========================================================================= */}
      {!loading && !error && activeTab === "overview" && overviewData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Executive Top Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Bookings */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Bookings</span>
                <Calendar className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-black text-white">
                  {overviewData.metrics.bookings.total}
                </p>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                    overviewData.metrics.bookings.delta >= 0
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {overviewData.metrics.bookings.delta >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {overviewData.metrics.bookings.delta >= 0 ? "+" : ""}
                  {overviewData.metrics.bookings.delta} vs prev
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-slate-800/60">
                <span>Confirmed: {overviewData.metrics.bookings.confirmed}</span>
                <span>Active: {overviewData.metrics.bookings.checkedIn}</span>
                <span>Completed: {overviewData.metrics.bookings.completed}</span>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Billed</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-black text-white">
                  ₹{overviewData.metrics.financials.totalRevenue.toLocaleString()}
                </p>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                    overviewData.metrics.financials.deltaRevenue >= 0
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {overviewData.metrics.financials.deltaRevenue >= 0 ? "+" : ""}₹
                  {overviewData.metrics.financials.deltaRevenue.toLocaleString()}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-800/60">
                <span className="text-emerald-400">
                  Paid: ₹{overviewData.metrics.financials.collectedRevenue.toLocaleString()}
                </span>
                <span className="text-rose-400">
                  Due: ₹{overviewData.metrics.financials.outstandingDue.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Current Occupancy */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Current Occupancy
                </span>
                <BedDouble className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-cyan-400">
                  {overviewData.metrics.occupancy.currentOccupancyRate}%
                </p>
                <span className="text-xs text-slate-400">
                  ({overviewData.metrics.occupancy.occupiedRooms}/
                  {overviewData.metrics.occupancy.sellableRooms} operational)
                </span>
              </div>
              <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 flex justify-between">
                <span>Available: {overviewData.metrics.occupancy.availableRooms}</span>
                <span>Cleaning: {overviewData.metrics.occupancy.cleaningRooms}</span>
              </div>
            </div>

            {/* Guests & Customer Stats */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Guest Overview</span>
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-black text-white">
                  {overviewData.metrics.guests?.totalCustomers || 0}
                </p>
                <span className="text-xs text-amber-400 font-bold">
                  +{overviewData.metrics.guests?.newCustomers || 0} new in period
                </span>
              </div>
              <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 flex justify-between">
                <span>Active Guests: {overviewData.metrics.guests?.activeGuests || 0}</span>
                <span>Checked Out: {overviewData.metrics.guests?.checkedOutGuests || 0}</span>
              </div>
            </div>
          </div>

          {/* Operational & Room Inventory Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Housekeeping & Operations */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" /> Operational Turnaround
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block">Pending Housekeeping</span>
                  <span className="text-lg font-bold text-amber-400">
                    {overviewData.metrics.operations.pendingHousekeeping}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block">In Progress Housekeeping</span>
                  <span className="text-lg font-bold text-cyan-400">
                    {overviewData.metrics.operations.inProgressHousekeeping}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block">Completed Housekeeping</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {overviewData.metrics.operations.completedHousekeeping || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block">Pending Room Service</span>
                  <span className="text-lg font-bold text-amber-400">
                    {overviewData.metrics.operations.pendingRoomService}
                  </span>
                </div>
              </div>
            </div>

            {/* Room Status Distribution */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" /> Room Status Distribution
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-emerald-400 text-[10px] uppercase font-bold block">Available</span>
                  <span className="text-base font-bold text-white">
                    {overviewData.metrics.occupancy.availableRooms}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <span className="text-cyan-400 text-[10px] uppercase font-bold block">Occupied</span>
                  <span className="text-base font-bold text-white">
                    {overviewData.metrics.occupancy.occupiedRooms}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-amber-400 text-[10px] uppercase font-bold block">Cleaning</span>
                  <span className="text-base font-bold text-white">
                    {overviewData.metrics.occupancy.cleaningRooms}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <span className="text-rose-400 text-[10px] uppercase font-bold block">Maintenance</span>
                  <span className="text-base font-bold text-white">
                    {overviewData.metrics.occupancy.maintenanceRooms}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Out of Service</span>
                  <span className="text-base font-bold text-white">
                    {overviewData.metrics.occupancy.outOfServiceRooms}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Operational</span>
                  <span className="text-base font-bold text-white">
                    {overviewData.metrics.occupancy.sellableRooms}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT: Bookings Report */}
      {/* ========================================================================= */}
      {!loading && !error && activeTab === "bookings" && bookingsData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Booking Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Bookings</span>
              <p className="text-2xl font-black text-white mt-1">
                {bookingsData.pagination?.total || bookingsData.bookings?.length || 0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-cyan-400 uppercase">Confirmed</span>
              <p className="text-2xl font-black text-cyan-400 mt-1">
                {bookingsData.bookings?.filter((b: any) => b.status === "CONFIRMED").length || 0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-emerald-400 uppercase">Checked In</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {bookingsData.bookings?.filter((b: any) => b.status === "CHECKED_IN").length || 0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-blue-400 uppercase">Checked Out</span>
              <p className="text-2xl font-black text-blue-400 mt-1">
                {bookingsData.bookings?.filter((b: any) => b.status === "COMPLETED").length || 0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-rose-400 uppercase">Cancelled</span>
              <p className="text-2xl font-black text-rose-400 mt-1">
                {bookingsData.bookings?.filter((b: any) => b.status === "CANCELLED").length || 0}
              </p>
            </div>
          </div>

          {/* Bookings Ledger Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white">Booking Records Ledger</h3>
              <span className="text-xs text-slate-400">
                Showing {bookingsData.bookings?.length || 0} of {bookingsData.pagination?.total || 0} records
              </span>
            </div>

            {(!bookingsData.bookings || bookingsData.bookings.length === 0) ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No booking data for the selected period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Booking ID</th>
                      <th className="p-3.5">Guest Name</th>
                      <th className="p-3.5">Room</th>
                      <th className="p-3.5">Check-In</th>
                      <th className="p-3.5">Check-Out</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Payment</th>
                      <th className="p-3.5">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {bookingsData.bookings.map((b: any) => (
                      <tr key={b._id} className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-mono text-cyan-400 font-bold">{b.bookingId}</td>
                        <td className="p-3.5 font-semibold text-white">
                          {b.customerId?.fullName || "—"}
                          <span className="block text-[10px] text-slate-500 font-normal">
                            {b.customerId?.phone || ""}
                          </span>
                        </td>
                        <td className="p-3.5">
                          Room {b.roomId?.roomNumber || "—"}
                          <span className="block text-[10px] text-slate-500">
                            {b.roomId?.roomType || ""}
                          </span>
                        </td>
                        <td className="p-3.5">{new Date(b.checkInDate).toLocaleDateString()}</td>
                        <td className="p-3.5">{new Date(b.checkOutDate).toLocaleDateString()}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              b.status === "CHECKED_IN"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : b.status === "CONFIRMED"
                                ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                                : b.status === "COMPLETED"
                                ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                                : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              b.paymentStatus === "PAID"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : b.paymentStatus === "PARTIALLY_PAID"
                                ? "bg-amber-500/15 text-amber-400"
                                : "bg-rose-500/15 text-rose-400"
                            }`}
                          >
                            {b.paymentStatus}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-white">
                          ₹{(b.invoice?.totalAmount || b.totalPrice || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT: Occupancy Information */}
      {/* ========================================================================= */}
      {!loading && !error && activeTab === "occupancy" && occupancyData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Occupancy KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Current Snapshot Occupancy
              </span>
              <p className="text-3xl font-black text-cyan-400 mt-1">
                {occupancyData.currentSnapshot?.currentOccupancyRate ?? occupancyData.currentSnapshot?.occupancyRate ?? 0}%
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {occupancyData.currentSnapshot?.occupied ?? occupancyData.currentSnapshot?.occupiedRooms ?? 0} occupied of{" "}
                {occupancyData.currentSnapshot?.sellableRooms ?? 0} operational rooms
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Historical Period Occupancy
              </span>
              <p className="text-3xl font-black text-amber-400 mt-1">
                {occupancyData.historicalPerformance?.historicalOccupancyRate ?? occupancyData.historical?.occupancyRate ?? 0}%
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {occupancyData.historicalPerformance?.totalOccupiedRoomNights ?? occupancyData.historical?.totalOccupiedNights ?? 0} room-nights out of{" "}
                {occupancyData.historicalPerformance?.availableSellableRoomNights ?? occupancyData.historical?.sellableRoomNights ?? 0} capacity
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Operational Room Inventory
              </span>
              <p className="text-3xl font-black text-white mt-1">
                {occupancyData.currentSnapshot?.sellableRooms ?? 0} Rooms
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {occupancyData.currentSnapshot?.outOfService ?? occupancyData.currentSnapshot?.outOfServiceRooms ?? 0} out-of-service rooms excluded
              </p>
            </div>
          </div>

          {/* Category Utilization Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Room Type Utilization</h3>
              <span className="text-xs text-slate-400">Current Category Distribution</span>
            </div>
            {(!occupancyData.roomTypeStats || occupancyData.roomTypeStats.length === 0) ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No room category data available.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Room Type</th>
                      <th className="p-3.5">Total Rooms</th>
                      <th className="p-3.5">Currently Occupied</th>
                      <th className="p-3.5">Category Occupancy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {occupancyData.roomTypeStats.map((r: any) => (
                      <tr key={r.roomType} className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-bold text-white">{r.roomType}</td>
                        <td className="p-3.5">{r.totalRooms}</td>
                        <td className="p-3.5 text-cyan-400 font-semibold">{r.occupiedRooms}</td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cyan-400 rounded-full"
                                style={{ width: `${Math.min(100, r.occupancyRate || 0)}%` }}
                              />
                            </div>
                            <span className="font-bold text-white">{r.occupancyRate || 0}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT: Billing & Revenue */}
      {/* ========================================================================= */}
      {!loading && !error && activeTab === "billing" && billingData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Revenue Top KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Billed
              </span>
              <p className="text-3xl font-black text-white mt-1">
                ₹{(billingData.summary?.totalGrossRevenue || billingData.summary?.grossRevenue || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                From {billingData.summary?.totalInvoices || billingData.summary?.invoicesCount || 0} invoices in period
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Collected / Paid
              </span>
              <p className="text-3xl font-black text-emerald-400 mt-1">
                ₹{(billingData.summary?.totalCollected || billingData.summary?.collectedRevenue || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Directly settled payments
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Outstanding Balance
              </span>
              <p className="text-3xl font-black text-rose-400 mt-1">
                ₹{(billingData.summary?.totalOutstanding || billingData.summary?.outstandingDue || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Pending customer dues
              </p>
            </div>
          </div>

          {/* Daily Revenue Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Daily Billing Summary</h3>
              <span className="text-xs text-slate-400">Historical Invoices Aggregation</span>
            </div>
            {(!billingData.timeSeries || billingData.timeSeries.length === 0) ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No billing data for the selected period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Invoices Count</th>
                      <th className="p-3.5">Gross Billed</th>
                      <th className="p-3.5">Collected</th>
                      <th className="p-3.5">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {billingData.timeSeries.map((d: any) => (
                      <tr key={d.date} className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-mono text-white">{d.date}</td>
                        <td className="p-3.5">{d.invoicesCount}</td>
                        <td className="p-3.5 font-bold text-white">
                          ₹{(d.revenue || 0).toLocaleString()}
                        </td>
                        <td className="p-3.5 text-emerald-400">
                          ₹{(d.collected || 0).toLocaleString()}
                        </td>
                        <td className="p-3.5 text-rose-400">
                          ₹{((d.revenue || 0) - (d.collected || 0)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT: Payments & Balances */}
      {/* ========================================================================= */}
      {!loading && !error && activeTab === "payments" && paymentsData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Payment Method Breakdown & Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Invoiced
              </span>
              <p className="text-3xl font-black text-white mt-1">
                ₹{(paymentsData.summary?.totalInvoiced || 0).toLocaleString()}
              </p>
              <div className="text-[11px] text-slate-400 mt-2 flex justify-between">
                <span>Paid Invoices: {paymentsData.summary?.paidCount || 0}</span>
                <span>Partial: {paymentsData.summary?.partialCount || 0}</span>
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Paid
              </span>
              <p className="text-3xl font-black text-emerald-400 mt-1">
                ₹{(paymentsData.summary?.totalPaid || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-2">
                Settled in this period
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Outstanding
              </span>
              <p className="text-3xl font-black text-rose-400 mt-1">
                ₹{(paymentsData.summary?.totalOutstanding || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-2">
                Unpaid Invoices: {paymentsData.summary?.unpaidCount || 0}
              </p>
            </div>
          </div>

          {/* Invoices List Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Outstanding & Settled Invoices</h3>
              <span className="text-xs text-slate-400">
                {paymentsData.invoices?.length || 0} Invoices
              </span>
            </div>
            {(!paymentsData.invoices || paymentsData.invoices.length === 0) ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No payment data for the selected period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Invoice #</th>
                      <th className="p-3.5">Customer</th>
                      <th className="p-3.5">Room</th>
                      <th className="p-3.5">Total (₹)</th>
                      <th className="p-3.5">Paid (₹)</th>
                      <th className="p-3.5">Outstanding (₹)</th>
                      <th className="p-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {paymentsData.invoices.map((inv: any) => (
                      <tr key={inv._id} className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-mono text-cyan-400 font-bold">{inv.invoiceNumber}</td>
                        <td className="p-3.5 font-semibold text-white">{inv.customerId?.fullName || "—"}</td>
                        <td className="p-3.5">Room {inv.roomId?.roomNumber || "—"}</td>
                        <td className="p-3.5 font-bold text-white">₹{(inv.totalAmount || 0).toLocaleString()}</td>
                        <td className="p-3.5 text-emerald-400">₹{(inv.amountPaid || 0).toLocaleString()}</td>
                        <td className="p-3.5 text-rose-400 font-bold">₹{(inv.amountDue || 0).toLocaleString()}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              inv.paymentStatus === "PAID"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : inv.paymentStatus === "PARTIALLY_PAID"
                                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {inv.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT: Guest Insights */}
      {/* ========================================================================= */}
      {!loading && !error && activeTab === "customers" && customersData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Customer Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Customers
              </span>
              <p className="text-3xl font-black text-white mt-1">
                {customersData.summary?.totalCustomers || 0}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Registered Hotel Guests</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                New Registrations
              </span>
              <p className="text-3xl font-black text-cyan-400 mt-1">
                {customersData.summary?.newCustomers || 0}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Created in selected window</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Returning Guests
              </span>
              <p className="text-3xl font-black text-emerald-400 mt-1">
                {customersData.summary?.returningCustomers || 0}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Guests with ≥ 2 bookings</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Guest Spend
              </span>
              <p className="text-3xl font-black text-amber-400 mt-1">
                ₹{(customersData.summary?.totalRevenue || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Invoices in period</p>
            </div>
          </div>

          {/* Customers Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Registered Customer Ledger</h3>
              <span className="text-xs text-slate-400">
                {customersData.customers?.length || 0} Guests Listed
              </span>
            </div>
            {(!customersData.customers || customersData.customers.length === 0) ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No customer records found for the selected period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Customer ID</th>
                      <th className="p-3.5">Name</th>
                      <th className="p-3.5">Contact</th>
                      <th className="p-3.5">Location</th>
                      <th className="p-3.5">Total Bookings</th>
                      <th className="p-3.5">Completed Stays</th>
                      <th className="p-3.5">Total Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {customersData.customers.map((c: any) => (
                      <tr key={c._id} className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-mono text-cyan-400 font-bold">{c.customerId}</td>
                        <td className="p-3.5 font-semibold text-white">{c.fullName}</td>
                        <td className="p-3.5">
                          {c.phone}
                          <span className="block text-[10px] text-slate-500">{c.email}</span>
                        </td>
                        <td className="p-3.5 text-slate-400">{c.location}</td>
                        <td className="p-3.5 font-semibold text-white">{c.totalBookings || 0}</td>
                        <td className="p-3.5 text-emerald-400">{c.completedStays || 0}</td>
                        <td className="p-3.5 font-bold text-amber-400">
                          ₹{(c.totalSpent || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT: Housekeeping */}
      {/* ========================================================================= */}
      {!loading && !error && activeTab === "housekeeping" && housekeepingData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Housekeeping Top KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Tasks</span>
              <p className="text-2xl font-black text-white mt-1">
                {housekeepingData.summary?.totalTasks || 0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-amber-400 uppercase">Pending</span>
              <p className="text-2xl font-black text-amber-400 mt-1">
                {housekeepingData.summary?.pending || 0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-cyan-400 uppercase">In Progress</span>
              <p className="text-2xl font-black text-cyan-400 mt-1">
                {housekeepingData.summary?.inProgress || 0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-emerald-400 uppercase">Completed</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {housekeepingData.summary?.completed || 0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-rose-400 uppercase">Cancelled</span>
              <p className="text-2xl font-black text-rose-400 mt-1">
                {housekeepingData.summary?.cancelled || 0}
              </p>
            </div>
          </div>

          {/* Tasks Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Housekeeping Tasks Ledger</h3>
              <span className="text-xs text-slate-400">
                {housekeepingData.tasks?.length || 0} Tasks
              </span>
            </div>
            {(!housekeepingData.tasks || housekeepingData.tasks.length === 0) ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No housekeeping data for the selected period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Task ID</th>
                      <th className="p-3.5">Room</th>
                      <th className="p-3.5">Assigned Staff</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">Priority</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Created Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {housekeepingData.tasks.map((t: any) => (
                      <tr key={t._id} className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-mono text-cyan-400 font-bold">{t.taskId}</td>
                        <td className="p-3.5 font-bold text-white">Room {t.roomNumber}</td>
                        <td className="p-3.5 text-slate-300">{t.assignedStaff}</td>
                        <td className="p-3.5">{t.type}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.priority === "URGENT" || t.priority === "HIGH"
                                ? "bg-rose-500/15 text-rose-400"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {t.priority}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.status === "COMPLETED"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : t.status === "IN_PROGRESS"
                                ? "bg-cyan-500/15 text-cyan-400"
                                : "bg-amber-500/15 text-amber-400"
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-400">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT: Room Service */}
      {/* ========================================================================= */}
      {!loading && !error && activeTab === "room-service" && roomServiceData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Room Service Top KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Requests</span>
              <p className="text-2xl font-black text-white mt-1">
                {roomServiceData.summary?.totalRequests || 0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-amber-400 uppercase">Pending</span>
              <p className="text-2xl font-black text-amber-400 mt-1">
                {roomServiceData.summary?.pending || 0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-cyan-400 uppercase">In Progress</span>
              <p className="text-2xl font-black text-cyan-400 mt-1">
                {roomServiceData.summary?.inProgress || 0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-emerald-400 uppercase">Completed</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {roomServiceData.summary?.completed || 0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-rose-400 uppercase">Cancelled</span>
              <p className="text-2xl font-black text-rose-400 mt-1">
                {roomServiceData.summary?.cancelled || 0}
              </p>
            </div>
          </div>

          {/* Requests Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Room Service Orders</h3>
              <span className="text-xs text-slate-400">
                {roomServiceData.requests?.length || 0} Requests
              </span>
            </div>
            {(!roomServiceData.requests || roomServiceData.requests.length === 0) ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No room service data for the selected period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Request ID</th>
                      <th className="p-3.5">Room</th>
                      <th className="p-3.5">Items</th>
                      <th className="p-3.5">Assigned Staff</th>
                      <th className="p-3.5">Priority</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Request Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {roomServiceData.requests.map((r: any) => (
                      <tr key={r._id} className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-mono text-cyan-400 font-bold">{r.requestId}</td>
                        <td className="p-3.5 font-bold text-white">Room {r.roomNumber}</td>
                        <td className="p-3.5">
                          {(r.items || []).map((i: any, idx: number) => (
                            <span key={idx} className="block text-[11px] text-slate-300">
                              • {i.item} (x{i.quantity})
                            </span>
                          ))}
                        </td>
                        <td className="p-3.5 text-slate-300">{r.assignedStaff}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.priority === "URGENT" || r.priority === "HIGH"
                                ? "bg-rose-500/15 text-rose-400"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {r.priority}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.status === "COMPLETED"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : r.status === "IN_PROGRESS"
                                ? "bg-cyan-500/15 text-cyan-400"
                                : "bg-amber-500/15 text-amber-400"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-400">
                          {new Date(r.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
