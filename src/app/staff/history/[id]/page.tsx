"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  History,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Layers,
  Sparkles,
  UtensilsCrossed,
  Wrench,
  FileText,
  User,
  ShieldCheck,
  CheckCheck,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { USER_ROLES } from "@/types/roles";
import StaffSidebar from "@/components/staff/StaffSidebar";
import StaffHeader from "@/components/staff/StaffHeader";

interface ITimelineEvent {
  event: string;
  timestamp: string;
  description: string;
}

interface IHistoryTaskDetail {
  _id: string;
  taskId: string;
  category: "HOUSEKEEPING" | "ROOM_SERVICE" | "MAINTENANCE";
  taskType: string;
  priority: string;
  status: string;
  roomNumber: string;
  floor: string;
  roomType: string;
  notes: string;
  instructions: string;
  items?: Array<{ item: string; quantity: number }>;
  guestName?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  timeline?: ITimelineEvent[];
}

export default function StaffHistoryDetailPage({
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

  const [task, setTask] = useState<IHistoryTaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth Protection
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

      const res = await fetch(`/api/staff/history/${taskId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load historical task details.");
      }

      setTask(data.task);
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

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p className="text-sm font-medium">Verifying Staff Credentials...</p>
      </div>
    );
  }

  const isHousekeeping = task?.category === "HOUSEKEEPING";
  const isRoomService = task?.category === "ROOM_SERVICE";

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
          title={`Task Record: ${task?.taskId || taskId}`}
          subtitle="Read-only activity log and operational timestamps"
        />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between">
            <Link
              href="/staff/history"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Task History</span>
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
                    task.status === "COMPLETED" || task.status === "RESOLVED"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  {task.status}
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-slate-900/40 rounded-3xl border border-slate-800/80">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
              <p className="text-xs font-semibold">Loading historical task record...</p>
            </div>
          ) : !task ? (
            <div className="py-20 text-center text-slate-400 bg-slate-900/40 rounded-3xl border border-slate-800/80">
              <History className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">Record Not Found or Access Denied</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                This completed task record may belong to another staff member or another hotel.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        isHousekeeping
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                          : isRoomService
                          ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                          : "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"
                      }`}
                    >
                      {isHousekeeping ? (
                        <Sparkles className="w-7 h-7" />
                      ) : isRoomService ? (
                        <UtensilsCrossed className="w-7 h-7" />
                      ) : (
                        <Wrench className="w-7 h-7" />
                      )}
                    </div>

                    <div>
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest block font-semibold">
                        {task.category.replace("_", " ")} RECORD • {task.taskId}
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-white mt-0.5">
                        Room {task.roomNumber}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                        <span>Floor: <strong className="text-white">{task.floor}</strong></span>
                        <span>•</span>
                        <span>Type: <strong className="text-white">{task.roomType}</strong></span>
                        <span>•</span>
                        <span>Archived Status: <strong className="text-emerald-400">{task.status}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Read-Only Badge Indicator */}
                  <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-semibold">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Archived &amp; Read-Only</span>
                  </div>
                </div>
              </div>

              {/* Grid: Details & Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Details (2 cols) */}
                <div className="md:col-span-2 space-y-6">
                  {/* Items/Instructions */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span>Task Information &amp; Instructions</span>
                    </h3>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                      {task.instructions || "No special instructions recorded."}
                    </div>

                    {task.items && task.items.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <span className="text-xs font-bold text-slate-400">Delivered Items:</span>
                        <div className="space-y-1">
                          {task.items.map((it, i) => (
                            <div
                              key={i}
                              className="flex justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                            >
                              <span className="font-semibold text-white">{it.item}</span>
                              <span className="text-amber-400 font-mono font-bold">Qty: {it.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Operational Notes Logged */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span>Staff Operational Notes</span>
                    </h3>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 italic">
                      {task.notes ? `"${task.notes}"` : "No operational notes recorded for this task."}
                    </div>
                  </div>
                </div>

                {/* Right Column: Activity Timeline (1 col) */}
                <div className="space-y-6">
                  <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-4">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Activity Timeline</span>
                    </h4>

                    {task.timeline && task.timeline.length > 0 ? (
                      <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                        {task.timeline.map((item, idx) => (
                          <div key={idx} className="relative">
                            <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-slate-900" />
                            <div className="text-xs">
                              <span className="font-bold text-white block">{item.event}</span>
                              <span className="text-[11px] text-emerald-400 font-mono block">
                                {new Date(item.timestamp).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <p className="text-[11px] text-slate-400 mt-0.5">{item.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">Timeline not recorded.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
