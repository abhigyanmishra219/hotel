"use client";

import React, { useState, useEffect, useTransition } from "react";
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
  Wrench,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  Clock,
  ShieldCheck,
  Building2,
  RefreshCw,
} from "lucide-react";
import ReportFilter, { DateRangePreset } from "@/components/reports/ReportFilter";
import { useUser } from "@/context/UserContext";

type ReportTab =
  | "overview"
  | "revenue"
  | "occupancy"
  | "rooms"
  | "customers"
  | "housekeeping"
  | "room-service"
  | "maintenance"
  | "staff"
  | "payments";

export default function ManagerReportsPage() {
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
  const [revenueData, setRevenueData] = useState<any>(null);
  const [occupancyData, setOccupancyData] = useState<any>(null);
  const [roomsData, setRoomsData] = useState<any>(null);
  const [customersData, setCustomersData] = useState<any>(null);
  const [housekeepingData, setHousekeepingData] = useState<any>(null);
  const [roomServiceData, setRoomServiceData] = useState<any>(null);
  const [maintenanceData, setMaintenanceData] = useState<any>(null);
  const [staffData, setStaffData] = useState<any>(null);
  const [paymentsData, setPaymentsData] = useState<any>(null);

  const fetchTabData = async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("preset", preset);
    if (preset === "CUSTOM" && customStart && customEnd) {
      params.set("startDate", customStart);
      params.set("endDate", customEnd);
    }

    try {
      let endpoint = `/api/reports/${activeTab}?${params.toString()}`;
      if (activeTab === "overview") endpoint = `/api/reports/overview?${params.toString()}`;

      const res = await fetch(endpoint);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to load report.");
      }

      switch (activeTab) {
        case "overview":
          setOverviewData(data);
          break;
        case "revenue":
          setRevenueData(data);
          break;
        case "occupancy":
          setOccupancyData(data);
          break;
        case "rooms":
          setRoomsData(data);
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
        case "maintenance":
          setMaintenanceData(data);
          break;
        case "staff":
          setStaffData(data);
          break;
        case "payments":
          setPaymentsData(data);
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
  }, [activeTab, preset, customStart, customEnd]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("type", activeTab === "overview" ? "revenue" : activeTab);
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
    { id: "revenue", label: "Revenue & Earnings", icon: DollarSign },
    { id: "occupancy", label: "Occupancy Rate", icon: BedDouble },
    { id: "rooms", label: "Room Performance", icon: Building2 },
    { id: "customers", label: "Customer Insights", icon: Users },
    { id: "housekeeping", label: "Housekeeping", icon: Sparkles },
    { id: "room-service", label: "Room Service", icon: UtensilsCrossed },
    { id: "maintenance", label: "Maintenance", icon: Wrench },
    { id: "staff", label: "Staff Operations", icon: ShieldCheck },
    { id: "payments", label: "Payments & Invoices", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" /> Hotel Analytics & Reports
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Operational Intelligence & Financial Reports
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative, real-time metrics aggregated strictly from hotel operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-700/80 rounded-xl hover:bg-slate-800 transition"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print Report</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isExporting ? "Generating CSV..." : "Export to CSV"}</span>
          </button>
        </div>
      </div>

      {/* Print-only Header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold text-black">GrandStay Hotel Management System</h1>
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
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold"
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
        onPresetChange={setPreset}
        startDate={customStart}
        endDate={customEnd}
        onCustomDateChange={(start, end) => {
          setCustomStart(start);
          setCustomEnd(end);
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

      {/* TAB CONTENT: Overview */}
      {!loading && !error && activeTab === "overview" && overviewData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Executive Top Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Bookings */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Bookings</span>
                <Calendar className="w-4 h-4 text-amber-400" />
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
              <div className="text-[11px] text-slate-400 flex gap-3 pt-1 border-t border-slate-800/60">
                <span>Completed: {overviewData.metrics.bookings.completed}</span>
                <span>Cancelled: {overviewData.metrics.bookings.cancelled}</span>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Gross Revenue</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-black text-white">
                  ₹{(overviewData.metrics?.financials?.totalRevenue ?? 0).toLocaleString()}
                </p>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                    (overviewData.metrics?.financials?.deltaRevenue ?? 0) >= 0
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {(overviewData.metrics?.financials?.deltaRevenue ?? 0) >= 0 ? "+" : ""}₹
                  {(overviewData.metrics?.financials?.deltaRevenue ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex gap-3 pt-1 border-t border-slate-800/60">
                <span className="text-emerald-400">
                  Collected: ₹{(overviewData.metrics?.financials?.collectedRevenue ?? 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Outstanding Due */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Outstanding Due</span>
                <CreditCard className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-2xl font-black text-rose-400">
                ₹{(overviewData.metrics?.financials?.outstandingDue ?? 0).toLocaleString()}
              </p>
              <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                <span>Invoices in period: {overviewData.metrics?.financials?.totalInvoices ?? 0}</span>
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
                <p className="text-2xl font-black text-white">
                  {overviewData.metrics.occupancy.currentOccupancyRate}%
                </p>
                <span className="text-xs text-slate-400">
                  ({overviewData.metrics.occupancy.occupiedRooms}/
                  {overviewData.metrics.occupancy.sellableRooms} sellable)
                </span>
              </div>
              <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                <span>Available right now: {overviewData.metrics.occupancy.availableRooms}</span>
              </div>
            </div>
          </div>

          {/* Operational Status Snapshot Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Housekeeping & Operations */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Real-time Operations Snapshot
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block">Pending Cleaning</span>
                  <span className="text-lg font-bold text-amber-400">
                    {overviewData.metrics.operations.pendingHousekeeping}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block">Cleaning In Progress</span>
                  <span className="text-lg font-bold text-cyan-400">
                    {overviewData.metrics.operations.inProgressHousekeeping}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block">Pending Room Service</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {overviewData.metrics.operations.pendingRoomService}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block">Open Maintenance Issues</span>
                  <span className="text-lg font-bold text-rose-400">
                    {overviewData.metrics.operations.openMaintenance}
                  </span>
                </div>
              </div>
            </div>

            {/* Room Inventory Distribution */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" /> Room Inventory Status
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
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Active</span>
                  <span className="text-base font-bold text-white">
                    {overviewData.metrics.occupancy.totalRooms}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Revenue */}
      {!loading && !error && activeTab === "revenue" && revenueData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Revenue Top KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Gross Revenue
              </span>
              <p className="text-3xl font-black text-white mt-1">
                ₹{(revenueData.summary?.grossRevenue ?? revenueData.summary?.totalGrossRevenue ?? 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                From {revenueData.summary?.invoicesCount ?? revenueData.summary?.totalInvoices ?? 0} invoices in this period
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Collected Revenue
              </span>
              <p className="text-3xl font-black text-emerald-400 mt-1">
                ₹{(revenueData.summary?.collectedRevenue ?? revenueData.summary?.totalCollected ?? 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Settled payments directly received
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Outstanding Due
              </span>
              <p className="text-3xl font-black text-rose-400 mt-1">
                ₹{(revenueData.summary?.outstandingDue ?? revenueData.summary?.totalOutstanding ?? 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Pending balance to be collected
              </p>
            </div>
          </div>

          {/* Interactive SVG Revenue Chart */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Daily Revenue Trend
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {((revenueData.dailyRevenue || revenueData.timeSeries || []) as any[]).length} data points
              </span>
            </div>

            {((revenueData.dailyRevenue || revenueData.timeSeries || []) as any[]).length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No revenue records found for this evaluation period.
              </div>
            ) : (
              <div className="space-y-2">
                {/* SVG Line / Bar Chart */}
                <div className="h-56 w-full relative">
                  <svg className="w-full h-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Generate Points */}
                    {(() => {
                      const dailyList = (revenueData.dailyRevenue || revenueData.timeSeries || []) as any[];
                      const maxVal = Math.max(
                        ...dailyList.map((d: any) => d.grossRevenue ?? d.revenue ?? 0),
                        1
                      );
                      const points = dailyList.map((d: any, idx: number) => {
                        const val = d.grossRevenue ?? d.revenue ?? 0;
                        const x =
                          dailyList.length === 1
                            ? 500
                            : (idx / (dailyList.length - 1)) * 960 + 20;
                        const y = 180 - (val / maxVal) * 150;
                        return { x, y, date: d.date, rev: val };
                      });

                      const pathD = points
                        .map((p: any, i: number) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                        .join(" ");

                      const areaD = `${pathD} L ${points[points.length - 1].x} 190 L ${points[0].x} 190 Z`;

                      return (
                        <>
                          <path d={areaD} fill="url(#revGradient)" />
                          <path
                            d={pathD}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          {points.map((p: any, i: number) => (
                            <circle
                              key={i}
                              cx={p.x}
                              cy={p.y}
                              r="4"
                              className="fill-amber-400 stroke-slate-900 stroke-2 hover:r-6 transition-all cursor-pointer"
                            >
                              <title>{`${p.date}: ₹${p.rev.toLocaleString()}`}</title>
                            </circle>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Daily Breakdown Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Daily Revenue Ledger</h3>
              <span className="text-xs text-slate-400">Authoritative Invoice Summaries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Invoices</th>
                    <th className="p-3.5">Gross Revenue</th>
                    <th className="p-3.5">Collected</th>
                    <th className="p-3.5">Outstanding Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {((revenueData.dailyRevenue || revenueData.timeSeries || []) as any[]).map((d: any) => (
                    <tr key={d.date} className="hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono text-white">{d.date}</td>
                      <td className="p-3.5">{d.invoicesCount ?? 0}</td>
                      <td className="p-3.5 font-bold text-white">
                        ₹{(d.grossRevenue ?? d.revenue ?? 0).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-emerald-400">
                        ₹{(d.collectedRevenue ?? d.collected ?? 0).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-rose-400">
                        ₹{(d.outstandingDue ?? ((d.revenue || 0) - (d.collected || 0))).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Occupancy */}
      {!loading && !error && activeTab === "occupancy" && occupancyData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Occupancy KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Current Snapshot Occupancy
              </span>
              <p className="text-3xl font-black text-cyan-400 mt-1">
                {occupancyData.currentSnapshot?.occupancyRate ?? occupancyData.currentSnapshot?.currentOccupancyRate ?? 0}%
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {occupancyData.currentSnapshot?.occupiedRooms ?? occupancyData.currentSnapshot?.occupied ?? 0} occupied of{" "}
                {occupancyData.currentSnapshot?.sellableRooms ?? 0} sellable rooms
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Historical Period Occupancy
              </span>
              <p className="text-3xl font-black text-amber-400 mt-1">
                {occupancyData.historical?.occupancyRate ?? occupancyData.historicalPerformance?.historicalOccupancyRate ?? 0}%
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {occupancyData.historical?.totalOccupiedNights ?? occupancyData.historicalPerformance?.totalOccupiedRoomNights ?? 0} room-nights out of{" "}
                {occupancyData.historical?.sellableRoomNights ?? occupancyData.historicalPerformance?.availableSellableRoomNights ?? 0} capacity
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Sellable Room Inventory
              </span>
              <p className="text-3xl font-black text-white mt-1">
                {occupancyData.currentSnapshot?.sellableRooms ?? 0} Rooms
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {occupancyData.currentSnapshot?.outOfServiceRooms ?? occupancyData.currentSnapshot?.outOfService ?? 0} rooms out-of-service excluded
              </p>
            </div>
          </div>

          {/* Room Type Occupancy Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Occupancy by Room Category</h3>
              <span className="text-xs text-slate-400">Category-wise Utilization</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Room Type</th>
                    <th className="p-3.5">Total Inventory</th>
                    <th className="p-3.5">Bookings in Window</th>
                    <th className="p-3.5">Occupied Room-Nights</th>
                    <th className="p-3.5">Revenue Generated</th>
                    <th className="p-3.5">Category Occupancy Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {((occupancyData.roomTypeBreakdown || occupancyData.roomTypeStats || []) as any[]).map((r: any) => (
                    <tr key={r.roomType} className="hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold text-white">{r.roomType}</td>
                      <td className="p-3.5">{r.totalRooms ?? 0}</td>
                      <td className="p-3.5">{r.bookingsCount ?? 0}</td>
                      <td className="p-3.5">{r.occupiedNights ?? 0} nights</td>
                      <td className="p-3.5 font-bold text-amber-400">
                        ₹{(r.revenue ?? 0).toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-cyan-400 rounded-full"
                              style={{ width: `${Math.min(100, r.occupancyRate ?? 0)}%` }}
                            />
                          </div>
                          <span className="font-bold text-white">{r.occupancyRate ?? 0}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Room Performance */}
      {!loading && !error && activeTab === "rooms" && roomsData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Room Type Aggregates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {((roomsData.roomTypeSummary || roomsData.roomTypes || []) as any[]).map((t: any) => (
              <div key={t.roomType} className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white text-sm">{t.roomType}</span>
                  <span className="text-slate-400">{t.totalRooms ?? 0} rooms</span>
                </div>
                <div className="mt-3 space-y-1 text-xs">
                  <p className="flex justify-between text-slate-400">
                    <span>Bookings:</span> <span className="font-bold text-white">{t.bookings ?? t.totalBookings ?? 0}</span>
                  </p>
                  <p className="flex justify-between text-slate-400">
                    <span>Occupied Nights:</span>{" "}
                    <span className="font-bold text-white">{t.occupiedNights ?? 0}</span>
                  </p>
                  <p className="flex justify-between text-slate-400">
                    <span>Generated Revenue:</span>{" "}
                    <span className="font-bold text-amber-400">₹{(t.revenue ?? t.totalRevenue ?? 0).toLocaleString()}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Individual Room Performance Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Individual Room Performance Ledger</h3>
              <span className="text-xs text-slate-400">{(roomsData.rooms || []).length} Active Rooms</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Room</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Floor</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Base Rate</th>
                    <th className="p-3.5">Total Bookings</th>
                    <th className="p-3.5">Completed Stays</th>
                    <th className="p-3.5">Occupied Nights</th>
                    <th className="p-3.5">Generated Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {(roomsData.rooms || []).map((r: any) => (
                    <tr key={r.roomNumber} className="hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold text-white">Room {r.roomNumber}</td>
                      <td className="p-3.5">{r.roomType}</td>
                      <td className="p-3.5">{r.floor}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3.5">₹{(r.pricePerNight ?? 0).toLocaleString()}</td>
                      <td className="p-3.5 font-semibold text-white">{r.totalBookings ?? 0}</td>
                      <td className="p-3.5 text-emerald-400">{r.completedStays ?? 0}</td>
                      <td className="p-3.5">{r.occupiedNights ?? 0}</td>
                      <td className="p-3.5 font-bold text-amber-400">
                        ₹{(r.revenue ?? r.totalRevenue ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Customers */}
      {!loading && !error && activeTab === "customers" && customersData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Customer Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Guests
              </span>
              <p className="text-3xl font-black text-white mt-1">
                {customersData.summary.totalCustomers}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Hotel registered customer profiles</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                New Guests in Period
              </span>
              <p className="text-3xl font-black text-cyan-400 mt-1">
                {customersData.summary.newCustomers}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">First-time registered profiles</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Returning Guests
              </span>
              <p className="text-3xl font-black text-amber-400 mt-1">
                {customersData.summary.returningCustomers}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Guests with 2+ bookings</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Guest Spend
              </span>
              <p className="text-3xl font-black text-emerald-400 mt-1">
                ₹{(customersData.summary?.totalRevenue ?? 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Generated by guests in period</p>
            </div>
          </div>

          {/* Customer Records Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Customer History & Lifetime Spend</h3>
              <span className="text-xs text-slate-400">
                Page {customersData.pagination?.page ?? 1} of {customersData.pagination?.totalPages ?? 1}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Customer ID</th>
                    <th className="p-3.5">Guest Name</th>
                    <th className="p-3.5">Phone</th>
                    <th className="p-3.5">Location</th>
                    <th className="p-3.5">Total Bookings</th>
                    <th className="p-3.5">Completed Stays</th>
                    <th className="p-3.5">Lifetime Spend</th>
                    <th className="p-3.5">Outstanding Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {(customersData.customers || []).map((c: any) => (
                    <tr key={c.customerId} className="hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono text-amber-400">{c.customerId}</td>
                      <td className="p-3.5 font-bold text-white">{c.fullName}</td>
                      <td className="p-3.5 text-slate-400">{c.phone}</td>
                      <td className="p-3.5">{c.location}</td>
                      <td className="p-3.5 font-semibold text-white">{c.totalBookings ?? 0}</td>
                      <td className="p-3.5 text-emerald-400">{c.completedStays ?? 0}</td>
                      <td className="p-3.5 font-bold text-white">₹{(c.totalSpent ?? 0).toLocaleString()}</td>
                      <td className="p-3.5 text-rose-400">₹{(c.totalDue ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Housekeeping */}
      {!loading && !error && activeTab === "housekeeping" && housekeepingData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Housekeeping Top Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Cleaning Tasks
              </span>
              <p className="text-3xl font-black text-white mt-1">
                {housekeepingData.summary.totalTasks}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Generated during this window</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Completed Tasks
              </span>
              <p className="text-3xl font-black text-emerald-400 mt-1">
                {housekeepingData.summary.completed}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {housekeepingData.summary.completionRate}% completion rate
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Pending Tasks
              </span>
              <p className="text-3xl font-black text-amber-400 mt-1">
                {housekeepingData.summary.pending}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Awaiting staff pickup</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                In Progress
              </span>
              <p className="text-3xl font-black text-cyan-400 mt-1">
                {housekeepingData.summary.inProgress}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Actively being cleaned</p>
            </div>
          </div>

          {/* Staff Housekeeping Performance */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Staff Cleaning Performance</h3>
              <span className="text-xs text-slate-400">Turnaround & Efficiency</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Staff Name</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Tasks Assigned</th>
                    <th className="p-3.5">Tasks Completed</th>
                    <th className="p-3.5">Tasks Pending</th>
                    <th className="p-3.5">Avg Turnaround Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {housekeepingData.staffPerformance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500">
                        No housekeeping tasks assigned to staff during this period.
                      </td>
                    </tr>
                  ) : (
                    housekeepingData.staffPerformance.map((s: any) => (
                      <tr key={s.staffId} className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-bold text-white">{s.staffName}</td>
                        <td className="p-3.5 text-slate-400">{s.staffEmail || "—"}</td>
                        <td className="p-3.5">{s.tasksAssigned}</td>
                        <td className="p-3.5 text-emerald-400 font-bold">{s.tasksCompleted}</td>
                        <td className="p-3.5 text-amber-400">{s.tasksPending}</td>
                        <td className="p-3.5 font-mono text-cyan-400">
                          {s.avgCompletionTimeMinutes}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Room Service */}
      {!loading && !error && activeTab === "room-service" && roomServiceData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Room Service Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Orders
              </span>
              <p className="text-3xl font-black text-white mt-1">
                {roomServiceData.summary.totalRequests}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Room service requests logged</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Completed / Delivered
              </span>
              <p className="text-3xl font-black text-emerald-400 mt-1">
                {roomServiceData.summary.completed}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {roomServiceData.summary.completionRate}% fulfillment rate
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Pending Orders
              </span>
              <p className="text-3xl font-black text-amber-400 mt-1">
                {roomServiceData.summary.pending}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Awaiting fulfillment</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                In Preparation / Delivery
              </span>
              <p className="text-3xl font-black text-cyan-400 mt-1">
                {roomServiceData.summary.inProgress}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Currently being served</p>
            </div>
          </div>

          {/* Popular Items Breakdown */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-amber-400" /> Most Frequently Ordered Items
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {roomServiceData.popularItems.length === 0 ? (
                <div className="col-span-4 text-xs text-slate-500 py-4">
                  No order items recorded in this period.
                </div>
              ) : (
                roomServiceData.popularItems.map((item: any) => (
                  <div
                    key={item.name}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex justify-between items-center text-xs"
                  >
                    <span className="font-semibold text-white">{item.name}</span>
                    <span className="font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400">
                      x{item.quantityOrdered}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Maintenance */}
      {!loading && !error && activeTab === "maintenance" && maintenanceData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Maintenance KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Incidents
              </span>
              <p className="text-3xl font-black text-white mt-1">
                {maintenanceData.summary.totalRequests}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Resolved Issues
              </span>
              <p className="text-3xl font-black text-emerald-400 mt-1">
                {maintenanceData.summary.resolved}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {maintenanceData.summary.resolutionRate}% resolution rate
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Open / Assigned
              </span>
              <p className="text-3xl font-black text-rose-400 mt-1">
                {maintenanceData.summary.open + maintenanceData.summary.assigned}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                In Repair
              </span>
              <p className="text-3xl font-black text-cyan-400 mt-1">
                {maintenanceData.summary.inProgress}
              </p>
            </div>
          </div>

          {/* Frequently Affected Rooms */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-rose-400" /> Frequently Affected Rooms
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {maintenanceData.affectedRooms.length === 0 ? (
                <div className="col-span-3 text-xs text-slate-500 py-4">
                  No maintenance incidents reported in this period.
                </div>
              ) : (
                maintenanceData.affectedRooms.map((r: any) => (
                  <div
                    key={r.roomNumber}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">Room {r.roomNumber}</span>
                      <span className="text-rose-400 font-bold">{r.incidentCount} incidents</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      {r.roomType} • Floor {r.floor}
                    </p>
                    <div className="flex gap-2 text-[10px] text-slate-400 pt-1">
                      <span className="text-emerald-400">Resolved: {r.resolvedCount}</span>
                      <span className="text-rose-400">Open: {r.openCount}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Staff Operations */}
      {!loading && !error && activeTab === "staff" && staffData && (
        <div className="space-y-6 animate-fadeIn">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Staff Operational Activity</h3>
                <p className="text-xs text-slate-400">
                  Cross-department operational tasks (Housekeeping, Room Service & Maintenance)
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Staff Member</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Housekeeping (Done / Total)</th>
                    <th className="p-3.5">Room Service (Done / Total)</th>
                    <th className="p-3.5">Maintenance (Done / Total)</th>
                    <th className="p-3.5">Total Assigned</th>
                    <th className="p-3.5">Total Resolved</th>
                    <th className="p-3.5">Overall Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {staffData.staff.map((s: any) => (
                    <tr key={s.staffId} className="hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold text-white">{s.name}</td>
                      <td className="p-3.5 font-mono text-slate-400">{s.role}</td>
                      <td className="p-3.5">
                        {s.housekeeping.completed} / {s.housekeeping.total}
                      </td>
                      <td className="p-3.5">
                        {s.roomService.completed} / {s.roomService.total}
                      </td>
                      <td className="p-3.5">
                        {s.maintenance.resolved} / {s.maintenance.total}
                      </td>
                      <td className="p-3.5 font-semibold text-white">{s.totalAssigned}</td>
                      <td className="p-3.5 text-emerald-400 font-bold">{s.totalResolved}</td>
                      <td className="p-3.5">
                        <span className="font-bold text-white">{s.completionRate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Payments */}
      {!loading && !error && activeTab === "payments" && paymentsData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Payment Status Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Invoiced
              </span>
              <p className="text-3xl font-black text-white mt-1">
                ₹{(paymentsData.summary?.totalInvoiced ?? 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {paymentsData.summary?.invoicesCount ?? paymentsData.summary?.totalInvoices ?? 0} total invoices
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Paid Invoices
              </span>
              <p className="text-3xl font-black text-emerald-400 mt-1">
                {paymentsData.summary?.paidCount ?? 0}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                ₹{(paymentsData.summary?.totalPaid ?? 0).toLocaleString()} collected
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Partially Paid
              </span>
              <p className="text-3xl font-black text-amber-400 mt-1">
                {paymentsData.summary?.partialCount ?? 0}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Partial balances remaining</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Unpaid Invoices
              </span>
              <p className="text-3xl font-black text-rose-400 mt-1">
                {paymentsData.summary?.unpaidCount ?? 0}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                ₹{(paymentsData.summary?.totalDue ?? paymentsData.summary?.totalOutstanding ?? 0).toLocaleString()} outstanding due
              </p>
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" /> Payment Methods Distribution
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {((paymentsData.methodsBreakdown || []) as any[]).map((m: any) => (
                <div
                  key={m.method}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex justify-between items-center text-xs"
                >
                  <span className="font-semibold text-slate-300">{m.method}</span>
                  <span className="font-bold text-white">
                    ₹{(m.collected ?? 0).toLocaleString()} ({m.count ?? 0})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
