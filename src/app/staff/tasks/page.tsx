"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Layers,
  Sparkles,
  UtensilsCrossed,
  Wrench,
  Play,
  Check,
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  Building2,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import StaffSidebar from "@/components/staff/StaffSidebar";
import StaffHeader from "@/components/staff/StaffHeader";

export default function StaffTasksPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useUser();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [tasks, setTasks] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ pending: 0, inProgress: 0, completed: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (typeFilter !== "ALL") params.append("type", typeFilter);
      if (priorityFilter !== "ALL") params.append("priority", priorityFilter);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(`/api/staff/tasks?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load assigned tasks.");
      }

      setTasks(data.tasks || []);
      setSummary(data.summary || { pending: 0, inProgress: 0, completed: 0, total: 0 });
      setTotalPages(data.pagination?.pages || 1);
    } catch (err: any) {
      setError(err.message || "Failed to fetch task list. Please check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter, priorityFilter, search]);

  useEffect(() => {
    if (user && !user.mustChangePassword) {
      fetchTasks();
    }
  }, [user, fetchTasks]);

  const handleStartTask = async (taskId: string) => {
    try {
      setActionLoading(taskId);
      setSuccessMessage(null);
      const res = await fetch(`/api/staff/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "START" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start task.");

      setSuccessMessage("Task started successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchTasks();
    } catch (err: any) {
      alert(err.message || "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      setActionLoading(taskId);
      setSuccessMessage(null);
      const res = await fetch(`/api/staff/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "COMPLETE" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to complete task.");

      setSuccessMessage("Task completed successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchTasks();
    } catch (err: any) {
      alert(err.message || "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case "URGENT":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "HIGH":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "LOW":
        return "bg-slate-800 text-slate-400 border-slate-700";
      default:
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
    }
  };

  const getStatusBadge = (status: string) => {
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
          title="My Assigned Tasks"
          subtitle="Real-time operational workload and duty tracking"
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header Banner & Live KPI Summary */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
                  <Layers className="w-6 h-6 text-emerald-400" />
                  <span>My Operational Tasks</span>
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Manage cleaning turnarounds, room services, and property maintenance assigned to you.
                </p>
              </div>

              <button
                onClick={fetchTasks}
                disabled={loading}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition w-fit"
                aria-label="Refresh tasks"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                <span className="text-[11px] font-medium text-slate-400 block">Total Assigned</span>
                <span className="text-2xl font-bold text-white mt-1 block">
                  {loading ? "..." : summary.total}
                </span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                <span className="text-[11px] font-medium text-amber-400 block">Pending</span>
                <span className="text-2xl font-bold text-amber-300 mt-1 block">
                  {loading ? "..." : summary.pending}
                </span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                <span className="text-[11px] font-medium text-cyan-400 block">In Progress</span>
                <span className="text-2xl font-bold text-cyan-300 mt-1 block">
                  {loading ? "..." : summary.inProgress}
                </span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                <span className="text-[11px] font-medium text-emerald-400 block">Completed</span>
                <span className="text-2xl font-bold text-emerald-300 mt-1 block">
                  {loading ? "..." : summary.completed}
                </span>
              </div>
            </div>
          </div>

          {/* Success Feedback Banner */}
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Banner with Retry */}
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

          {/* Filter Bar */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row gap-3 items-center justify-between">
            <div className="relative w-full lg:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search Room or Task ID..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500 transition"
                  aria-label="Filter by status"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500 transition"
                aria-label="Filter by task type"
              >
                <option value="ALL">All Types</option>
                <option value="HOUSEKEEPING">Housekeeping</option>
                <option value="ROOM_SERVICE">Room Service</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500 transition"
                aria-label="Filter by priority"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          {/* Tasks Container */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
                <p className="text-xs font-semibold">Loading your tasks...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="py-16 text-center text-slate-400 p-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-400/30 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white">No tasks assigned yet.</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  You don&apos;t have any operational tasks assigned to you right now.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="py-3.5 px-4">Task ID</th>
                        <th className="py-3.5 px-4">Room</th>
                        <th className="py-3.5 px-4">Category / Type</th>
                        <th className="py-3.5 px-4">Priority</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Created At</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {tasks.map((task) => {
                        const isActioning = actionLoading === (task.taskId || task._id);

                        return (
                          <tr key={task._id} className="hover:bg-slate-800/40 transition">
                            <td className="py-3.5 px-4 font-mono font-bold text-white">
                              <Link
                                href={`/staff/tasks/${task.taskId || task._id}`}
                                className="text-emerald-400 hover:text-emerald-300 hover:underline transition"
                              >
                                {task.taskId}
                              </Link>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-white">
                                Room {task.roomNumber}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                {task.roomType}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-medium text-[11px]">
                                {task.category} • {String(task.taskType).replace("_", " ")}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityBadge(
                                  task.priority
                                )}`}
                              >
                                {task.priority}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                                  task.status
                                )}`}
                              >
                                {task.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                              {new Date(task.createdAt).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  href={`/staff/tasks/${task.taskId || task._id}`}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                                  title="View Task Details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Link>

                                {task.status === "PENDING" || task.status === "ASSIGNED" || task.status === "OPEN" ? (
                                  <button
                                    onClick={() => handleStartTask(task.taskId || task._id)}
                                    disabled={isActioning}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition disabled:opacity-50"
                                  >
                                    {isActioning ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Play className="w-3.5 h-3.5" />
                                    )}
                                    <span>Start</span>
                                  </button>
                                ) : task.status === "IN_PROGRESS" ? (
                                  <button
                                    onClick={() => handleCompleteTask(task.taskId || task._id)}
                                    disabled={isActioning}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-sm transition disabled:opacity-50"
                                  >
                                    {isActioning ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                    <span>Mark Ready</span>
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden divide-y divide-slate-800/60 p-4 space-y-4">
                  {tasks.map((task) => {
                    const isActioning = actionLoading === (task.taskId || task._id);

                    return (
                      <div
                        key={task._id}
                        className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/staff/tasks/${task.taskId || task._id}`}
                            className="font-mono text-sm font-bold text-emerald-400"
                          >
                            {task.taskId}
                          </Link>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                              task.status
                            )}`}
                          >
                            {task.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <span className="text-white font-bold">Room {task.roomNumber}</span>
                            <span className="text-[11px] text-slate-400 block">{task.roomType}</span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityBadge(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <Link
                            href={`/staff/tasks/${task.taskId || task._id}`}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </Link>

                          {task.status === "PENDING" || task.status === "ASSIGNED" || task.status === "OPEN" ? (
                            <button
                              onClick={() => handleStartTask(task.taskId || task._id)}
                              disabled={isActioning}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {isActioning ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Play className="w-3.5 h-3.5" />
                              )}
                              <span>Start Task</span>
                            </button>
                          ) : task.status === "IN_PROGRESS" ? (
                            <button
                              onClick={() => handleCompleteTask(task.taskId || task._id)}
                              disabled={isActioning}
                              className="px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {isActioning ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>Complete</span>
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 transition"
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
