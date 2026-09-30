"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Play,
  Check,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  Calendar,
  Building2,
  FileText,
  Save,
  Clock,
  BedDouble,
  Shield,
  Layers,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import StaffSidebar from "@/components/staff/StaffSidebar";
import StaffHeader from "@/components/staff/StaffHeader";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function StaffHousekeepingDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const taskIdParam = resolvedParams.id;

  const router = useRouter();
  const { user, isLoading: authLoading } = useUser();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [task, setTask] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchTaskDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/housekeeping/${taskIdParam}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load housekeeping task details.");
      }

      setTask(data.task);
      setNotes(data.task?.notes || "");
    } catch (err: any) {
      setError(err.message || "Housekeeping task not found or access denied.");
    } finally {
      setLoading(false);
    }
  }, [taskIdParam]);

  useEffect(() => {
    if (user && !user.mustChangePassword) {
      fetchTaskDetails();
    }
  }, [user, fetchTaskDetails]);

  const handleStartCleaning = async () => {
    try {
      setActionLoading(true);
      setSuccessMessage(null);
      const res = await fetch(`/api/housekeeping/${taskIdParam}/start`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start cleaning.");

      setSuccessMessage("Cleaning started. Room is in CLEANING status.");
      setTimeout(() => setSuccessMessage(null), 3500);
      fetchTaskDetails();
    } catch (err: any) {
      alert(err.message || "Action failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteCleaning = async () => {
    try {
      setActionLoading(true);
      setSuccessMessage(null);
      setShowConfirmModal(false);
      const res = await fetch(`/api/housekeeping/${taskIdParam}/complete`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to complete cleaning.");

      setSuccessMessage(data.message || "Housekeeping task completed! Room marked Ready.");
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchTaskDetails();
    } catch (err: any) {
      alert(err.message || "Action failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      setActionLoading(true);
      setSuccessMessage(null);
      const res = await fetch(`/api/staff/tasks/${taskIdParam}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save cleaning notes.");

      setSuccessMessage("Cleaning notes updated successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchTaskDetails();
    } catch (err: any) {
      alert(err.message || "Action failed.");
    } finally {
      setActionLoading(false);
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

  const room = task?.roomId;

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
          title="Housekeeping Task Details"
          subtitle={`Room turnaround & cleaning for ${task?.taskId || taskIdParam}`}
        />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Back Navigation Button */}
          <Link
            href="/staff/housekeeping"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Housekeeping</span>
          </Link>

          {/* Success Banner */}
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
              <p className="text-xs font-medium">Loading housekeeping details...</p>
            </div>
          ) : !task ? (
            <div className="py-20 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800 p-8">
              <AlertTriangle className="w-10 h-10 text-rose-400/40 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">Task Not Found</h3>
              <p className="text-xs text-slate-400 mt-1">
                This housekeeping task does not exist or is not assigned to your account.
              </p>
              <Link
                href="/staff/housekeeping"
                className="mt-4 inline-block px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition"
              >
                Return to Housekeeping
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-mono text-base font-bold text-emerald-400">
                        {task.taskId}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getPriorityBadge(
                          task.priority
                        )}`}
                      >
                        {task.priority} Priority
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                          task.status
                        )}`}
                      >
                        {task.status}
                      </span>
                    </div>

                    <h1 className="text-xl font-extrabold text-white">
                      Room {room?.roomNumber || "N/A"} • {String(task.type).replace("_", " ")}
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                      Housekeeper: <strong className="text-white">{user.name}</strong>
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {task.status === "PENDING" || task.status === "ASSIGNED" ? (
                      <button
                        onClick={handleStartCleaning}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50"
                      >
                        {actionLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        <span>Start Cleaning</span>
                      </button>
                    ) : task.status === "IN_PROGRESS" ? (
                      <button
                        onClick={() => setShowConfirmModal(true)}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50"
                      >
                        {actionLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span>Complete & Mark Ready</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Cleaning Completed</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Room Details & Schedule Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Room Info */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                    <BedDouble className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-sm font-bold text-white">Room Information</h2>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                      <span className="text-slate-400">Room Number</span>
                      <span className="font-bold text-white font-mono text-sm">
                        Room {room?.roomNumber || "N/A"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                      <span className="text-slate-400">Room Type</span>
                      <span className="font-semibold text-white">{room?.roomType || "Standard"}</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                      <span className="text-slate-400">Floor</span>
                      <span className="font-semibold text-white">Floor {room?.floor || 1}</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                      <span className="text-slate-400">Current Room Status</span>
                      <span className="font-bold text-amber-400 font-mono">
                        {room?.status || "CLEANING"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Schedule & History */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                    <Clock className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-sm font-bold text-white">Turnaround Schedule</h2>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                      <span className="text-slate-400">Created / Dispatched</span>
                      <span className="text-white">
                        {new Date(task.createdAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                      <span className="text-slate-400">Started Cleaning</span>
                      <span className="text-white">
                        {task.startedAt
                          ? new Date(task.startedAt).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Awaiting start"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                      <span className="text-slate-400">Completed & Ready</span>
                      <span className="text-white">
                        {task.completedAt
                          ? new Date(task.completedAt).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Incomplete"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cleaning Instructions & Operational Notes */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                  <FileText className="w-5 h-5 text-amber-400" />
                  <h2 className="text-sm font-bold text-white">Cleaning Notes & Checklist</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="notes"
                      className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1.5"
                    >
                      Housekeeper Notes
                    </label>
                    <textarea
                      id="notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add cleaning turn notes (e.g. Bathroom disinfected, bedsheets changed, mini-bar stocked)..."
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveNotes}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Notes</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Complete Confirmation Modal */}
          {showConfirmModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Complete Housekeeping?</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Room <strong className="text-white">{room?.roomNumber}</strong> will be marked as{" "}
                    <span className="text-emerald-400 font-bold">AVAILABLE / READY</span> for guest check-ins.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCompleteCleaning}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm & Mark Ready</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
