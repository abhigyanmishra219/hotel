"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Hotel as HotelIcon,
  LayoutDashboard,
  Building2,
  PlusCircle,
  UserCheck,
  CreditCard,
  Layers,
  Receipt,
  Users,
  ClipboardList,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "MAIN",
    items: [
      {
        label: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    title: "HOTEL MANAGEMENT",
    items: [
      {
        label: "Hotels",
        href: "/admin/hotels",
        icon: Building2,
        exact: true,
      },
      {
        label: "Add Hotel",
        href: "/admin/hotels/new",
        icon: PlusCircle,
      },
    ],
  },
  {
    title: "MANAGEMENT",
    items: [
      {
        label: "Managers",
        href: "/admin/managers",
        icon: UserCheck,
      },
    ],
  },
  {
    title: "SUBSCRIPTIONS",
    items: [
      {
        label: "Subscription Plans",
        href: "/admin/subscriptions",
        icon: Layers,
        exact: true,
      },
      {
        label: "Payments",
        href: "/admin/payments",
        icon: Receipt,
      },
    ],
  },
  {
    title: "USERS",
    items: [
      {
        label: "All Users",
        href: "/admin/users",
        icon: Users,
      },
    ],
  },
  {
    title: "SECURITY",
    items: [
      {
        label: "Audit Logs",
        href: "/admin/audit-logs",
        icon: ClipboardList,
      },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      {
        label: "Settings",
        href: "/admin/settings",
        icon: Settings,
      },
    ],
  },
];

interface AdminSidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function AdminSidebar({
  isMobileOpen,
  setIsMobileOpen,
  isCollapsed,
  setIsCollapsed,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useUser();

  const isRouteActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out
          ${isCollapsed ? "w-20" : "w-64"}
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Sidebar Header */}
        <div className="h-18 px-4 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <Link
            href="/admin/dashboard"
            onClick={() => setIsMobileOpen(false)}
            className="flex items-center gap-3 overflow-hidden"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20 flex-shrink-0">
              <HotelIcon className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col text-left overflow-hidden">
                <span className="font-bold text-sm tracking-tight text-white truncate">
                  Grand Royale
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20 truncate">
                    SYSTEM ADMIN
                  </span>
                </div>
              </div>
            )}
          </Link>

          {/* Mobile close button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Navigation Items (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  {section.title}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isRouteActive(item);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      title={isCollapsed ? item.label : undefined}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                        active
                          ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm"
                          : "text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent"
                      } ${isCollapsed ? "justify-center px-0" : ""}`}
                    >
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 transition-colors ${
                          active
                            ? "text-amber-400"
                            : "text-slate-400 group-hover:text-amber-400"
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer: Logged in Admin Profile */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex-shrink-0 space-y-2">
          {!isCollapsed ? (
            <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-semibold text-white truncate">
                    {user?.name || "System Admin"}
                  </div>
                  <div className="text-[10px] text-amber-300/90 font-mono truncate">
                    {user?.role || "SYSTEM_ADMIN"}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div
                className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400"
                title={`${user?.name} (${user?.role})`}
              >
                <User className="w-4 h-4" />
              </div>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Link
              href="/admin/settings"
              onClick={() => setIsMobileOpen(false)}
              className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs transition ${
                isCollapsed ? "justify-center" : ""
              }`}
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5 flex-shrink-0" />
              {!isCollapsed && <span>Settings</span>}
            </Link>

            <button
              onClick={logout}
              className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs font-medium transition ${
                isCollapsed ? "justify-center" : ""
              }`}
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
