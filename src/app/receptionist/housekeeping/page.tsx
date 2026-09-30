"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  UserCheck,
  Clock,
  Play,
  Ban,
  Building2,
  BedDouble,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { USER_ROLES } from "@/types/roles";
import {
  IHousekeepingTaskData,
  TASK_STATUSES,
  TASK_PRIORITIES,
  HOUSEKEEPING_TYPES,
} from "@/types/housekeeping";

export default function ReceptionistHousekeepingPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useUser();

  const [tasks, setTasks] = useState<IHousekeepingTaskData[]>([]);
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [assignModalTask, setAssignModalTask] = useState<IHousekeepingTaskData | null>(null);
  const [viewTask, setViewTask] = useState<IHousekeepingTaskData | null>(null);
  const [cancelModalTask, setCancelModalTask] = useState<IHousekeepingTaskData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create Form State
  const [newRoomId, setNewRoomId] = useState("");
  const [newType, setNewType] = useState("ROOM_CLEANING");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newAssignedTo, setNewAssignedTo] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Assign Form State
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);

  // Auth Protection
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace("/login");
      } else if (user.mustChangePassword) {
        router.replace("/change-password");
      } else if (
        user.role !== USER_ROLES.RECEPTIONIST &&
        user.role !== USER_ROLES.MANAGER &&
        user.role !== USER_ROLES.SYSTEM_ADMIN
      ) {
        router.replace("/");
      }
    }
  }, [user, authLoading, router]);

  const fetchRoomsAndStaff = useCallback(async () => {
    try {
      const [roomsRes, staffRes] = await Promise.all([
        fetch("/api/rooms?isActive=true"),
        fetch("/api/staff?isActive=true"),
      ]);

      const [roomsData, staffData] = await Promise.all([
        roomsRes.json().catch(() => ({ rooms: [] })),
        staffRes.json().catch(() => ({ staff: [] })),
      ]);

      if (roomsRes.ok) setRoomsList(roomsData.rooms || []);
      if (staffRes.ok) setStaffList(staffData.staff || []);
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
      if (typeFilter !== "ALL") params.append("type", typeFilter);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(`/api/housekeeping?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load housekeeping tasks.");
      }

      setTasks(data.tasks || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err: any) {
      setError(err.message || "Failed to fetch housekeeping tasks.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, priorityFilter, typeFilter, search]);

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchRoomsAndStaff();
    }
  }, [user, fetchTasks, fetchRoomsAndStaff]);

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
          assignedTo: newAssignedTo || undefined,
          notes: newNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create housekeeping task.");

      setIsCreateOpen(false);
      setNewRoomId("");
      setNewType("ROOM_CLEANING");
      setNewPriority("MEDIUM");
      setNewAssignedTo("");
      setNewNotes("");
      fetchTasks();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalTask) return;

    try {
      setActionLoading(true);
      setAssignError(null);

      if (!selectedStaffId) {
        setAssignError("Please select a staff member.");
        return;
      }

      const res = await fetch(`/api/housekeeping/${assignModalTask.taskId || assignModalTask._id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: selectedStaffId,
          notes: assignNotes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign staff member.");

      setAssignModalTask(null);
      setSelectedStaffId("");
      setAssignNotes("");
      fetchTasks();
    } catch (err: any) {
      setAssignError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelTask = async () => {
    if (!cancelModalTask) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/housekeeping/${cancelModalTask.taskId || cancelModalTask._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel task.");

      setCancelModalTask(null);
      fetchTasks();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
        <p className="text-sm font-medium">Verifying Front Desk Credentials...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <span>Housekeeping &amp; Cleaning Operations</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Dispatch room turnarounds, assign staff, monitor cleaning workflows, and track room readiness.
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs shadow-md shadow-purple-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Cleaning Task</span>
          </button>
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
            placeholder="Search Room, Task ID, or Staff..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500 transition"
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
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500 transition"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500 transition"
          >
            <option value="ALL">All Task Types</option>
            <option value="ROOM_CLEANING">Room Cleaning</option>
            <option value="DEEP_CLEANING">Deep Cleaning</option>
            <option value="INSPECTION">Inspection</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tasks Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400 mb-3" />
            <p className="text-xs font-semibold">Loading housekeeping tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 text-purple-400/40 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-white">No housekeeping tasks found.</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              All guest rooms are clean or no tasks match your filter criteria.
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
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-medium">
                        {task.type?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {task.assignedTo ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-[10px]">
                            {task.assignedTo.name?.charAt(0)}
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

                        {(task.status === "PENDING" || task.status === "ASSIGNED") && (
                          <button
                            onClick={() => {
                              setAssignModalTask(task);
                              setSelectedStaffId(task.assignedTo?._id || "");
                              setAssignNotes("");
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-[11px] font-bold transition flex items-center gap-1"
                            title="Assign / Reassign Staff"
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>{task.assignedTo ? "Reassign" : "Assign"}</span>
                          </button>
                        )}

                        {task.status !== "COMPLETED" && task.status !== "CANCELLED" && (
                          <button
                            onClick={() => setCancelModalTask(task)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                            title="Cancel Task"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
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

      {/* Modal: Create Task */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
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
                <label className="block text-slate-400 mb-1 font-medium">Hotel Room *</label>
                <select
                  value={newRoomId}
                  onChange={(e) => setNewRoomId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500 transition"
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
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500 transition"
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
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500 transition"
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
                  value={newAssignedTo}
                  onChange={(e) => setNewAssignedTo(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500 transition"
                >
                  <option value="">Leave Unassigned (Pending Pool)</option>
                  {staffList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Special Instructions / Notes</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Complete sanitization, replace linens..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition"
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
                  className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign / Reassign Staff */}
      {assignModalTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base text-white">
                  Assign Staff to {assignModalTask.taskId}
                </h3>
              </div>
              <button
                onClick={() => setAssignModalTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {assignError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{assignError}</span>
              </div>
            )}

            <form onSubmit={handleAssignStaff} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-400 space-y-1">
                <p>
                  Room: <strong className="text-white">Room {assignModalTask.roomId?.roomNumber}</strong> ({assignModalTask.roomId?.roomType})
                </p>
                <p>
                  Task: <strong className="text-purple-300">{assignModalTask.type}</strong> • Priority:{" "}
                  <strong className="text-amber-300">{assignModalTask.priority}</strong>
                </p>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Select Staff Member *</label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500 transition"
                >
                  <option value="">Select Staff...</option>
                  {staffList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Assignment Note (Optional)</label>
                <input
                  type="text"
                  placeholder="Instructions for staff member"
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAssignModalTask(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !selectedStaffId}
                  className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Task */}
      {viewTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base text-white">
                  Housekeeping Task {viewTask.taskId}
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
                <span className="font-semibold text-purple-300">
                  {viewTask.assignedTo?.name || "Unassigned"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Priority</span>
                <span className="font-bold text-amber-400">{viewTask.priority}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Status</span>
                <span className="font-bold text-emerald-400">{viewTask.status}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Notes / Instructions</span>
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

      {/* Modal: Confirm Cancel Task */}
      {cancelModalTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
              <Ban className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-base text-white">Cancel Housekeeping Task?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to cancel task <strong className="text-white">{cancelModalTask.taskId}</strong> for Room {cancelModalTask.roomId?.roomNumber}?
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setCancelModalTask(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
              >
                Keep Task
              </button>
              <button
                type="button"
                onClick={handleCancelTask}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition disabled:opacity-50"
              >
                {actionLoading ? "Cancelling..." : "Yes, Cancel Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
