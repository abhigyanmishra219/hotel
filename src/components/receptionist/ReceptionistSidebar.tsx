"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  BedDouble,
  DoorOpen,
  Receipt,
  History,
  Settings,
  LogOut,
  Hotel as HotelIcon,
  ChevronLeft,
  ChevronRight,
  Shield,
  X,
  Sparkles,
  UserCheck,
  UtensilsCrossed,
  DollarSign,
  BarChart3,
  CalendarPlus,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  phase?: string;
  exact?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "FRONT DESK",
    items: [
      {
        label: "Dashboard",
        href: "/receptionist/dashboard",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        label: "Bookings",
        href: "/receptionist/bookings",
        icon: CalendarCheck,
        exact: true,
      },
      {
        label: "New Booking",
        href: "/receptionist/bookings?new=true",
        icon: CalendarPlus,
      },
      {
        label: "Check-in",
        href: "/receptionist/check-in",
        icon: DoorOpen,
      },
      {
        label: "Check-out",
        href: "/receptionist/check-out",
        icon: DoorOpen,
      },
      {
        label: "Customers",
        href: "/receptionist/customers",
        icon: Users,
      },
      {
        label: "Booking History",
        href: "/receptionist/booking-history",
        icon: History,
      },
    ],
  },
  {
    title: "ROOMS",
    items: [
      {
        label: "Room Status",
        href: "/receptionist/rooms",
        icon: BedDouble,
      },
    ],
  },
  {
    title: "BILLING",
    items: [
      {
        label: "Invoices",
        href: "/receptionist/billing",
        icon: Receipt,
      },
      {
        label: "Payments",
        href: "/receptionist/billing?paymentStatus=PAID",
        icon: DollarSign,
      },
    ],
  },
  {
    title: "REPORTS",
    items: [
      {
        label: "Reports",
        href: "/receptionist/reports",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      {
        label: "Housekeeping",
        href: "/receptionist/housekeeping",
        icon: Sparkles,
      },
      {
        label: "Room Service",
        href: "/receptionist/room-service",
        icon: UtensilsCrossed,
      },
    ],
  },
];

interface ReceptionistSidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function ReceptionistSidebar({
  isMobileOpen,
  setIsMobileOpen,
  isCollapsed,
  setIsCollapsed,
}: ReceptionistSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useUser();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const isActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-64"
        } ${
          isMobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header / Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
          <Link
            href="/receptionist/dashboard"
            className="flex items-center gap-3 group overflow-hidden"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-400 flex items-center justify-center text-slate-950 font-extrabold shadow-lg shadow-cyan-500/20 flex-shrink-0">
              <HotelIcon className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-sm tracking-tight text-white group-hover:text-cyan-400 transition truncate">
                  GrandStay
                </span>
                <span className="text-[10px] font-bold text-cyan-400 font-mono tracking-wider uppercase">
                  Front Desk Portal
                </span>
              </div>
            )}
          </Link>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              {!isCollapsed && (
                <p className="px-3 text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 relative ${
                      active
                        ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        active
                          ? "text-cyan-400"
                          : "text-slate-400 group-hover:text-slate-200"
                      }`}
                    />
                    {!isCollapsed && (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="truncate">{item.label}</span>
                        {item.phase && (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                            {item.phase}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          {!isCollapsed ? (
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs flex-shrink-0">
                  {user?.name?.charAt(0).toUpperCase() || "R"}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {user?.name || "Receptionist"}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    {user?.role || "RECEPTIONIST"}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full p-2 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          {/* Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex w-full mt-2 py-1 items-center justify-center text-[10px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 rounded-lg transition gap-1"
          >
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <>
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
