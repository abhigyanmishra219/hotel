"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  User,
  Mail,
  Hotel,
  Users,
  BedDouble,
  CreditCard,
  Layers,
  Zap,
  DollarSign,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Plus,
  PlusCircle,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Building2,
  Calendar,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";

interface DashboardKPIs {
  totalHotels: number;
  activeHotels: number;
  suspendedHotels: number;
  inactiveHotels: number;
  totalUsers: number;
  totalRooms: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  trialSubscriptions: number;
  suspendedSubscriptions: number;
  monthlySubscriptionRevenue: number;
}

interface RecentHotel {
  _id: string;
  hotelCode: string;
  name: string;
  email: string;
  city?: string;
  state?: string;
  country?: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
  manager?: {
    name: string;
    email: string;
    phone?: string;
  } | null;
  subscription?: {
    _id: string;
    status: "ACTIVE" | "TRIAL" | "EXPIRED" | "SUSPENDED" | "CANCELLED";
    paymentStatus: "PAID" | "PENDING" | "FAILED";
    startDate?: string;
    endDate?: string;
    plan?: {
      _id: string;
      name: string;
      monthlyPrice: number;
      yearlyPrice: number;
    } | null;
  } | null;
}

interface PlanOverview {
  _id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  status: "ACTIVE" | "INACTIVE";
  maxRooms: number;
  maxStaff: number;
  maxReceptionists: number;
  features: string[];
  totalHotels: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  trialSubscriptions: number;
  suspendedSubscriptions: number;
  monthlyRevenue: number;
}

interface ActivityItem {
  id: string;
  type: "HOTEL_CREATED" | "SUBSCRIPTION_CHANGE" | "USER_REGISTERED";
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  link: string;
  badgeVariant: "amber" | "emerald" | "indigo" | "rose" | "cyan";
}

interface DashboardData {
  kpis: DashboardKPIs;
  recentHotels: RecentHotel[];
  subscriptionOverview: PlanOverview[];
  recentActivity: ActivityItem[];
  timestamp: string;
}

