"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  BedDouble,
  DoorOpen,
  DoorClosed,
  Sparkles,
  Users,
  RefreshCw,
  ArrowRight,
  Receipt,
  UserCheck,
  Building2,
  AlertTriangle,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  MapPin,
  Plus,
  ShieldCheck,
  UtensilsCrossed,
  Wrench,
  ChevronRight,
  Eye,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

interface HotelData {
  _id: string;
  hotelCode: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  status: string;
  isInactive: boolean;
}

interface SubscriptionData {
  status: string;
  planName: string;
  maxRooms: number;
}

interface StatsData {
  todayBookings: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  activeBookings: number;
  availableRooms: number;
  occupiedRooms: number;
  cleaningRooms: number;
  pendingPaymentsCount: number;
  pendingPaymentsTotal: number;
  todayRevenue?: number;
  totalInvoices?: number;
  paidInvoices?: number;
}

interface RoomStatusData {
  AVAILABLE: number;
  OCCUPIED: number;
  RESERVED: number;
  CLEANING: number;
  MAINTENANCE: number;
  OUT_OF_SERVICE: number;
  totalActiveRooms: number;
}

interface BookingRecord {
  _id: string;
  bookingId: string;
  customerId?: {
    _id: string;
    name: string;
    phone?: string;
    email?: string;
    idType?: string;
    idNumber?: string;
  };
  roomId?: {
    _id: string;
    roomNumber: string;
    roomType: string;
    floor?: string;
  };
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  adults?: number;
  children?: number;
  status: string;
  bookingSource?: string;
  totalAmount: number;
  invoice?: {
    totalAmount: number;
    amountPaid: number;
    amountDue: number;
    paymentStatus: string;
  };
}

