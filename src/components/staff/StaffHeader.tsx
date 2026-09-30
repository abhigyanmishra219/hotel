"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  User,
  LogOut,
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

interface StaffHeaderProps {
  onMenuClick: () => void;
  title?: string;
  subtitle?: string;
}

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

export default function StaffHeader({
  onMenuClick,
  title = "Staff Operations",
  subtitle = "GrandStay Housekeeping & Property Tasks",
}: StaffHeaderProps) {
  const router = useRouter();
  const { user, logout } = useUser();

  const [notifications, setNotifications] = useState<INotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const fetchNotifications = useCallback(async (showLoading = false) => {
    if (!user) return;
    if (showLoading) setLoadingNotifs(true);
    try {
      const res = await fetch("/api/staff/notifications?limit=10");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Ignore network errors on background poll
    } finally {
      if (showLoading) setLoadingNotifs(false);
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotifications(false);
    }, 0);
    const interval = setInterval(() => fetchNotifications(false), 45000); // 45s interval
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  // Click outside to close notification panel
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Mobile Menu Toggle + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg tracking-tight text-white">
                {title}
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-400/10 text-emerald-300 border border-emerald-400/20">
                Staff
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {subtitle}
            </p>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notification Bell Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setIsNotifOpen(!isNotifOpen);
                if (!isNotifOpen) fetchNotifications(true);
              }}
              className="relative p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition shadow-sm"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover Panel */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden text-xs">
                <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>

                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <CheckCheck className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                  {loadingNotifs && notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                      <span>Checking notifications...</span>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-300">No new notifications.</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        You&apos;re completely up to date.
                      </p>
                    </div>
                  ) : (
                    notifications.map((item) => {
                      const taskUrl = getTaskUrl(item);

                      return (
                        <div
                          key={item._id}
                          className={`p-3.5 hover:bg-slate-800/40 transition ${
                            !item.isRead ? "bg-emerald-500/5" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5 flex-1">
                              <span
                                className={`font-semibold block ${
                                  !item.isRead ? "text-emerald-300" : "text-white"
                                }`}
                              >
                                {item.title}
                              </span>
                              <p className="text-[11px] text-slate-400 leading-relaxed">
                                {item.message}
                              </p>
                              <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-500">
                                <span>
                                  {new Date(item.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {taskUrl && (
                                  <Link
                                    href={taskUrl}
                                    onClick={() => {
                                      handleMarkAsRead(item._id);
                                      setIsNotifOpen(false);
                                    }}
                                    className="text-emerald-400 hover:underline flex items-center gap-0.5 font-semibold"
                                  >
                                    <span>View Task</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </Link>
                                )}
                              </div>
                            </div>

                            {!item.isRead && (
                              <button
                                onClick={(e) => handleMarkAsRead(item._id, e)}
                                className="p-1 rounded-md text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition flex-shrink-0"
                                title="Mark as read"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-2.5 border-t border-slate-800 bg-slate-950/60 text-center">
                  <Link
                    href="/staff/notifications"
                    onClick={() => setIsNotifOpen(false)}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition"
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Info Badge */}
          <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-1.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-semibold text-white truncate block max-w-[140px]">
                {user?.name || "Staff"}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[140px]">
                {user?.email}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 text-xs font-semibold border border-rose-500/30 transition shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
