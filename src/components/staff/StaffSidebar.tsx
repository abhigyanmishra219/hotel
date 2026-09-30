"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  UtensilsCrossed,
  Wrench,
  Hotel as HotelIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  X,
  Layers,
  KeyRound,
  History,
  Clock,
  CalendarDays,
  Bell,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/staff/dashboard",
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    title: "MY WORK",
    items: [
      {
        label: "My Tasks",
        href: "/staff/tasks",
        icon: Layers,
      },
      {
        label: "Housekeeping",
        href: "/staff/housekeeping",
        icon: Sparkles,
      },
      {
        label: "Room Service",
        href: "/staff/room-service",
        icon: UtensilsCrossed,
      },
      {
        label: "Maintenance",
        href: "/staff/maintenance",
        icon: Wrench,
      },
      {
        label: "Attendance",
        href: "/staff/attendance",
        icon: Clock,
      },
      {
        label: "Task History",
        href: "/staff/history",
        icon: History,
      },
      {
        label: "Calendar",
        href: "/staff/calendar",
        icon: CalendarDays,
      },
      {
        label: "Notifications",
        href: "/staff/notifications",
        icon: Bell,
      },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      {
        label: "Profile",
        href: "/staff/profile",
        icon: User,
      },
      {
        label: "Change Password",
        href: "/change-password",
        icon: KeyRound,
      },
    ],
  },
];

interface StaffSidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function StaffSidebar({
  isMobileOpen,
  setIsMobileOpen,
  isCollapsed,
  setIsCollapsed,
}: StaffSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useUser();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const isRouteActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out
          ${isCollapsed ? "w-20" : "w-64"}
          ${
            isMobileOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
        `}
      >
        {/* Brand Header */}
        <div className="h-18 flex items-center justify-between px-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-300 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20 flex-shrink-0">
              <HotelIcon className="w-6 h-6" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-base tracking-tight text-white truncate">
                  GrandStay
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">
                  Staff Portal
                </span>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Identity Card */}
        {!isCollapsed && (
          <div className="mx-3 mt-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                Staff Identity
              </span>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                STAFF
              </span>
            </div>
            <p className="font-semibold text-white truncate">
              {user?.name || "Staff Member"}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {user?.email}
            </p>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4 custom-scrollbar">
          {NAV_SECTIONS.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {!isCollapsed && section.title && (
                <div className="px-2.5 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {section.title}
                </div>
              )}

              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isRouteActive(item);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    title={isCollapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group relative ${
                      active
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent"
                    } ${isCollapsed ? "justify-center px-2" : ""}`}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        active
                          ? "text-emerald-400"
                          : "text-slate-400 group-hover:text-emerald-300"
                      }`}
                    />

                    {!isCollapsed && (
                      <span className="flex-1 truncate">{item.label}</span>
                    )}

                    {/* Active Accent Bar */}
                    {active && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-emerald-400 rounded-r" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer Collapse Toggle & User Actions */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/60 space-y-2">
          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex w-full items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <div className="flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[11px] text-slate-400">Collapse menu</span>
              </div>
            )}
          </button>

          {/* User Quick Info & Logout */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs font-medium border border-rose-500/20 transition ${
                isCollapsed ? "justify-center" : ""
              }`}
              title="Logout"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