interface PendingPaymentRecord {
  _id: string;
  invoiceId: string;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  paymentStatus: string;
  customerId?: {
    _id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  roomId?: {
    _id: string;
    roomNumber: string;
    roomType: string;
  };
  bookingId?: {
    _id: string;
    bookingId: string;
    status: string;
  };
}

interface HousekeepingPreviewItem {
  _id: string;
  taskId: string;
  type: string;
  priority: string;
  status: string;
  roomId?: {
    roomNumber: string;
    roomType: string;
  };
}

interface RoomServicePreviewItem {
  _id: string;
  requestId: string;
  priority: string;
  status: string;
  items: Array<{ item: string; quantity: number }>;
  roomId?: {
    roomNumber: string;
    roomType: string;
  };
}

interface DashboardApiResponse {
  success: boolean;
  hotel: HotelData;
  subscription: SubscriptionData;
  stats: StatsData;
  roomStatus: RoomStatusData;
  todayCheckIns: BookingRecord[];
  todayCheckOuts: BookingRecord[];
  pendingPayments: PendingPaymentRecord[];
  recentBookings: BookingRecord[];
  upcomingCheckIns: BookingRecord[];
  upcomingCheckOuts: BookingRecord[];
  housekeepingPreview: HousekeepingPreviewItem[];
  roomServicePreview: RoomServicePreviewItem[];
}

export default function ReceptionistDashboardPage() {
  const { user, token } = useUser();
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"checkins" | "checkouts" | "pending" | "recent">("checkins");

  // Dynamic greeting based on receptionist's local time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  const fetchDashboardData = useCallback(async (isManualRefresh = false) => {
    if (!token) return;
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/receptionist/dashboard", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Unable to load dashboard data.");
      }

      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        throw new Error(json.error || "Failed to retrieve dashboard records.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while loading dashboard.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Client-side quick filter across today's check-ins, check-outs, and pending payments
  const filteredCheckIns = useMemo(() => {
    if (!data?.todayCheckIns) return [];
    if (!searchQuery.trim()) return data.todayCheckIns;
    const q = searchQuery.toLowerCase();
    return data.todayCheckIns.filter(
      (b) =>
        b.bookingId?.toLowerCase().includes(q) ||
        b.customerId?.name?.toLowerCase().includes(q) ||
        b.customerId?.phone?.toLowerCase().includes(q) ||
        b.roomId?.roomNumber?.toLowerCase().includes(q)
    );
  }, [data?.todayCheckIns, searchQuery]);

  const filteredCheckOuts = useMemo(() => {
    if (!data?.todayCheckOuts) return [];
    if (!searchQuery.trim()) return data.todayCheckOuts;
    const q = searchQuery.toLowerCase();
    return data.todayCheckOuts.filter(
      (b) =>
        b.bookingId?.toLowerCase().includes(q) ||
        b.customerId?.name?.toLowerCase().includes(q) ||
        b.roomId?.roomNumber?.toLowerCase().includes(q)
    );
  }, [data?.todayCheckOuts, searchQuery]);

  const filteredPendingPayments = useMemo(() => {
    if (!data?.pendingPayments) return [];
    if (!searchQuery.trim()) return data.pendingPayments;
    const q = searchQuery.toLowerCase();
    return data.pendingPayments.filter(
      (p) =>
        p.invoiceId?.toLowerCase().includes(q) ||
        p.bookingId?.bookingId?.toLowerCase().includes(q) ||
        p.customerId?.name?.toLowerCase().includes(q) ||
        p.roomId?.roomNumber?.toLowerCase().includes(q)
    );
  }, [data?.pendingPayments, searchQuery]);

  const filteredRecentBookings = useMemo(() => {
    if (!data?.recentBookings) return [];
    if (!searchQuery.trim()) return data.recentBookings;
    const q = searchQuery.toLowerCase();
    return data.recentBookings.filter(
      (b) =>
        b.bookingId?.toLowerCase().includes(q) ||
        b.customerId?.name?.toLowerCase().includes(q) ||
        b.roomId?.roomNumber?.toLowerCase().includes(q)
    );
  }, [data?.recentBookings, searchQuery]);

  // Helper for status badge styling
  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "CONFIRMED":
        return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
      case "CHECKED_IN":
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
      case "COMPLETED":
        return "bg-slate-500/15 text-slate-300 border-slate-500/30";
      case "CANCELLED":
        return "bg-rose-500/15 text-rose-300 border-rose-500/30";
      case "PAID":
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
      case "PARTIALLY_PAID":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      case "UNPAID":
        return "bg-rose-500/15 text-rose-300 border-rose-500/30";
      default:
        return "bg-slate-700 text-slate-300 border-slate-600";
    }
  };

  const isHotelInactive = data?.hotel?.isInactive || false;

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header & Welcome Area */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Role: RECEPTIONIST
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {formattedDate}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {greeting}, {user?.name || "Front Desk Receptionist"}
            </h1>

            <p className="text-slate-400 text-sm max-w-2xl">
              Property Front Desk Operations &bull; Live check-ins, guest stays, room availability, and balance settlements.
            </p>
          </div>

          {/* Hotel & Subscription Property Summary Card */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0">
              <Building2 className="w-6 h-6" />
            </div>

            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white truncate">
                  {data?.hotel?.name || "Loading Property..."}
                </span>
                {data?.subscription && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 uppercase">
                    {data.subscription.status}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-0.5">
                {data?.hotel?.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-500" />
                    {data.hotel.phone}
                  </span>
                )}
                {data?.hotel?.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    {data.hotel.city}{data.hotel.country ? `, ${data.hotel.country}` : ""}
                  </span>
                )}
              </div>
            </div>

            {/* Refresh Action */}
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={loading || isRefreshing}
              className="mt-2 sm:mt-0 sm:ml-auto p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center justify-center gap-2 text-xs font-semibold"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
              <span className="sm:hidden">Refresh Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Hotel Inactive Alert Banner (if applicable) */}
      {isHotelInactive && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-300">
              Hotel Property Inactive / Suspended
            </h4>
            <p className="text-xs text-amber-200/80 mt-0.5">
              This hotel property is currently marked inactive or suspended. New bookings and guest modifications are restricted until reactivated by your manager or system administrator.
            </p>
          </div>
        </div>
      )}

      {/* 3. Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-rose-300">Unable to load dashboard data</p>
              <p className="text-xs text-rose-400/80">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchDashboardData(false)}
            className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4. Quick Statistics 7-Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
        {/* Card 1: Today's Bookings */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between hover:border-cyan-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Today&apos;s Bookings</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-7 w-12 bg-slate-800 animate-pulse rounded my-2" />
          ) : (
            <p className="text-2xl font-extrabold text-white mt-2">
              {data?.stats?.todayBookings ?? 0}
            </p>
          )}
          <span className="text-[10px] text-cyan-400 font-medium">New today</span>
        </div>

        {/* Card 2: Today's Check-ins */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between hover:border-indigo-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Today&apos;s Check-ins</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-7 w-12 bg-slate-800 animate-pulse rounded my-2" />
          ) : (
            <p className="text-2xl font-extrabold text-white mt-2">
              {data?.stats?.todayCheckIns ?? 0}
            </p>
          )}
          <span className="text-[10px] text-indigo-400 font-medium">Arrivals scheduled</span>
        </div>

        {/* Card 3: Today's Check-outs */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between hover:border-amber-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Today&apos;s Check-outs</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <DoorClosed className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-7 w-12 bg-slate-800 animate-pulse rounded my-2" />
          ) : (
            <p className="text-2xl font-extrabold text-white mt-2">
              {data?.stats?.todayCheckOuts ?? 0}
            </p>
          )}
          <span className="text-[10px] text-amber-400 font-medium">Departures due</span>
        </div>

        {/* Card 4: Available Rooms */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between hover:border-emerald-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Available Rooms</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DoorOpen className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-7 w-12 bg-slate-800 animate-pulse rounded my-2" />
          ) : (
            <p className="text-2xl font-extrabold text-emerald-400 mt-2">
              {data?.stats?.availableRooms ?? 0}
            </p>
          )}
          <span className="text-[10px] text-emerald-400/80 font-medium">Ready for guests</span>
        </div>

        {/* Card 5: Occupied Rooms */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between hover:border-blue-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Occupied Rooms</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <BedDouble className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-7 w-12 bg-slate-800 animate-pulse rounded my-2" />
          ) : (
            <p className="text-2xl font-extrabold text-blue-400 mt-2">
              {data?.stats?.occupiedRooms ?? 0}
            </p>
          )}
          <span className="text-[10px] text-blue-400/80 font-medium">In-house guests</span>
        </div>

        {/* Card 6: Under Cleaning */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between hover:border-purple-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Under Cleaning</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-7 w-12 bg-slate-800 animate-pulse rounded my-2" />
          ) : (
            <p className="text-2xl font-extrabold text-purple-300 mt-2">
              {data?.stats?.cleaningRooms ?? 0}
            </p>
          )}
          <span className="text-[10px] text-purple-400 font-medium">Housekeeping</span>
        </div>

        {/* Card 7: Pending Payments */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between hover:border-rose-500/30 transition sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Pending Payments</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-7 w-12 bg-slate-800 animate-pulse rounded my-2" />
          ) : (
            <div className="mt-2">
              <p className="text-2xl font-extrabold text-rose-400">
                {data?.stats?.pendingPaymentsCount ?? 0}
              </p>
              <p className="text-[10px] text-rose-300/80 font-mono font-bold mt-0.5 truncate">
                ₹{data?.stats?.pendingPaymentsTotal?.toLocaleString() ?? 0} Due
              </p>
            </div>
          )}
          <span className="text-[10px] text-rose-400 font-medium">Unsettled folios</span>
        </div>
      </div>

      {/* 5. Room Availability Summary & Visual Status Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-cyan-400" />
              Room Inventory &amp; Status Distribution
            </h3>
            <p className="text-xs text-slate-400">
              Real-time room occupancy and readiness across {data?.roomStatus?.totalActiveRooms ?? 0} active rooms
            </p>
          </div>
          <Link
            href="/receptionist/rooms"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
          >
            <span>View All Rooms</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Visual Multi-Segment Bar */}
        {loading ? (
          <div className="h-4 w-full bg-slate-800 animate-pulse rounded-full" />
        ) : (
          <div className="w-full bg-slate-800/80 rounded-full h-4 overflow-hidden flex shadow-inner">
            {data?.roomStatus?.totalActiveRooms ? (
              <>
                <div
                  style={{
                    width: `${((data.roomStatus.AVAILABLE || 0) / data.roomStatus.totalActiveRooms) * 100}%`,
                  }}
                  className="bg-emerald-500 h-full transition-all duration-500"
                  title={`Available: ${data.roomStatus.AVAILABLE}`}
                />
                <div
                  style={{
                    width: `${((data.roomStatus.OCCUPIED || 0) / data.roomStatus.totalActiveRooms) * 100}%`,
                  }}
                  className="bg-blue-500 h-full transition-all duration-500"
                  title={`Occupied: ${data.roomStatus.OCCUPIED}`}
                />
                <div
                  style={{
                    width: `${((data.roomStatus.RESERVED || 0) / data.roomStatus.totalActiveRooms) * 100}%`,
                  }}
                  className="bg-indigo-500 h-full transition-all duration-500"
                  title={`Reserved: ${data.roomStatus.RESERVED}`}
                />
                <div
                  style={{
                    width: `${((data.roomStatus.CLEANING || 0) / data.roomStatus.totalActiveRooms) * 100}%`,
                  }}
                  className="bg-purple-500 h-full transition-all duration-500"
                  title={`Cleaning: ${data.roomStatus.CLEANING}`}
                />
                <div
                  style={{
                    width: `${((data.roomStatus.MAINTENANCE || 0) / data.roomStatus.totalActiveRooms) * 100}%`,
                  }}
                  className="bg-amber-500 h-full transition-all duration-500"
                  title={`Maintenance: ${data.roomStatus.MAINTENANCE}`}
                />
                <div
                  style={{
                    width: `${((data.roomStatus.OUT_OF_SERVICE || 0) / data.roomStatus.totalActiveRooms) * 100}%`,
                  }}
                  className="bg-rose-500 h-full transition-all duration-500"
                  title={`Out of Service: ${data.roomStatus.OUT_OF_SERVICE}`}
                />
              </>
            ) : (
              <div className="w-full bg-slate-800 text-center text-[10px] text-slate-500 flex items-center justify-center">
                No active rooms configured
              </div>
            )}
          </div>
        )}

        {/* Room Status Count Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Available
            </span>
            <p className="text-lg font-bold text-white mt-1">{data?.roomStatus?.AVAILABLE ?? 0}</p>
          </div>

          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
            <span className="text-[11px] font-semibold text-blue-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              Occupied
            </span>
            <p className="text-lg font-bold text-white mt-1">{data?.roomStatus?.OCCUPIED ?? 0}</p>
          </div>

          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
            <span className="text-[11px] font-semibold text-indigo-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              Reserved
            </span>
            <p className="text-lg font-bold text-white mt-1">{data?.roomStatus?.RESERVED ?? 0}</p>
          </div>

          <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20">
            <span className="text-[11px] font-semibold text-purple-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              Cleaning
            </span>
            <p className="text-lg font-bold text-white mt-1">{data?.roomStatus?.CLEANING ?? 0}</p>
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Maintenance
            </span>
            <p className="text-lg font-bold text-white mt-1">{data?.roomStatus?.MAINTENANCE ?? 0}</p>
          </div>

          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
            <span className="text-[11px] font-semibold text-rose-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              Out of Service
            </span>
            <p className="text-lg font-bold text-white mt-1">{data?.roomStatus?.OUT_OF_SERVICE ?? 0}</p>
          </div>
        </div>
      </div>

      {/* 6. Front Desk Quick Action Buttons */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-white tracking-tight">Front Desk Operations</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link
            href={isHotelInactive ? "#" : "/receptionist/bookings/new"}
            className={`p-4 rounded-2xl border transition group flex flex-col justify-between ${
              isHotelInactive
                ? "bg-slate-900/40 border-slate-800 opacity-60 cursor-not-allowed"
                : "bg-gradient-to-br from-cyan-500/20 via-slate-900 to-slate-900 border-cyan-500/30 hover:border-cyan-400 shadow-md"
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-cyan-500 text-slate-950 flex items-center justify-center font-bold mb-2">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition">New Booking</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Reserve room</p>
            </div>
          </Link>

          <Link
            href={isHotelInactive ? "#" : "/receptionist/check-in"}
            className={`p-4 rounded-2xl border transition group flex flex-col justify-between ${
              isHotelInactive
                ? "bg-slate-900/40 border-slate-800 opacity-60 cursor-not-allowed"
                : "bg-slate-900/70 border-slate-800 hover:border-indigo-500/40"
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold mb-2">
              <DoorOpen className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition">Check-in</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Guest arrival</p>
            </div>
          </Link>

          <Link
            href={isHotelInactive ? "#" : "/receptionist/check-out"}
            className={`p-4 rounded-2xl border transition group flex flex-col justify-between ${
              isHotelInactive
                ? "bg-slate-900/40 border-slate-800 opacity-60 cursor-not-allowed"
                : "bg-slate-900/70 border-slate-800 hover:border-amber-500/40"
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold mb-2">
              <DoorClosed className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-amber-300 transition">Check-out</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Settle stay</p>
            </div>
          </Link>

          <Link
            href={isHotelInactive ? "#" : "/receptionist/customers"}
            className={`p-4 rounded-2xl border transition group flex flex-col justify-between ${
              isHotelInactive
                ? "bg-slate-900/40 border-slate-800 opacity-60 cursor-not-allowed"
                : "bg-slate-900/70 border-slate-800 hover:border-emerald-500/40"
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold mb-2">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition">Customers</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Guest profiles</p>
            </div>
          </Link>

          <Link
            href="/receptionist/bookings"
            className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/40 transition group flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold mb-2">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-blue-300 transition">All Bookings</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Lookup dates</p>
            </div>
          </Link>

          <Link
            href="/receptionist/billing"
            className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-purple-500/40 transition group flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold mb-2">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-purple-300 transition">Invoices</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Bills &amp; Folios</p>
            </div>
          </Link>
        </div>
      </div>

      {/* 7. Front Desk Operational Data Hub with Search & Tabs */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        {/* Hub Header, Tabs & Interactive Search */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800 pb-5">
          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab("checkins")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "checkins"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "bg-slate-800/70 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Today&apos;s Check-ins ({data?.todayCheckIns?.length ?? 0})</span>
            </button>

            <button
              onClick={() => setActiveTab("checkouts")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "checkouts"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "bg-slate-800/70 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <DoorClosed className="w-3.5 h-3.5" />
              <span>Today&apos;s Check-outs ({data?.todayCheckOuts?.length ?? 0})</span>
            </button>

            <button
              onClick={() => setActiveTab("pending")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "pending"
                  ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                  : "bg-slate-800/70 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Pending Payments ({data?.pendingPayments?.length ?? 0})</span>
            </button>

            <button
              onClick={() => setActiveTab("recent")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "recent"
                  ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-800/70 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Recent Bookings ({data?.recentBookings?.length ?? 0})</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search guest, room, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>
        </div>

        {/* Tab Content Display */}
        {/* TAB 1: Today's Check-ins */}
        {activeTab === "checkins" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Scheduled Arrivals for Today</h4>
                <p className="text-xs text-slate-400">Sorted by earliest check-in</p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-slate-800/50 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : filteredCheckIns.length === 0 ? (
              <div className="py-12 text-center rounded-2xl bg-slate-950/30 border border-slate-800/60">
                <UserCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">No check-ins scheduled for today.</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {searchQuery ? "No matching records found for your search query." : "All arriving guests for today are processed or none are scheduled."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Booking ID</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Room</th>
                      <th className="py-3 px-4">Guests</th>
                      <th className="py-3 px-4">Stay Dates</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredCheckIns.map((booking) => (
                      <tr key={booking._id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                          {booking.bookingId}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-white">{booking.customerId?.name || "Guest"}</p>
                          <p className="text-[10px] text-slate-400">{booking.customerId?.phone || "No phone"}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-200">
                            Room {booking.roomId?.roomNumber || "N/A"}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {booking.roomId?.roomType || "Standard"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {booking.numberOfGuests || 1} {booking.numberOfGuests === 1 ? "Guest" : "Guests"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                          {new Date(booking.checkInDate).toLocaleDateString()} &rarr; {new Date(booking.checkOutDate).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(booking.status)}`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href="/receptionist/check-in"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 font-bold text-xs transition"
                          >
                            <span>Process</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Today's Check-outs */}
        {activeTab === "checkouts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Scheduled Departures for Today</h4>
                <p className="text-xs text-slate-400">Review outstanding folios and settle accounts</p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-slate-800/50 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : filteredCheckOuts.length === 0 ? (
              <div className="py-12 text-center rounded-2xl bg-slate-950/30 border border-slate-800/60">
                <DoorClosed className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">No check-outs scheduled for today.</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {searchQuery ? "No matching records found for your search query." : "No guest departures due today."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Booking ID</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Room</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Balance Due</th>
                      <th className="py-3 px-4">Payment Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredCheckOuts.map((booking) => {
                      const amountDue = booking.invoice?.amountDue ?? booking.totalAmount;
                      const hasOutstanding = amountDue > 0;

                      return (
                        <tr key={booking._id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                            {booking.bookingId}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-white">{booking.customerId?.name || "Guest"}</p>
                            <p className="text-[10px] text-slate-400">{booking.customerId?.phone || ""}</p>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-200">
                            Room {booking.roomId?.roomNumber || "N/A"}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            ₹{booking.totalAmount?.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <span
                              className={`font-bold ${
                                hasOutstanding ? "text-rose-400" : "text-emerald-400"
                              }`}
                            >
                              ₹{amountDue?.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                                booking.invoice?.paymentStatus || "UNPAID"
                              )}`}
                            >
                              {booking.invoice?.paymentStatus || "UNPAID"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Link
                              href="/receptionist/check-out"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-xs transition"
                            >
                              <span>Check-out</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Pending Payments */}
        {activeTab === "pending" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Unsettled Guest Invoices</h4>
                <p className="text-xs text-slate-400">Sorted by highest outstanding balance</p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-slate-800/50 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : filteredPendingPayments.length === 0 ? (
              <div className="py-12 text-center rounded-2xl bg-slate-950/30 border border-slate-800/60">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">All guest folios are fully settled!</p>
                <p className="text-xs text-slate-500 mt-0.5">No outstanding receivables found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Invoice ID</th>
                      <th className="py-3 px-4">Booking ID</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Room</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Paid</th>
                      <th className="py-3 px-4">Amount Due</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredPendingPayments.map((inv) => (
                      <tr key={inv._id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-300">
                          {inv.invoiceId}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-cyan-400">
                          {inv.bookingId?.bookingId || "N/A"}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-white">{inv.customerId?.name || "Guest"}</p>
                          <p className="text-[10px] text-slate-400">{inv.customerId?.phone || ""}</p>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-200">
                          Room {inv.roomId?.roomNumber || "N/A"}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          ₹{inv.totalAmount?.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-emerald-400">
                          ₹{inv.amountPaid?.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-rose-400">
                          ₹{inv.amountDue?.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href="/receptionist/billing"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white font-bold text-xs transition"
                          >
                            <span>Collect</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Recent Bookings */}
        {activeTab === "recent" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Latest Property Bookings</h4>
                <p className="text-xs text-slate-400">Most recently reserved stays</p>
              </div>
              <Link
                href="/receptionist/bookings"
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
              >
                View Full Ledger &rarr;
              </Link>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-slate-800/50 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : filteredRecentBookings.length === 0 ? (
              <div className="py-12 text-center rounded-2xl bg-slate-950/30 border border-slate-800/60">
                <CalendarCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">No bookings recorded yet.</p>
                <p className="text-xs text-slate-500 mt-0.5">Use New Booking to create your first reservation.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Booking ID</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Room</th>
                      <th className="py-3 px-4">Check-in</th>
                      <th className="py-3 px-4">Check-out</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredRecentBookings.map((b) => (
                      <tr key={b._id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                          {b.bookingId}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-white">{b.customerId?.name || "Guest"}</p>
                          <p className="text-[10px] text-slate-400">{b.customerId?.phone || ""}</p>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-200">
                          Room {b.roomId?.roomNumber || "N/A"}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {new Date(b.checkInDate).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {new Date(b.checkOutDate).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                          ₹{b.totalAmount?.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                              b.status
                            )}`}
                          >
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 8. Upcoming Stays & Operational Feeds (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Check-ins & Check-outs */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              Upcoming Arrivals &amp; Departures
            </h3>
            <span className="text-xs text-slate-500 font-medium">Next 5 Stays</span>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 bg-slate-800/40 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : !data?.upcomingCheckIns?.length && !data?.upcomingCheckOuts?.length ? (
              <div className="py-8 text-center rounded-2xl bg-slate-950/20 border border-slate-800/40">
                <Clock className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-slate-400">No upcoming arrivals or departures on file.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data?.upcomingCheckIns?.map((b) => (
                  <div
                    key={b._id}
                    className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          {b.customerId?.name || "Guest"} &bull; Room {b.roomId?.roomNumber || "N/A"}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Arrival: {new Date(b.checkInDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                      Upcoming Arrival
                    </span>
                  </div>
                ))}

                {data?.upcomingCheckOuts?.map((b) => (
                  <div
                    key={b._id}
                    className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <DoorClosed className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          {b.customerId?.name || "Guest"} &bull; Room {b.roomId?.roomNumber || "N/A"}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Departure: {new Date(b.checkOutDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                      In-House Stay
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Operational Previews: Housekeeping & Room Service */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Front Desk Operations Preview
            </h3>
            <span className="text-xs text-slate-500 font-medium">Housekeeping &amp; Service</span>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 bg-slate-800/40 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : !data?.housekeepingPreview?.length && !data?.roomServicePreview?.length ? (
              <div className="py-8 text-center rounded-2xl bg-slate-950/20 border border-slate-800/40">
                <Sparkles className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-slate-400">All housekeeping &amp; room service orders are clear!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data?.housekeepingPreview?.map((hk) => (
                  <div
                    key={hk._id}
                    className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          Room {hk.roomId?.roomNumber || "N/A"} &bull; {hk.type.replace("_", " ")}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Task ID: {hk.taskId}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300">
                      {hk.status}
                    </span>
                  </div>
                ))}

                {data?.roomServicePreview?.map((rs) => (
                  <div
                    key={rs._id}
                    className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <UtensilsCrossed className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          Room {rs.roomId?.roomNumber || "N/A"} &bull; {rs.items?.map((i) => i.item).join(", ") || "Service Order"}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Order: {rs.requestId}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                      {rs.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
