"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  UtensilsCrossed,
  Wrench,
  Layers,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
  Eye,
  RefreshCw,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import StaffSidebar from "@/components/staff/StaffSidebar";
import StaffHeader from "@/components/staff/StaffHeader";

// -- Calendar helpers (no external lib) --
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function toDateKey(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// -- Component --
export default function StaffCalendarPage() {
  const { user, isLoading: authLoading } = useUser();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/staff/tasks?limit=100");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load tasks.");
      setAllTasks(data.tasks || []);
    } catch (err: any) {
      setError(err.message || "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && !user.mustChangePassword) {
      fetchTasks();
    }
  }, [user, fetchTasks]);

  // Group tasks by date key
  const tasksByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    allTasks.forEach((t) => {
      const key = toDateKey(t.createdAt);
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [allTasks]);

  // Tasks for the selected date
  const selectedDateKey = toDateKey(selectedDate);
  const selectedTasks = tasksByDate[selectedDateKey] || [];

  // Calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const goToToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setSelectedDate(t);
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "HOUSEKEEPING": return <Sparkles className="w-3.5 h-3.5 text-emerald-400" />;
      case "ROOM_SERVICE": return <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />;
      case "MAINTENANCE": return <Wrench className="w-3.5 h-3.5 text-cyan-400" />;
      default: return <Layers className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
      case "RESOLVED":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "IN_PROGRESS":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
      case "CANCELLED":
        return "bg-slate-800 text-slate-500 border-slate-700";
      default:
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
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
          title="Task Calendar"
          subtitle="Date-organized view of your assigned operational tasks"
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
                <CalendarIcon className="w-6 h-6 text-emerald-400" />
                <span>Task Calendar</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Browse your tasks by date. Select a day to see its assignments.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={goToToday}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Today</span>
              </button>
              <button
                onClick={fetchTasks}
                disabled={loading}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                aria-label="Refresh tasks"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
              <button
                onClick={fetchTasks}
                className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold border border-rose-500/40 transition"
              >
                Retry
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Calendar Mini-Grid */}
            <div className="lg:col-span-5 xl:col-span-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                {/* Month Navigator */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={prevMonth}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <h3 className="font-bold text-sm text-white">
                    {MONTHS[viewMonth]} {viewYear}
                  </h3>
                  <button
                    onClick={nextMonth}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                    aria-label="Next month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {WEEKDAYS.map((wd) => (
                    <div key={wd} className="text-[10px] font-bold text-slate-500 uppercase py-1">
                      {wd}
                    </div>
                  ))}
                </div>

                {/* Date Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells before first day */}
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-9" />
                  ))}

                  {/* Day cells */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const cellDate = new Date(viewYear, viewMonth, day);
                    const key = toDateKey(cellDate);
                    const hasTasks = (tasksByDate[key]?.length || 0) > 0;
                    const isSelected = isSameDay(selectedDate, cellDate);
                    const isToday = isSameDay(today, cellDate);
                    const taskCount = tasksByDate[key]?.length || 0;

                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDate(cellDate)}
                        className={`relative h-9 rounded-lg text-xs font-medium transition-all
                          ${isSelected
                            ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30"
                            : isToday
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : "hover:bg-slate-800 text-slate-300"
                          }
                        `}
                      >
                        <span>{day}</span>
                        {hasTasks && !isSelected && (
                          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
                        )}
                        {hasTasks && isSelected && (
                          <span className="absolute -top-1 -right-1 min-w-3.5 h-3.5 px-0.5 rounded-full bg-slate-950 text-emerald-400 text-[8px] font-bold flex items-center justify-center border border-emerald-500/40">
                            {taskCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-4 text-[10px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Has tasks</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Selected</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded border border-emerald-500/30 bg-emerald-500/15" />
                    <span>Today</span>
                  </div>
                </div>
              </div>

              {/* Quick Stats for selected date */}
              <div className="mt-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 text-center">
                    <span className="text-lg font-bold text-white block">{selectedTasks.length}</span>
                    <span className="text-[10px] text-slate-400">Total</span>
                  </div>
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 text-center">
                    <span className="text-lg font-bold text-amber-300 block">
                      {selectedTasks.filter((t: any) => ["PENDING", "ASSIGNED", "OPEN"].includes(t.status)).length}
                    </span>
                    <span className="text-[10px] text-amber-400/80">Pending</span>
                  </div>
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 text-center">
                    <span className="text-lg font-bold text-emerald-300 block">
                      {selectedTasks.filter((t: any) => ["COMPLETED", "RESOLVED"].includes(t.status)).length}
                    </span>
                    <span className="text-[10px] text-emerald-400/80">Done</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tasks List for Selected Date */}
            <div className="lg:col-span-7 xl:col-span-8">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Tasks for {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {selectedTasks.length} task{selectedTasks.length !== 1 ? "s" : ""} assigned
                    </p>
                  </div>
                  <Link
                    href="/staff/tasks"
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                  >
                    <span>All Tasks</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {loading ? (
                  <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
                    <p className="text-xs font-semibold">Loading tasks...</p>
                  </div>
                ) : selectedTasks.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 p-6">
                    <CalendarIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-300">No tasks on this date</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      There are no operational tasks assigned to you for this day. Select another date or check your full task list.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/60">
                    {selectedTasks.map((task: any) => (
                      <div
                        key={task._id}
                        className="p-4 hover:bg-slate-800/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-center flex-shrink-0">
                            {getCategoryIcon(task.category)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/staff/tasks/${task.taskId || task._id}`}
                                className="font-mono text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline transition"
                              >
                                {task.taskId}
                              </Link>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                                {task.category?.replace("_", " ")}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusStyle(task.status)}`}
                              >
                                {task.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 truncate">
                              Room {task.roomNumber} • {task.roomType}
                              {task.priority && task.priority !== "NORMAL" && (
                                <span className={`ml-2 font-bold ${task.priority === "URGENT" ? "text-rose-400" : task.priority === "HIGH" ? "text-amber-400" : "text-slate-500"}`}>
                                  • {task.priority}
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(task.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Link
                            href={`/staff/tasks/${task.taskId || task._id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
