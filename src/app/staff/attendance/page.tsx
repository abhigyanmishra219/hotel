"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Timer,
  LogIn,
  LogOut,
  RefreshCw,
  Shield,
  Building2,
  Filter,
  Check,
  Briefcase,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import StaffSidebar from "@/components/staff/StaffSidebar";
import StaffHeader from "@/components/staff/StaffHeader";

interface AttendanceToday {
  status: "NOT_STARTED" | "CHECKED_IN" | "ON_BREAK" | "CHECKED_OUT";
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workingMinutes: number;
  workingDurationFormatted: string;
  shift: string;
}

interface AttendanceRecord {
  _id: string;
  date: string;
  status: "CHECKED_IN" | "ON_BREAK" | "CHECKED_OUT";
  checkIn: string;
  checkOut?: string;
  workingMinutes: number;
  workingDurationFormatted: string;
  notes?: string;
  createdAt: string;
}

export default function StaffAttendancePage() {
  const { user, isLoading: authLoading } = useUser();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Attendance State
  const [todayData, setTodayData] = useState<AttendanceToday | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Filters & Pagination
  const [dateFilter, setDateFilter] = useState("ALL_TIME");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Live timer for currently checked-in staff
  const [liveDurationMinutes, setLiveDurationMinutes] = useState<number>(0);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        date: dateFilter,
        status: statusFilter,
        page: page.toString(),
        limit: "15",
      });

      const res = await fetch(`/api/staff/attendance?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to load attendance records.");
      }

      setTodayData(data.today);
      setHistory(data.history || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalCount(data.pagination?.total || 0);

      if (data.today?.status === "CHECKED_IN" && data.today?.checkIn) {
        const mins = Math.max(
          0,
          Math.round(
            (Date.now() - new Date(data.today.checkIn).getTime()) / (60 * 1000)
          )
        );
        setLiveDurationMinutes(mins);
      } else {
        setLiveDurationMinutes(data.today?.workingMinutes || 0);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch attendance data.");
    } finally {
      setLoading(false);
    }
  }, [dateFilter, statusFilter, page]);

  useEffect(() => {
    if (user && !user.mustChangePassword) {
      fetchAttendance();
    }
  }, [user, fetchAttendance]);

  // Live timer update every 30 seconds when checked in
  useEffect(() => {
    if (todayData?.status !== "CHECKED_IN" || !todayData?.checkIn) return;

    const interval = setInterval(() => {
      const mins = Math.max(
        0,
        Math.round(
          (Date.now() - new Date(todayData.checkIn!).getTime()) / (60 * 1000)
        )
      );
      setLiveDurationMinutes(mins);
    }, 30000);

    return () => clearInterval(interval);
  }, [todayData]);

  // Clock In handler
  const handleClockIn = async () => {
    try {
      setActionLoading(true);
      setError(null);
      setActionSuccessMsg(null);

      const res = await fetch("/api/staff/attendance/check-in", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Clock-in failed.");
      }

      setActionSuccessMsg("Clocked in successfully! Have a productive shift.");
      await fetchAttendance();
    } catch (err: any) {
      setError(err.message || "Unable to clock in. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  // Clock Out handler
  const handleClockOut = async () => {
    try {
      setActionLoading(true);
      setError(null);
      setActionSuccessMsg(null);

      const res = await fetch("/api/staff/attendance/check-out", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Clock-out failed.");
      }

      setActionSuccessMsg("Clocked out successfully! Great job today.");
      await fetchAttendance();
    } catch (err: any) {
      setError(err.message || "Unable to clock out. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const formatMinutes = (mins: number) => {
    if (mins <= 0) return "0m";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "—";
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p className="text-sm font-medium">Verifying Staff Session...</p>
      </div>
    );
  }

  const status = todayData?.status || "NOT_STARTED";
  const assignedShift = todayData?.shift || "09:00 AM - 06:00 PM (General Shift)";

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
          title="Attendance & Daily Work"
          subtitle="Daily shift tracking, clock-in records, and working history"
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500/15 via-slate-900 to-slate-950 border border-emerald-500/20 p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-xs font-semibold">
                    <Shield className="w-3.5 h-3.5" />
                    <span>DAILY ATTENDANCE</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-medium">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>{assignedShift}</span>
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Staff Attendance & Shift Status
                </h1>
                <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
                  Track your daily presence, clock-in on arrival, and view your logged working hours.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchAttendance}
                  disabled={loading}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                  aria-label="Refresh attendance"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Feedback Messages */}
          {actionSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{actionSuccessMsg}</span>
              </div>
              <button
                onClick={() => setActionSuccessMsg(null)}
                className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold"
              >
                Dismiss
              </button>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-rose-400 hover:text-rose-300 text-xs font-semibold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Today's Working Status Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Timer className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Today&apos;s Status</h2>
                    <p className="text-xs text-slate-400">
                      {new Date().toLocaleDateString("en-US", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                  {/* Status Badge */}
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Current State
                    </span>
                    <div className="mt-1 flex items-center gap-1.5">
                      {status === "CHECKED_IN" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Checked In
                        </span>
                      ) : status === "CHECKED_OUT" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Checked Out
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700">
                          Not Started
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Check-in Time */}
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Check In
                    </span>
                    <p className="mt-1 font-mono text-sm font-bold text-white">
                      {formatTime(todayData?.checkIn)}
                    </p>
                  </div>

                  {/* Check-out Time */}
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Check Out
                    </span>
                    <p className="mt-1 font-mono text-sm font-bold text-white">
                      {formatTime(todayData?.checkOut)}
                    </p>
                  </div>

                  {/* Working Duration */}
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Working Time
                    </span>
                    <p className="mt-1 font-mono text-sm font-bold text-emerald-400">
                      {formatMinutes(liveDurationMinutes)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row lg:flex-col justify-center items-stretch gap-3 min-w-[200px]">
                {status === "NOT_STARTED" && (
                  <button
                    onClick={handleClockIn}
                    disabled={actionLoading || loading}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
                    <span>Clock In</span>
                  </button>
                )}

                {status === "CHECKED_IN" && (
                  <button
                    onClick={handleClockOut}
                    disabled={actionLoading || loading}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm shadow-md shadow-rose-500/20 transition disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                    <span>Clock Out</span>
                  </button>
                )}

                {status === "CHECKED_OUT" && (
                  <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-emerald-400 text-xs font-semibold text-center">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>Attendance completed for today.</span>
                  </div>
                )}

                <div className="text-[11px] text-slate-500 text-center">
                  Server-synchronized timestamp
                </div>
              </div>
            </div>
          </div>

          {/* Attendance History Section */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-base font-bold text-white">Personal Attendance History</h2>
                <p className="text-xs text-slate-400">
                  Past working dates, check-in/out timestamps and total durations
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value);
                      setPage(1);
                    }}
                    className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL_TIME" className="bg-slate-900 text-white">All Time</option>
                    <option value="TODAY" className="bg-slate-900 text-white">Today</option>
                    <option value="LAST_7_DAYS" className="bg-slate-900 text-white">Last 7 Days</option>
                    <option value="THIS_MONTH" className="bg-slate-900 text-white">This Month</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL" className="bg-slate-900 text-white">All Statuses</option>
                    <option value="CHECKED_IN" className="bg-slate-900 text-white">Checked In</option>
                    <option value="CHECKED_OUT" className="bg-slate-900 text-white">Completed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* History Table */}
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mb-2" />
                <span className="text-xs font-medium">Loading attendance history...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Clock className="w-10 h-10 text-emerald-400/40 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">No attendance records found.</p>
                <p className="text-xs text-slate-500 mt-1">
                  {dateFilter !== "ALL_TIME" || statusFilter !== "ALL"
                    ? "Try adjusting your filter criteria."
                    : "Your attendance records will appear here as you clock in."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Check In</th>
                      <th className="py-3 px-4">Check Out</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {history.map((record) => (
                      <tr
                        key={record._id}
                        className="hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(record.date)}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {formatTime(record.checkIn)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {formatTime(record.checkOut)}
                        </td>
                        <td className="py-3.5 px-4">
                          {record.status === "CHECKED_IN" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Checked In
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Completed
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                          {record.workingDurationFormatted || formatMinutes(record.workingMinutes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Showing page <strong className="text-white">{page}</strong> of{" "}
                  <strong className="text-white">{totalPages}</strong> ({totalCount} total records)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
