"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Plus,
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Clock,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  BedDouble,
  Users,
  Play,
  Check,
  Ban,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { USER_ROLES } from "@/types/roles";
import ManagerSidebar from "@/components/manager/ManagerSidebar";
import ManagerHeader from "@/components/manager/ManagerHeader";
import { IHousekeepingTaskData, HOUSEKEEPING_TYPES, TASK_PRIORITIES, TASK_STATUSES } from "@/types/housekeeping";

export default function ManagerHousekeepingPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useUser();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [tasks, setTasks] = useState<IHousekeepingTaskData[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [assigningTask, setAssigningTask] = useState<IHousekeepingTaskData | null>(null);
  const [viewTask, setViewTask] = useState<IHousekeepingTaskData | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // New task form state
  const [newRoomId, setNewRoomId] = useState("");
  const [newType, setNewType] = useState("ROOM_CLEANING");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newAssignee, setNewAssignee] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Auth Protection
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace("/login");
      } else if (user.mustChangePassword) {
        router.replace("/change-password");
      } else if (
        user.role !== USER_ROLES.MANAGER &&
        user.role !== USER_ROLES.SYSTEM_ADMIN
      ) {
        router.replace("/");
      }
    }
  }, [user, authLoading, router]);

  const fetchStaffAndRooms = useCallback(async () => {
    try {
      const [staffRes, roomsRes] = await Promise.all([
        fetch("/api/staff?isActive=true"),
        fetch("/api/rooms?isActive=true"),
      ]);
      const staffData = await staffRes.json();
      const roomsData = await roomsRes.json();

      if (staffRes.ok) setStaffList(staffData.staff || []);
      if (roomsRes.ok) setRoomsList(roomsData.rooms || []);
    } catch {
      // Ignore
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "25",
      });

      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (priorityFilter !== "ALL") params.append("priority", priorityFilter);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(`/api/housekeeping?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load housekeeping tasks.");
      }

      setTasks(data.tasks || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err: any) {
      setError(err.message || "Failed to fetch cleaning tasks.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, priorityFilter, search]);

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchStaffAndRooms();
    }
  }, [user, fetchTasks, fetchStaffAndRooms]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setCreateError(null);

      if (!newRoomId) {
        setCreateError("Please select a room.");
        return;
      }

      const res = await fetch("/api/housekeeping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: newRoomId,
          type: newType,
          priority: newPriority,
          assignedTo: newAssignee || undefined,
          notes: newNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create task.");

      setIsCreateOpen(false);
      setNewRoomId("");
      setNewNotes("");
      setNewAssignee("");
      fetchTasks();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignStaff = async () => {
    if (!assigningTask || !selectedStaffId) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/housekeeping/${assigningTask.taskId || assigningTask._id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: selectedStaffId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign staff member.");

      setAssigningTask(null);
      setSelectedStaffId("");
      fetchTasks();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelTask = async (task: IHousekeepingTaskData) => {
    if (!confirm(`Are you sure you want to cancel task ${task.taskId}?`)) return;
    try {
      const res = await fetch(`/api/housekeeping/${task.taskId || task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel task.");
      fetchTasks();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
        <p className="text-sm font-medium">Verifying Manager Authorization...</p>
      </div>
    );
  }

  // Calculate live tab stats
  const pendingCount = tasks.filter((t) => t.status === "PENDING").length;
  const assignedCount = tasks.filter((t) => t.status === "ASSIGNED").length;
  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex selection:bg-amber-500 selection:text-slate-950">
      <ManagerSidebar
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
        <ManagerHeader
          onMenuClick={() => setIsMobileOpen(true)}
          isCollapsed={isCollapsed}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
                <Sparkles className="w-6 h-6 text-amber-400" />
                <span>Housekeeping &amp; Room Turnaround</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Monitor room cleaning tasks dispatched after guest checkout and manually schedule deep cleaning or inspections.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchTasks}
                disabled={loading}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition"
              >
                <Plus className="w-4 h-4" />
                <span>New Cleaning Task</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Pending Tasks</span>
                <span className="text-xl font-bold text-amber-400">{pendingCount}</span>
              </div>
              <Clock className="w-5 h-5 text-amber-400/40" />
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Assigned</span>
                <span className="text-xl font-bold text-blue-400">{assignedCount}</span>
              </div>
              <UserCheck className="w-5 h-5 text-blue-400/40" />
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">In Progress</span>
                <span className="text-xl font-bold text-cyan-400">{inProgressCount}</span>
              </div>
              <Play className="w-5 h-5 text-cyan-400/40" />
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Completed</span>
                <span className="text-xl font-bold text-emerald-400">{completedCount}</span>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400/40" />
            </div>
          </div>

          {/* Filters & Search */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search Room Number, Staff or Task ID..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 flex-1 md:flex-initial">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500 transition"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500 transition"
              >
                <option value="ALL">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
                <p className="text-xs font-semibold">Loading housekeeping tasks...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 text-emerald-400/40 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-white">No housekeeping tasks found.</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  All guest checkout rooms are clean and ready, or no tasks match your filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                      <th className="py-3.5 px-4">Task ID</th>
                      <th className="py-3.5 px-4">Room</th>
                      <th className="py-3.5 px-4">Task Type</th>
                      <th className="py-3.5 px-4">Assigned Staff</th>
                      <th className="py-3.5 px-4">Priority</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Created</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {tasks.map((task) => (
                      <tr key={task._id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          {task.taskId}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">
                              Room {task.roomId?.roomNumber || "N/A"}
                            </span>
                            <span className="text-[10px] text-slate-400 px-1 py-0.5 rounded bg-slate-800">
                              {task.roomId?.roomType}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 border border-slate-700 text-slate-200">
                            {task.type?.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {task.assignedTo ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                                {task.assignedTo.name?.[0] || "S"}
                              </div>
                              <span className="font-semibold text-white">
                                {task.assignedTo.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-amber-400/80 font-medium italic">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              task.priority === "URGENT"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : task.priority === "HIGH"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : task.priority === "MEDIUM"
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}
                          >
                            {task.priority}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              task.status === "COMPLETED"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : task.status === "IN_PROGRESS"
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                : task.status === "CANCELLED"
                                ? "bg-slate-800 text-slate-500 border border-slate-700"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {task.status?.replace("_", " ")}
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
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewTask(task)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {task.status !== "COMPLETED" && task.status !== "CANCELLED" && (
                              <>
                                <button
                                  onClick={() => {
                                    setAssigningTask(task);
                                    setSelectedStaffId(task.assignedTo?._id || "");
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-semibold text-[11px] border border-amber-500/30 transition"
                                >
                                  {task.assignedTo ? "Reassign" : "Assign"}
                                </button>

                                <button
                                  onClick={() => handleCancelTask(task)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                                  title="Cancel Task"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

      {/* Modal: Create Cleaning Task */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Create Housekeeping Task</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Target Room *</label>
                <select
                  value={newRoomId}
                  onChange={(e) => setNewRoomId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 transition"
                >
                  <option value="">Select Room...</option>
                  {roomsList.map((r) => (
                    <option key={r._id} value={r._id}>
                      Room {r.roomNumber} ({r.roomType}) — Status: {r.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Task Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 transition"
                  >
                    {HOUSEKEEPING_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 transition"
                  >
                    {TASK_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Assign Staff Member (Optional)</label>
                <select
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 transition"
                >
                  <option value="">Leave Unassigned (Pending)</option>
                  {staffList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Notes / Instructions</label>
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Special instructions for the staff member..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Staff */}
      {assigningTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">
                  Assign Staff to Task {assigningTask.taskId}
                </h3>
              </div>
              <button
                onClick={() => setAssigningTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-3">
              <p className="text-slate-300">
                Select a staff member belonging to your hotel to assign to Room{" "}
                <strong>{assigningTask.roomId?.roomNumber}</strong> ({assigningTask.type}).
              </p>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Select Staff Member *</label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 transition"
                >
                  <option value="">Choose Staff...</option>
                  {staffList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
              <button
                onClick={() => setAssigningTask(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignStaff}
                disabled={actionLoading || !selectedStaffId}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Assign Task</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Details */}
      {viewTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">
                  Task {viewTask.taskId} Details
                </h3>
              </div>
              <button
                onClick={() => setViewTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Target Room</span>
                <span className="font-bold text-white">
                  Room {viewTask.roomId?.roomNumber || "N/A"} ({viewTask.roomId?.roomType})
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Task Type</span>
                <span className="font-medium text-white">{viewTask.type}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Assigned Staff</span>
                <span className="font-semibold text-emerald-400">
                  {viewTask.assignedTo?.name || "Unassigned"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Priority</span>
                <span className="font-bold text-amber-400">{viewTask.priority}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Status</span>
                <span className="font-bold text-white">{viewTask.status}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Notes</span>
                <span className="text-slate-300 text-right max-w-[200px]">
                  {viewTask.notes || "None"}
                </span>
              </div>
              {viewTask.startedAt && (
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Started At</span>
                  <span className="text-slate-300">
                    {new Date(viewTask.startedAt).toLocaleString()}
                  </span>
                </div>
              )}
              {viewTask.completedAt && (
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Completed At</span>
                  <span className="text-slate-300">
                    {new Date(viewTask.completedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewTask(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
