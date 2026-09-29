"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Mail,
  LogOut,
  Hotel,
  CheckSquare,
  Sparkles,
  Clock,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Wrench,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { USER_ROLES } from "@/types/roles";

export default function StaffDashboardPage() {
  const router = useRouter();
  const { user, logout, isLoading } = useUser();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (
        user.role !== USER_ROLES.STAFF &&
        user.role !== USER_ROLES.SYSTEM_ADMIN &&
        user.role !== USER_ROLES.MANAGER
      ) {
        router.push("/");
      }
    }
  }, [user, isLoading, router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p className="text-sm font-medium">Verifying Staff Credentials...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-300 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20">
              <Hotel className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">
                  Grand Royale
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-400/10 text-emerald-300 border border-emerald-400/20">
                  Staff Operations
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Housekeeping &amp; Maintenance Tasks
              </p>
            </div>
          </div>

          {/* User Info & Logout Button */}
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3.5 py-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <User className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white truncate max-w-[130px] sm:max-w-[180px]">
                    {user.name}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {user.role}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono truncate max-w-[130px] sm:max-w-[180px]">
                  <Mail className="w-3 h-3 text-slate-500" />
                  <span>{user.email}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 text-xs font-semibold border border-rose-500/30 transition shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500/15 via-slate-900 to-slate-950 border border-emerald-500/20 p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-xs font-medium mb-3">
                <Wrench className="w-3.5 h-3.5" />
                <span>Housekeeping &amp; Staff Operations • Role: {user.role}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome, {user.name}
              </h1>
              <p className="text-slate-400 text-sm mt-1 max-w-2xl">
                Logged in as <strong className="text-slate-200">{user.email}</strong>. View and update room cleaning statuses, service tasks, and maintenance issues.
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition flex items-center gap-2 self-start md:self-auto"
            >
              <span>Public Site</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Staff Task Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Assigned Rooms</span>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-white mt-2">14</p>
            <span className="text-[11px] text-emerald-400 mt-1 inline-block">Floor 3 &amp; Floor 4</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Cleaned &amp; Ready</span>
              <CheckSquare className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-2xl font-bold text-white mt-2">9</p>
            <span className="text-[11px] text-cyan-400 mt-1 inline-block">Approved by Supervisor</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">In Progress</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-white mt-2">5</p>
            <span className="text-[11px] text-amber-400 mt-1 inline-block">Est. completion: 45 min</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Maintenance Flags</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl font-bold text-white mt-2">2</p>
            <span className="text-[11px] text-rose-400 mt-1 inline-block">Room 304 (AC filter)</span>
          </div>
        </div>
      </main>
    </div>
  );
}
