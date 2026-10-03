"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BedDouble,
  DoorOpen,
  DoorClosed,
  CalendarCheck,
  Users,
  UserCheck,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Layers,
  Wrench,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Building2,
  Clock,
  CheckCircle2,
  Percent,
  PowerOff,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import HotelOverviewCard from "@/components/manager/HotelOverviewCard";
import ManagerKpiCard from "@/components/manager/ManagerKpiCard";
import ManagerQuickActions from "@/components/manager/ManagerQuickActions";

export default function ManagerDashboardPage() {
  const router = useRouter();
  const { user, token } = useUser();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const fetchDashboardData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/manager/dashboard/stats", {
        headers,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load manager dashboard metrics");
      }

      setDashboardData(data);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || "Failed to load hotel metrics. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchDashboardData();
    }
  }, [user, token]);

  const hotel = dashboardData?.hotel || null;
  const subscription = dashboardData?.subscription || null;
  const stats = dashboardData?.stats || null;

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-950 border border-amber-500/20 p-6 sm:p-8 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-semibold mb-3">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>GrandStay Manager Portal • Phase 2 Room Management Active</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Welcome, {user?.name || "Manager"}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
              Operating property{" "}
              <strong className="text-slate-200">
                {hotel?.name || user?.hotelName || "Your Assigned Hotel"}
              </strong>
              {hotel?.city ? ` (${hotel.city}${hotel.state ? `, ${hotel.state}` : ""})` : ""}. Manage guest rooms, reservations, staff shifts, and hotel operations.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={loading || refreshing}
              className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium border border-slate-700 transition flex items-center gap-2 disabled:opacity-60"
              title="Refresh dashboard data"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-amber-400" : "text-slate-400"}`}
              />
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            <Link
              href="/manager/rooms"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition flex items-center gap-1.5"
            >
              <BedDouble className="w-3.5 h-3.5" />
              <span>Manage Rooms</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Error state alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchDashboardData(false)}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold rounded-lg border border-rose-500/30 transition"
          >
            Try Again
          </button>
        </div>
      )}

      {/* 1. MY HOTEL OVERVIEW CARD */}
      <HotelOverviewCard
        hotel={hotel}
        subscription={subscription}
        loading={loading}
      />

      {/* 2. OPERATIONAL DASHBOARD KPI CARDS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Operational Overview &amp; Live Occupancy
            </h2>
            <p className="text-xs text-slate-400">
              Live database metrics for room occupancy, capacity, and housekeeping
            </p>
          </div>
          <Link
            href="/manager/rooms"
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
          >
            <span>View All Rooms</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Primary Operational KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: TOTAL ROOMS */}
          <ManagerKpiCard
            title="TOTAL ROOMS"
            value={stats?.rooms?.total ?? 0}
            icon={BedDouble}
            subtitle={
              subscription?.maxRooms
                ? `Plan Limit: ${subscription.maxRooms === -1 ? "Unlimited" : subscription.maxRooms} rooms`
                : "Configured rooms"
            }
            badge="Phase 2 Active"
            accentColor="amber"
            loading={loading}
          />

          {/* Card 2: OCCUPANCY RATE */}
          <ManagerKpiCard
            title="OCCUPANCY RATE"
            value={`${stats?.rooms?.occupancyRate ?? 0}%`}
            icon={Percent}
            subtitle={
              stats?.rooms?.total > 0
                ? `${stats.rooms.occupied} of ${stats.rooms.total} active rooms occupied`
                : "No active rooms yet"
            }
            badge="Live Rate"
            accentColor="indigo"
            loading={loading}
          />

          {/* Card 3: AVAILABLE ROOMS */}
          <ManagerKpiCard
            title="AVAILABLE ROOMS"
            value={stats?.rooms?.available ?? 0}
            icon={DoorOpen}
            subtitle={
              stats?.rooms?.total > 0
                ? `${Math.round(((stats?.rooms?.available || 0) / (stats?.rooms?.total || 1)) * 100)}% of total capacity`
                : "Ready for check-in"
            }
            badge="Available"
            accentColor="emerald"
            loading={loading}
          />

          {/* Card 4: ACTIVE BOOKINGS */}
          <ManagerKpiCard
            title="ACTIVE BOOKINGS"
            value={stats?.bookings?.active ?? 0}
            icon={CalendarCheck}
            subtitle={
              stats?.bookings?.active === 0
                ? "No data available yet"
                : `${stats?.bookings?.active} guest reservations`
            }
            badge="Phase 5"
            accentColor="cyan"
            loading={loading}
          />
        </div>

        {/* Secondary Real-time Metrics (Cleaning, Maintenance & Active Staff) */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
          {/* Occupied Rooms */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <DoorClosed className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">
                  Occupied Rooms
                </span>
                <span className="text-[11px] text-slate-400">Current guest stays</span>
              </div>
            </div>
            <span className="text-xl font-bold text-indigo-400">
              {stats?.rooms?.occupied ?? 0}
            </span>
          </div>

          {/* Cleaning Status */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">
                  Rooms in Cleaning
                </span>
                <span className="text-[11px] text-slate-400">Housekeeping queue</span>
              </div>
            </div>
            <span className="text-xl font-bold text-amber-400">
              {stats?.rooms?.cleaning ?? 0}
            </span>
          </div>

          {/* Maintenance Status */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">
                  In Maintenance
                </span>
                <span className="text-[11px] text-slate-400">Service required</span>
              </div>
            </div>
            <span className="text-xl font-bold text-rose-400">
              {stats?.rooms?.maintenance ?? 0}
            </span>
          </div>

          {/* Assigned Staff */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">
                  Hotel Staff
                </span>
                <span className="text-[11px] text-slate-400">
                  {stats?.staff?.receptionistCount ?? 0} Desk • {stats?.staff?.staffCount ?? 0} Staff
                </span>
              </div>
            </div>
            <span className="text-xl font-bold text-emerald-400">
              {stats?.staff?.total ?? 0}
            </span>
          </div>
        </div>

        {/* Daily Schedule & Financial Summary Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Today's Check-ins */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">
                Today&apos;s Check-ins
              </span>
              <span className="text-2xl font-black text-white">
                {stats?.bookings?.todayCheckIns ?? 0}
              </span>
              <span className="text-[10px] text-slate-500 block">Scheduled arrivals</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
              <DoorOpen className="w-5 h-5" />
            </div>
          </div>

          {/* Today's Check-outs */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
                Today&apos;s Check-outs
              </span>
              <span className="text-2xl font-black text-white">
                {stats?.bookings?.todayCheckOuts ?? 0}
              </span>
              <span className="text-[10px] text-slate-500 block">Expected departures</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
              <DoorClosed className="w-5 h-5" />
            </div>
          </div>

          {/* Today's Revenue */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                Total Revenue
              </span>
              <span className="text-2xl font-black text-emerald-400">
                ₹{(stats?.financials?.totalRevenue ?? 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block">Invoices collected</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* Outstanding Due */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">
                Outstanding Due
              </span>
              <span className="text-2xl font-black text-rose-400">
                ₹{(stats?.financials?.outstandingDue ?? 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block">Unsettled invoices</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 font-bold">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. QUICK ACTIONS SECTION */}
      <ManagerQuickActions />

      {/* 4. SECURITY & TENANT ISOLATION NOTICE */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Tenant Isolation Enforced
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Your account is cryptographically bound to{" "}
              <strong className="text-amber-300 font-semibold">
                {hotel?.name || user?.hotelName || "Grand Royale Hotel"}
              </strong>
              . All room inventory and database transactions are automatically scoped to this hotel.
            </p>
          </div>
        </div>

        <Link
          href="/manager/settings"
          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition flex items-center gap-1.5 self-start sm:self-auto flex-shrink-0"
        >
          <span>Security &amp; Permissions</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </Link>
      </div>
    </main>
  );
}
