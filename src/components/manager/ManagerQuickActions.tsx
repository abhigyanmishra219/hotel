"use client";

import React from "react";
import Link from "next/link";
import {
  Plus,
  Users,
  UserCheck,
  CalendarCheck,
  Receipt,
  UtensilsCrossed,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface ActionItem {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  phase: string;
  color: string;
  bgGlow: string;
}

const QUICK_ACTIONS: ActionItem[] = [
  {
    title: "+ New Booking",
    description: "Reserve rooms with instant availability check",
    href: "/manager/bookings/new",
    icon: CalendarCheck,
    phase: "Phase 5 Active",
    color: "from-amber-500 to-amber-400 text-slate-950 font-bold",
    bgGlow: "group-hover:border-amber-500/50",
  },
  {
    title: "Housekeeping",
    description: "Cleaning tasks, staff assignments & room readiness",
    href: "/manager/housekeeping",
    icon: Sparkles,
    phase: "Phase 7 Active",
    color: "bg-slate-800 text-amber-300 font-semibold",
    bgGlow: "group-hover:border-slate-600",
  },
  {
    title: "Room Service",
    description: "In-stay amenities, towels & water delivery",
    href: "/manager/room-service",
    icon: UtensilsCrossed,
    phase: "Phase 7 Active",
    color: "bg-slate-800 text-amber-300 font-semibold",
    bgGlow: "group-hover:border-slate-600",
  },
  {
    title: "Manage Rooms",
    description: "Manage room inventory, types & pricing",
    href: "/manager/rooms",
    icon: Plus,
    phase: "Phase 2 Active",
    color: "bg-slate-800 text-amber-300 font-semibold",
    bgGlow: "group-hover:border-slate-600",
  },
  {
    title: "Manage Staff",
    description: "Housekeeping & maintenance staff assignments",
    href: "/manager/staff",
    icon: Users,
    phase: "Phase 3 Active",
    color: "bg-slate-800 text-indigo-300 font-semibold",
    bgGlow: "group-hover:border-slate-600",
  },
  {
    title: "Billing & Folios",
    description: "Invoices, payments & room charges",
    href: "/manager/billing",
    icon: Receipt,
    phase: "Phase 6 Active",
    color: "bg-slate-800 text-rose-300 font-semibold",
    bgGlow: "group-hover:border-slate-600",
  },
];

export default function ManagerQuickActions() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            Quick Actions
          </h3>
          <p className="text-xs text-slate-400">
            Direct shortcuts to hotel operational modules
          </p>
        </div>
        <span className="text-[11px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Manager Operations
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          const isPrimary = action.title === "+ Add Room";

          return (
            <Link
              key={action.title}
              href={action.href}
              className={`group p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                isPrimary
                  ? "bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-900 border-amber-500/30 hover:border-amber-500/60 shadow-lg shadow-amber-500/5"
                  : "bg-slate-900/60 border-slate-800 hover:bg-slate-900/90 hover:border-slate-700"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      isPrimary
                        ? "bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                        : "bg-slate-800 text-slate-300 border border-slate-700"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50">
                    {action.phase}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition">
                  {action.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {action.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-amber-400 transition">
                <span>Open module</span>
                <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