export default function AdminDashboardPage() {
  const { user, token } = useUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch("/api/admin/dashboard/stats", {
          headers,
          cache: "no-store",
        });

        if (!res.ok) {
          if (res.status === 403 || res.status === 401) {
            throw new Error("Access forbidden. System Administrator credentials required.");
          }
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned error (${res.status})`);
        }

        const resJson = await res.json();
        if (resJson.success) {
          setData(resJson);
        } else {
          throw new Error(resJson.error || "Failed to load dashboard data");
        }
      } catch (err: any) {
        console.error("Error loading dashboard stats:", err);
        setError(err.message || "Failed to connect to analytics server");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return "";
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. WELCOME & SYSTEM STATUS BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-indigo-950 border border-amber-500/20 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-medium mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Platform Role: {user?.role || "SYSTEM_ADMIN"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Executive System Admin Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Live multi-tenant statistics, hotel property analytics, and subscription lifecycle metrics retrieved directly from MongoDB.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchDashboardStats(true)}
              disabled={refreshing || loading}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-medium border border-slate-700 transition flex items-center gap-2 disabled:opacity-50"
              title="Refresh MongoDB statistics"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Refreshing..." : "Sync Stats"}</span>
            </button>
            <Link
              href="/admin/hotels/new"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Hotel</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Failed to retrieve real-time statistics</p>
              <p className="text-xs text-rose-400/90">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchDashboardStats(true)}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-medium transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. REAL KPI METRICS GRID */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <span>Platform Vital Metrics</span>
          </h2>
          {data?.timestamp && (
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              Live as of {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>

        {loading && !data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 animate-pulse space-y-3">
                <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                <div className="h-8 bg-slate-800 rounded w-3/4"></div>
                <div className="h-3 bg-slate-800 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Total Hotels */}
            <div className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 transition shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Hotels</span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                  <Hotel className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-white mt-2 tracking-tight">
                {data?.kpis.totalHotels ?? 0}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                <span className="text-emerald-400 font-medium">{data?.kpis.activeHotels ?? 0} active</span>
                <span>•</span>
                <span className="text-slate-500">{data?.kpis.suspendedHotels ?? 0} suspended</span>
              </div>
            </div>

            {/* KPI 2: Active Hotels */}
            <div className="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 transition shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Hotels</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-white mt-2 tracking-tight">
                {data?.kpis.activeHotels ?? 0}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>
                  {data?.kpis.totalHotels
                    ? Math.round(((data.kpis.activeHotels || 0) / data.kpis.totalHotels) * 100)
                    : 0}
                  % operational rate
                </span>
              </div>
            </div>

            {/* KPI 3: Suspended Hotels */}
            <div className="bg-slate-900/80 border border-slate-800 hover:border-rose-500/40 rounded-2xl p-5 transition shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Suspended Hotels</span>
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-white mt-2 tracking-tight">
                {data?.kpis.suspendedHotels ?? 0}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                {data?.kpis.suspendedHotels === 0
                  ? "All properties healthy"
                  : "Requires compliance review"}
              </p>
            </div>

            {/* KPI 4: Total Users */}
            <div className="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 transition shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Users</span>
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-white mt-2 tracking-tight">
                {data?.kpis.totalUsers ?? 0}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Managers, Receptionists, Staff & Admins
              </p>
            </div>

            {/* KPI 5: Active Subscriptions */}
            <div className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-5 transition shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Subscriptions</span>
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-white mt-2 tracking-tight">
                {data?.kpis.activeSubscriptions ?? 0}
              </p>
              <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
                <span className="text-cyan-400">{data?.kpis.trialSubscriptions ?? 0} in trial</span>
                <span>•</span>
                <span>{data?.kpis.suspendedSubscriptions ?? 0} suspended</span>
              </div>
            </div>

            {/* KPI 6: Expired Subscriptions */}
            <div className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 transition shadow-lg relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expired Subscriptions</span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-white mt-2 tracking-tight">
                {data?.kpis.expiredSubscriptions ?? 0}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                {data?.kpis.expiredSubscriptions === 0
                  ? "Zero expired subscriptions"
                  : "Pending renewal / reactivation"}
              </p>
            </div>

            {/* KPI 7: Monthly Subscription Revenue */}
            <div className="bg-gradient-to-br from-slate-900 to-amber-950/40 border border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-5 transition shadow-lg relative overflow-hidden group col-span-1 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Monthly Subscription Revenue
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">Calculated from all active tenant plans</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  {formatCurrency(data?.kpis.monthlySubscriptionRevenue ?? 0)}
                </p>
                <span className="text-xs font-semibold text-amber-400/90">/ month</span>
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center gap-3">
                <span className="text-emerald-400 font-medium">
                  Annual Run Rate: {formatCurrency((data?.kpis.monthlySubscriptionRevenue ?? 0) * 12)}
                </span>
                <span>•</span>
                <span>{data?.kpis.totalRooms ?? 0} rooms monitored</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. QUICK ACTIONS SECTION */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Quick Actions</h2>
              <p className="text-xs text-slate-400">High-priority operational pathways</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Action 1: Create Hotel */}
          <Link
            href="/admin/hotels/new"
            className="group flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-b from-amber-500/20 to-amber-500/10 hover:from-amber-500/30 hover:to-amber-500/20 border border-amber-500/40 text-center transition shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold mb-2.5 shadow-sm group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-xs font-bold text-amber-300 group-hover:text-amber-200">
              + Create Hotel
            </span>
            <span className="text-[10px] text-amber-400/80 mt-0.5">Onboard property</span>
          </Link>

          {/* Action 2: Manage Hotels */}
          <Link
            href="/admin/hotels"
            className="group flex flex-col items-center justify-center p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-center transition shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Hotel className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
              Manage Hotels
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">View all ({data?.kpis.totalHotels ?? 0})</span>
          </Link>

          {/* Action 3: Create Subscription Plan */}
          <Link
            href="/admin/subscriptions"
            className="group flex flex-col items-center justify-center p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-center transition shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
              Create / Edit Plan
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">Tiers & Quotas</span>
          </Link>

          {/* Action 4: Manage Subscriptions */}
          <Link
            href="/admin/subscriptions"
            className="group flex flex-col items-center justify-center p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-center transition shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
              Manage Subscriptions
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">Assignments & Status</span>
          </Link>
        </div>
      </div>

      {/* 4. MAIN TWO-COLUMN SECTION: HOTEL OVERVIEW & SUBSCRIPTION BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT 2 COLS: HOTEL OVERVIEW (RECENT HOTELS) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Hotel className="w-4 h-4 text-amber-400" />
                  <span>Hotel Properties Overview</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Recently registered hotel properties with assigned managers and active subscription plans
                </p>
              </div>
              <Link
                href="/admin/hotels"
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
              >
                <span>View all ({data?.kpis.totalHotels ?? 0})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading && !data ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-slate-800/50 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : !data?.recentHotels || data.recentHotels.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
                <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">No Hotels Found</p>
                <p className="text-xs text-slate-500 mt-1">Get started by creating your first hotel property</p>
                <Link
                  href="/admin/hotels/new"
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Hotel
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                      <th className="pb-3 font-semibold">Hotel Code</th>
                      <th className="pb-3 font-semibold">Hotel Name</th>
                      <th className="pb-3 font-semibold">Manager</th>
                      <th className="pb-3 font-semibold">Current Plan</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Created</th>
                      <th className="pb-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {data.recentHotels.map((hotel) => (
                      <tr key={hotel._id} className="hover:bg-slate-800/40 transition group">
                        <td className="py-3.5 font-mono text-amber-400 font-bold">
                          {hotel.hotelCode}
                        </td>
                        <td className="py-3.5">
                          <div className="font-semibold text-slate-200 group-hover:text-white transition">
                            {hotel.name}
                          </div>
                          {hotel.city && (
                            <span className="text-[10px] text-slate-500">{hotel.city}</span>
                          )}
                        </td>
                        <td className="py-3.5">
                          {hotel.manager ? (
                            <div>
                              <span className="text-slate-300 font-medium">{hotel.manager.name}</span>
                              <p className="text-[10px] text-slate-500 truncate max-w-[140px]">
                                {hotel.manager.email}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">No Manager</span>
                          )}
                        </td>
                        <td className="py-3.5">
                          {hotel.subscription?.plan ? (
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-semibold">
                                {hotel.subscription.plan.name}
                              </span>
                              {hotel.subscription.status !== "ACTIVE" && (
                                <span className="text-[10px] text-amber-400 font-mono">
                                  ({hotel.subscription.status})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[10px]">No Plan</span>
                          )}
                        </td>
                        <td className="py-3.5">
                          <AdminStatusBadge status={hotel.status} />
                        </td>
                        <td className="py-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                          {formatDate(hotel.createdAt)}
                        </td>
                        <td className="py-3.5 text-right">
                          <Link
                            href={`/admin/hotels/${hotel._id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700 transition"
                          >
                            <span>Manage</span>
                            <ArrowUpRight className="w-3 h-3 text-amber-400" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SUBSCRIPTION OVERVIEW BY PLAN */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Subscription Tier Distribution</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live breakdown of hotel subscriptions and recurring revenue generated per plan
                </p>
              </div>
              <Link
                href="/admin/subscriptions"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
              >
                <span>Manage Plans</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading && !data ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-28 bg-slate-800/50 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : !data?.subscriptionOverview || data.subscriptionOverview.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl">
                <CreditCard className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No subscription plans found</p>
                <Link
                  href="/admin/subscriptions"
                  className="mt-2 inline-block text-xs text-amber-400 font-semibold hover:underline"
                >
                  Create initial subscription plans
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.subscriptionOverview.map((plan) => (
                  <div
                    key={plan._id}
                    className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 hover:border-slate-600 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-white">{plan.name}</span>
                        <span className="text-xs font-mono text-amber-400 font-bold">
                          ${plan.monthlyPrice}/mo
                        </span>
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-400">
                        <div className="flex items-center justify-between">
                          <span>Total Hotels:</span>
                          <span className="font-semibold text-slate-200">{plan.totalHotels}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Active Subscriptions:</span>
                          <span className="font-semibold text-emerald-400">{plan.activeSubscriptions}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Expired:</span>
                          <span className="font-semibold text-rose-400">{plan.expiredSubscriptions}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Revenue</span>
                      <span className="text-xs font-bold text-amber-300">
                        {formatCurrency(plan.monthlyRevenue)}/mo
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT 1 COL: RECENT ACTIVITY TIMELINE */}
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <span>Recent Platform Activity</span>
              </h3>
            </div>

            {loading && !data ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-slate-800/50 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : !data?.recentActivity || data.recentActivity.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No recent activity logged yet.
              </div>
            ) : (
              <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {data.recentActivity.map((act) => (
                  <div key={act.id} className="relative group">
                    {/* Activity Dot */}
                    <div
                      className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-slate-900 ${
                        act.badgeVariant === "emerald"
                          ? "bg-emerald-400"
                          : act.badgeVariant === "rose"
                          ? "bg-rose-400"
                          : act.badgeVariant === "indigo"
                          ? "bg-indigo-400"
                          : "bg-amber-400"
                      }`}
                    ></div>

                    <div className="flex flex-col">
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={act.link}
                          className="text-xs font-semibold text-slate-200 group-hover:text-amber-400 transition hover:underline"
                        >
                          {act.title}
                        </Link>
                        <span className="text-[10px] text-slate-500 whitespace-nowrap">
                          {formatRelativeTime(act.timestamp as string)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        {act.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SYSTEM ROLES HIERARCHY REFERENCE */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-md">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Platform Architecture Roles
            </h4>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="font-bold text-amber-300">SYSTEM_ADMIN</span>
                <span className="text-[10px] text-amber-400/90 font-medium">Unrestricted Global</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/50">
                <span className="font-semibold text-slate-300">MANAGER</span>
                <span className="text-[10px] text-slate-500">Tenant Property Scope</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/50">
                <span className="font-semibold text-slate-300">RECEPTIONIST</span>
                <span className="text-[10px] text-slate-500">Front Desk & Bookings</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/50">
                <span className="font-semibold text-slate-300">STAFF</span>
                <span className="text-[10px] text-slate-500">Service & Housekeeping</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
