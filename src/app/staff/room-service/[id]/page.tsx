"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UtensilsCrossed,
  Play,
  Check,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Layers,
  Sparkles,
  FileText,
  Save,
  Package,
  User,
  ShieldAlert,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { USER_ROLES } from "@/types/roles";
import StaffSidebar from "@/components/staff/StaffSidebar";
import StaffHeader from "@/components/staff/StaffHeader";
import { IRoomServiceRequestData } from "@/types/roomService";

export default function StaffRoomServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const taskId = resolvedParams.id;

  const router = useRouter();
  const { user, isLoading: authLoading } = useUser();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [task, setTask] = useState<IRoomServiceRequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Notes editing state
  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSuccess, setNotesSuccess] = useState(false);

  // Confirmation Modal state
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  // Auth protection
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace("/login");
      } else if (user.mustChangePassword) {
        router.replace("/change-password");
      } else if (
        user.role !== USER_ROLES.STAFF &&
        user.role !== USER_ROLES.SYSTEM_ADMIN &&
        user.role !== USER_ROLES.MANAGER
      ) {
        router.replace("/");
      }
    }
  }, [user, authLoading, router]);

  const fetchTaskDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/room-service/${taskId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load room service task details.");
      }

      setTask(data.request);
      setNotes(data.request.notes || "");
    } catch (err: any) {
      setError(err.message || "Failed to load task details.");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (user && taskId) {
      fetchTaskDetails();
    }
  }, [user, taskId, fetchTaskDetails]);

  // Start Service
  const handleStartService = async () => {
    try {
      setActionLoading(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch(`/api/room-service/${taskId}/start`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start room service.");
      }

      setTask(data.request);
      setSuccessMessage("Room service delivery started. Status is now In Progress.");
    } catch (err: any) {
      setError(err.message || "Failed to start room service.");
    } finally {
      setActionLoading(false);
    }
  };

  // Complete Service
  const handleCompleteService = async () => {
    try {
      setActionLoading(true);
      setError(null);
      setSuccessMessage(null);
      setShowCompleteConfirm(false);

      const res = await fetch(`/api/room-service/${taskId}/complete`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to complete room service delivery.");
      }

      setTask(data.request);
      setSuccessMessage("Room service delivery completed successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to complete room service delivery.");
    } finally {
      setActionLoading(false);
    }
  };

  // Save Operational Notes
  const handleSaveNotes = async () => {
    try {
      setIsSavingNotes(true);
      setNotesSuccess(false);
      setError(null);

      const res = await fetch(`/api/room-service/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save operational notes.");
      }

      setTask(data.request);
      setNotesSuccess(true);
      setTimeout(() => setNotesSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to save notes.");
    } finally {
      setIsSavingNotes(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
        <p className="text-sm font-medium">Verifying Staff Credentials...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex selection:bg-amber-500 selection:text-slate-950">
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
          title={`Room Service Task: ${task?.requestId || taskId}`}
          subtitle="Fulfill guest amenities, dining orders, and item deliveries"
        />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between">
            <Link
              href="/staff/room-service"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Room Service Tasks</span>
            </Link>

            {task && (
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                    task.priority === "URGENT"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : task.priority === "HIGH"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  }`}
                >
                  {task.priority} PRIORITY
                </span>

                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                    task.status === "COMPLETED"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : task.status === "IN_PROGRESS"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {task.status.replace("_", " ")}
                </span>
              </div>
            )}
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-slate-900/40 rounded-3xl border border-slate-800/80">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
              <p className="text-xs font-semibold">Loading task and room information...</p>
            </div>
          ) : !task ? (
            <div className="py-20 text-center text-slate-400 bg-slate-900/40 rounded-3xl border border-slate-800/80">
              <ShieldAlert className="w-12 h-12 text-rose-400/50 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">Task Not Found or Access Denied</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                This room service request may belong to another staff member, another hotel, or has been removed.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top Banner Card: Room & Delivery Summary */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                      <UtensilsCrossed className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-[11px] font-mono text-amber-400 uppercase tracking-widest block font-semibold">
                        Room Service Order • {task.requestId}
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-white mt-0.5">
                        Room {task.roomId?.roomNumber || "N/A"}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                        <span>Floor: <strong className="text-white">{task.roomId?.floor || "1"}</strong></span>
                        <span>•</span>
                        <span>Type: <strong className="text-white">{task.roomId?.roomType || "Standard"}</strong></span>
                        <span>•</span>
                        <span>Room Status: <strong className="text-amber-300">{task.roomId?.status || "OCCUPIED"}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Operational Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    {task.status === "PENDING" || task.status === "ASSIGNED" ? (
                      <button
                        onClick={handleStartService}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
                      >
                        {actionLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        <span>Start Service</span>
                      </button>
                    ) : task.status === "IN_PROGRESS" ? (
                      <button
                        onClick={() => setShowCompleteConfirm(true)}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
                      >
                        {actionLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span>Complete Service</span>
                      </button>
                    ) : task.status === "COMPLETED" ? (
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Delivered Successfully</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Requested Items & Guest Info (2 cols) */}
                <div className="md:col-span-2 space-y-6">
                  {/* Requested Items Card */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Package className="w-4 h-4 text-amber-400" />
                      <span>Requested Items & Amenities</span>
                    </h3>

                    <div className="divide-y divide-slate-800/80 rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                      {task.items && task.items.length > 0 ? (
                        task.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-4 flex items-center justify-between hover:bg-slate-900/40 transition"
                          >
                            <div>
                              <span className="text-sm font-bold text-white block">
                                {item.item}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                Item #{idx + 1}
                              </span>
                            </div>
                            <div className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono font-bold text-xs">
                              Qty: {item.quantity}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-xs text-slate-400">
                          No specific items listed.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Operational Notes Section */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-400" />
                        <span>Staff Operational Notes</span>
                      </h3>
                      {notesSuccess && (
                        <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Notes Saved
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add delivery observations (e.g. Delivered 2 water bottles directly to guest, extra towels placed on dresser)..."
                        rows={4}
                        className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition resize-none"
                      />

                      <div className="flex justify-end">
                        <button
                          onClick={handleSaveNotes}
                          disabled={isSavingNotes || task.status === "CANCELLED"}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 transition disabled:opacity-50"
                        >
                          {isSavingNotes ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          <span>Save Notes</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Room & Service Meta Details (1 col) */}
                <div className="space-y-6">
                  {/* Guest & Room Details */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>Service Target Details</span>
                    </h4>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Target Room:</span>
                        <span className="font-bold text-white">Room {task.roomId?.roomNumber || "N/A"}</span>
                      </div>

                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Floor Level:</span>
                        <span className="font-semibold text-white">Floor {task.roomId?.floor || "1"}</span>
                      </div>

                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Room Type:</span>
                        <span className="font-semibold text-white">{task.roomId?.roomType || "Standard"}</span>
                      </div>

                      {(task.bookingId?.customerId?.fullName || task.bookingId?.customerId?.name) && (
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Guest Name:</span>
                          <span className="font-semibold text-amber-300 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {task.bookingId.customerId.fullName || task.bookingId.customerId.name}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Room Status:</span>
                        <span className="font-bold text-emerald-400">{task.roomId?.status || "OCCUPIED"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Timeline */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Delivery Timeline</span>
                    </h4>

                    <div className="space-y-2.5 text-xs text-slate-300">
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Requested:</span>
                        <span className="text-white font-mono text-[11px]">
                          {task.createdAt ? new Date(task.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "N/A"}
                        </span>
                      </div>

                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Started:</span>
                        <span className="text-cyan-300 font-mono text-[11px]">
                          {task.startedAt ? new Date(task.startedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "Not Started"}
                        </span>
                      </div>

                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Completed:</span>
                        <span className="text-emerald-300 font-mono text-[11px]">
                          {task.completedAt ? new Date(task.completedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "Pending"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Confirmation Dialog for Completion */}
      {showCompleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Complete Room Service?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Confirm that all requested items have been delivered to{" "}
              <strong className="text-white font-bold">Room {task?.roomId?.roomNumber}</strong>.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setShowCompleteConfirm(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteService}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Yes, Complete Service</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
