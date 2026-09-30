"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  UtensilsCrossed,
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Play,
  Check,
  RefreshCw,
  Layers,
  Building2,
  Shield,
  ArrowUpRight,
  ListTodo,
  Timer,
  LogIn,
  LogOut,
  Briefcase,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import StaffSidebar from "@/components/staff/StaffSidebar";
import StaffHeader from "@/components/staff/StaffHeader";

export default function StaffDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useUser();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/staff/dashboard");
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Unable to load dashboard.");
      }

      setData(result);
    } catch (err: any) {
      setError(err.message || "Unable to load dashboard. Please check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && !user.mustChangePassword) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  const handleStartTask = async (taskId: string) => {
    try {
      setActionLoading(taskId);
      const res = await fetch(`/api/housekeeping/${taskId}/start`, {
        method: "POST",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to start task.");
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      setActionLoading(taskId);
      const res = await fetch(`/api/housekeeping/${taskId}/complete`, {
        method: "POST",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to complete task.");
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleClockIn = async () => {
    try {
      setActionLoading("attendance-clock-in");
      const res = await fetch("/api/staff/attendance/check-in", {
        method: "POST",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Clock-in failed.");
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || "Clock-in failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleClockOut = async () => {
    try {
      setActionLoading("attendance-clock-out");
      const res = await fetch("/api/staff/attendance/check-out", {
        method: "POST",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Clock-out failed.");
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || "Clock-out failed.");
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p className="text-sm font-medium">Verifying Staff Credentials...</p>
      </div>
    );
  }

  const summary = data?.summary;
  const hotel = data?.hotel;
  const recentTasks = data?.recentTasks || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex selection:bg-emerald-500 selection:text-slate-950">
      <StaffSidebar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        <StaffHeader
          onMenuClick={() => setIsMobileOpen(true)}
          title="Staff Portal Dashboard"
          subtitle="Real-time operational workload and turnaround tasks"
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Dashboard Header / Welcome Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500/15 via-slate-900 to-slate-950 border border-emerald-500/20 p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-xs font-semibold">
                    <Shield className="w-3.5 h-3.5" />
                    <span>STAFF</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-medium">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{hotel?.name || "Assigned Property"}</span>
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {getGreeting()}, {user.name}
                </h1>
                <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
                  Welcome to your operational staff portal at{" "}
                  <strong className="text-slate-200">{hotel?.name || "GrandStay"}</strong>. Here is your current workload for today.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchDashboardData}
                  disabled={loading}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                  aria-label="Refresh Dashboard Data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Error Banner with Retry */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
              <button
                onClick={fetchDashboardData}
                className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold border border-rose-500/40 transition flex-shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* Today's Attendance & Shift Status Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Timer className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      TODAY&apos;S SHIFT &amp; ATTENDANCE
                    </h2>
                    <p className="text-xs text-slate-400">
                      Shift: <strong className="text-slate-200">{data?.todayAttendance?.shift || "09:00 AM - 06:00 PM (General Shift)"}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl px-3.5 py-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Status: </span>
                    {data?.todayAttendance?.status === "CHECKED_IN" ? (
                      <span className="font-bold text-emerald-300 ml-1 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Checked In
                      </span>
                    ) : data?.todayAttendance?.status === "CHECKED_OUT" ? (
                      <span className="font-bold text-cyan-300 ml-1">Checked Out</span>
                    ) : (
                      <span className="font-bold text-slate-400 ml-1">Not Started</span>
                    )}
                  </div>

                  {data?.todayAttendance?.checkIn && (
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl px-3.5 py-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Check In: </span>
                      <span className="font-mono font-bold text-white ml-1">
                        {new Date(data.todayAttendance.checkIn).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </div>
                  )}

                  {data?.todayAttendance?.checkOut && (
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl px-3.5 py-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Check Out: </span>
                      <span className="font-mono font-bold text-white ml-1">
                        {new Date(data.todayAttendance.checkOut).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </div>
                  )}

                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl px-3.5 py-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Working Time: </span>
                    <span className="font-mono font-bold text-emerald-400 ml-1">
                      {data?.todayAttendance?.workingDurationFormatted || "0m"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Attendance Clock In / Clock Out Quick Action */}
              <div className="flex items-center gap-3">
                {data?.todayAttendance?.status === "NOT_STARTED" && (
                  <button
                    onClick={handleClockIn}
                    disabled={actionLoading === "attendance-clock-in" || loading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
                  >
                    {actionLoading === "attendance-clock-in" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
                    <span>Clock In</span>
                  </button>
                )}

                {data?.todayAttendance?.status === "CHECKED_IN" && (
                  <button
                    onClick={handleClockOut}
                    disabled={actionLoading === "attendance-clock-out" || loading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition disabled:opacity-50"
                  >
                    {actionLoading === "attendance-clock-out" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                    <span>Clock Out</span>
                  </button>
                )}

                {data?.todayAttendance?.status === "CHECKED_OUT" && (
                  <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <CheckCircle2 className="w-4 h-4" /> Completed
                  </span>
                )}

                <Link
                  href="/staff/attendance"
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                >
                  <span>Attendance History</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Core Summary Cards (MY TASKS) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                MY TASKS SUMMARY
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Assigned */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Total Assigned</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white mt-2">
                  {loading ? "..." : summary?.totalAssigned ?? 0}
                </p>
                <span className="text-[11px] text-slate-400 mt-1 inline-block">Assigned duties</span>
              </div>

              {/* Pending */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Pending</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-amber-300 mt-2">
                  {loading ? "..." : summary?.pending ?? 0}
                </p>
                <span className="text-[11px] text-amber-400/80 mt-1 inline-block">Awaiting start</span>
              </div>

              {/* In Progress */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">In Progress</span>
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Play className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-cyan-300 mt-2">
                  {loading ? "..." : summary?.inProgress ?? 0}
                </p>
                <span className="text-[11px] text-cyan-400/80 mt-1 inline-block">Currently active</span>
              </div>

              {/* Completed Today */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Completed Today</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-emerald-300 mt-2">
                  {loading ? "..." : summary?.completed ?? 0}
                </p>
                <span className="text-[11px] text-emerald-400/80 mt-1 inline-block">Finished turns</span>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          {data?.stats && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  TASK BREAKDOWN BY CATEGORY
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Housekeeping */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-emerald-500/30 transition">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">Housekeeping</h3>
                      <p className="text-[11px] text-slate-400">{data.stats.housekeeping.total} total tasks</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl py-2">
                      <span className="text-lg font-bold text-amber-300 block">{data.stats.housekeeping.pending}</span>
                      <span className="text-[9px] text-slate-500 uppercase font-bold">Pending</span>
                    </div>
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl py-2">
                      <span className="text-lg font-bold text-cyan-300 block">{data.stats.housekeeping.inProgress}</span>
                      <span className="text-[9px] text-slate-500 uppercase font-bold">Active</span>
                    </div>
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl py-2">
                      <span className="text-lg font-bold text-emerald-300 block">{data.stats.housekeeping.completedToday}</span>
                      <span className="text-[9px] text-slate-500 uppercase font-bold">Today</span>
                    </div>
                  </div>
                </div>

                {/* Room Service */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-amber-500/30 transition">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <UtensilsCrossed className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">Room Service</h3>
                      <p className="text-[11px] text-slate-400">{data.stats.roomService.total} total tasks</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl py-2">
                      <span className="text-lg font-bold text-amber-300 block">{data.stats.roomService.pending}</span>
                      <span className="text-[9px] text-slate-500 uppercase font-bold">Pending</span>
                    </div>
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl py-2">
                      <span className="text-lg font-bold text-cyan-300 block">{data.stats.roomService.inProgress}</span>
                      <span className="text-[9px] text-slate-500 uppercase font-bold">Active</span>
                    </div>
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl py-2">
                      <span className="text-lg font-bold text-emerald-300 block">{data.stats.roomService.completedToday}</span>
                      <span className="text-[9px] text-slate-500 uppercase font-bold">Today</span>
                    </div>
                  </div>
                </div>

                {/* Maintenance */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-cyan-500/30 transition">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">Maintenance</h3>
                      <p className="text-[11px] text-slate-400">{data.stats.maintenance.total} total tasks</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl py-2">
                      <span className="text-lg font-bold text-amber-300 block">{data.stats.maintenance.pending}</span>
                      <span className="text-[9px] text-slate-500 uppercase font-bold">Pending</span>
                    </div>
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl py-2">
                      <span className="text-lg font-bold text-cyan-300 block">{data.stats.maintenance.inProgress}</span>
                      <span className="text-[9px] text-slate-500 uppercase font-bold">Active</span>
                    </div>
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl py-2">
                      <span className="text-lg font-bold text-emerald-300 block">{data.stats.maintenance.completedToday}</span>
                      <span className="text-[9px] text-slate-500 uppercase font-bold">Today</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Operational Shortcuts / Quick Actions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                OPERATIONAL SHORTCUTS
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* My Tasks Shortcut */}
              <Link
                href="/staff/tasks"
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-emerald-500/40 hover:bg-slate-900/90 transition flex flex-col justify-between group"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-105 transition">
                    <ListTodo className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-white">My Tasks</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    View and manage all assigned operational duties.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between text-emerald-400 text-xs font-semibold pt-3 border-t border-slate-800/80">
                  <span>Open Tasks</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                </div>
              </Link>

              {/* Housekeeping Shortcut */}
              <Link
                href="/staff/housekeeping"
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-emerald-500/40 hover:bg-slate-900/90 transition flex flex-col justify-between group"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-105 transition">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-white">Housekeeping</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Room cleaning, inspections, and turnarounds.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between text-emerald-400 text-xs font-semibold pt-3 border-t border-slate-800/80">
                  <span>Open Cleaning</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                </div>
              </Link>

              {/* Room Service Shortcut */}
              <Link
                href="/staff/room-service"
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-amber-500/40 hover:bg-slate-900/90 transition flex flex-col justify-between group"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-105 transition">
                    <UtensilsCrossed className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-white">Room Service</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Deliver amenities and refreshments to rooms.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between text-amber-400 text-xs font-semibold pt-3 border-t border-slate-800/80">
                  <span>Open Service</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                </div>
              </Link>

              {/* Attendance Shortcut */}
              <Link
                href="/staff/attendance"
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-cyan-500/40 hover:bg-slate-900/90 transition flex flex-col justify-between group"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-105 transition">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-white">Attendance</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Clock in/out, view daily hours &amp; history.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between text-cyan-400 text-xs font-semibold pt-3 border-t border-slate-800/80">
                  <span>Open Attendance</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                </div>
              </Link>
            </div>
          </div>

          {/* Today's Tasks Feed */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white">Today&apos;s Assigned Work</h2>
                <p className="text-xs text-slate-400">Immediate duties and priorities for your shift</p>
              </div>
              <Link
                href="/staff/tasks"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
              >
                <span>All Tasks</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mb-2" />
                <span className="text-xs font-medium">Loading assigned tasks...</span>
              </div>
            ) : recentTasks.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 text-emerald-400/40 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">No tasks assigned yet.</p>
                <p className="text-xs text-slate-500 mt-1">You are all caught up for the moment.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((t: any) => (
                  <div
                    key={t._id}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm">
                        {t.roomNumber}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white">
                            {t.taskId}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {t.type?.replace("_", " ")}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              t.priority === "URGENT"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : t.priority === "HIGH"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-slate-800 text-slate-300 border border-slate-700"
                            }`}
                          >
                            {t.priority}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Room {t.roomNumber} • {t.roomType} • Status:{" "}
                          <strong className="text-slate-200">{t.status}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {t.status === "PENDING" || t.status === "ASSIGNED" ? (
                        <button
                          onClick={() => handleStartTask(t.taskId || t._id)}
                          disabled={actionLoading === (t.taskId || t._id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition disabled:opacity-50"
                        >
                          {actionLoading === (t.taskId || t._id) ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                          <span>Start</span>
                        </button>
                      ) : t.status === "IN_PROGRESS" ? (
                        <button
                          onClick={() => handleCompleteTask(t.taskId || t._id)}
                          disabled={actionLoading === (t.taskId || t._id)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-sm transition disabled:opacity-50"
                        >
                          {actionLoading === (t.taskId || t._id) ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Mark Ready</span>
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Ready
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
