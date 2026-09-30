"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  Filter,
  Loader2,
  Sparkles,
  UtensilsCrossed,
  Wrench,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import StaffSidebar from "@/components/staff/StaffSidebar";
import StaffHeader from "@/components/staff/StaffHeader";

interface INotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  relatedTaskId?: string;
  relatedTaskType?: "HOUSEKEEPING" | "ROOM_SERVICE" | "MAINTENANCE";
  isRead: boolean;
  createdAt: string;
}

export default function StaffNotificationsPage() {
  const { user, isLoading: authLoading } = useUser();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [notifications, setNotifications] = useState<INotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(unreadOnly ? { unreadOnly: "true" } : {}),
      });

      const res = await fetch(`/api/staff/notifications?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load notifications.");
      }

      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setTotalPages(data.pagination?.pages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly]);

  useEffect(() => {
    if (user && !user.mustChangePassword) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/staff/notifications/${id}/read`, {
        method: "PATCH",
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
      // Ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch("/api/staff/notifications/read-all", {
        method: "PATCH",
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch {
      // Ignore
    }
  };

  const getTaskUrl = (item: INotificationItem) => {
    if (!item.relatedTaskId) return null;
    if (item.relatedTaskType === "HOUSEKEEPING") {
      return `/staff/housekeeping/${item.relatedTaskId}`;
    }
    if (item.relatedTaskType === "ROOM_SERVICE") {
      return `/staff/room-service/${item.relatedTaskId}`;
    }
    return `/staff/tasks/${item.relatedTaskId}`;
  };

  const getTypeIcon = (type?: string, taskType?: string) => {
    if (taskType === "HOUSEKEEPING") {
      return <Sparkles className="w-4 h-4 text-emerald-400" />;
    }
    if (taskType === "ROOM_SERVICE") {
      return <UtensilsCrossed className="w-4 h-4 text-amber-400" />;
    }
    if (taskType === "MAINTENANCE") {
      return <Wrench className="w-4 h-4 text-cyan-400" />;
    }
    return <Bell className="w-4 h-4 text-slate-400" />;
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
          title="Notifications Center"
          subtitle="Real-time alerts, task assignments, and property updates"
        />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
                <Bell className="w-6 h-6 text-emerald-400" />
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {unreadCount} unread
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Stay updated with task assignments, priority changes, and room alerts.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark All Read</span>
                </button>
              )}
              <button
                onClick={fetchNotifications}
                disabled={loading}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                aria-label="Refresh notifications"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <button
                onClick={() => {
                  setUnreadOnly(false);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  !unreadOnly
                    ? "bg-emerald-500 text-slate-950 font-bold"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                All ({totalCount})
              </button>
              <button
                onClick={() => {
                  setUnreadOnly(true);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  unreadOnly
                    ? "bg-emerald-500 text-slate-950 font-bold"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Unread Only ({unreadCount})
              </button>
            </div>

            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Showing page {page} of {totalPages}
            </span>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
              <button
                onClick={fetchNotifications}
                className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold border border-rose-500/40 transition"
              >
                Retry
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
                <p className="text-xs font-semibold">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-20 text-center text-slate-400 p-8">
                <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white">No notifications</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {unreadOnly
                    ? "You don't have any unread notifications. All caught up!"
                    : "You do not have any notifications at this time."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {notifications.map((item) => {
                  const taskUrl = getTaskUrl(item);

                  return (
                    <div
                      key={item._id}
                      className={`p-5 hover:bg-slate-800/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        !item.isRead ? "bg-emerald-500/5" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                          {getTypeIcon(item.type, item.relatedTaskType)}
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-bold block ${
                                !item.isRead ? "text-emerald-300" : "text-white"
                              }`}
                            >
                              {item.title}
                            </span>
                            {!item.isRead && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {item.message}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3" />
                              {new Date(item.createdAt).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {item.relatedTaskId && (
                              <span className="font-mono text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                {item.relatedTaskId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:self-center flex-shrink-0">
                        {taskUrl && (
                          <Link
                            href={taskUrl}
                            onClick={() => {
                              if (!item.isRead) handleMarkAsRead(item._id);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs font-semibold border border-slate-700 transition"
                          >
                            <span>View Task</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                        {!item.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(item._id)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 border border-slate-700 transition"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Page {page} of {totalPages} ({totalCount} total)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
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
