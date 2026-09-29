"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  User,
  Mail,
  LogOut,
  UserPlus,
  LogIn,
  Hotel,
  LayoutDashboard,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { USER_ROLES, getRoleDashboardPath } from "@/types/roles";

export default function Home() {
  const { user, logout, isLoading } = useUser();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
              <Hotel className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white">
                Grand Royale
              </span>
              <span className="hidden sm:inline-block text-xs text-amber-400 font-medium ml-2 px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20">
                Hotel Suite
              </span>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="text-xs text-slate-400">Loading...</div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right mr-1">
                  <span className="text-xs font-semibold text-white">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-amber-400 font-semibold tracking-wide">
                    {user.role}
                  </span>
                </div>

                <Link
                  href={getRoleDashboardPath(user.role)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </Link>

                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>

                <Link
                  href="/register"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-semibold text-xs shadow-md shadow-amber-500/20 transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col justify-center">
        {user ? (
          /* Active User View */
          <div className="max-w-2xl mx-auto w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-4 border-b border-slate-800 pb-6 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <User className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                  <CheckCircle className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {user.role}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                <span className="text-xs text-slate-400 block mb-1">
                  Email Address
                </span>
                <div className="flex items-center gap-2 text-slate-200 font-mono text-sm">
                  <Mail className="w-4 h-4 text-amber-400" />
                  <span>{user.email}</span>
                </div>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                <span className="text-xs text-slate-400 block mb-1">
                  Access Level
                </span>
                <p className="text-sm text-slate-300">
                  You are authenticated with full{" "}
                  <strong className="text-amber-400">SYSTEM_ADMIN</strong> privileges.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap gap-4 justify-between items-center">
              <Link
                href={getRoleDashboardPath(user.role)}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-amber-500/20"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Open {user.role} Dashboard</span>
              </Link>
              <button
                onClick={logout}
                className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-xl text-xs font-medium transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          /* Guest Hero View */
          <div className="text-center max-w-3xl mx-auto space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Next.js 16 • MongoDB • JWT Authentication</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Luxury Hotel Management &amp;{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
                Administration
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto">
              Welcome to the Grand Royale management platform. Sign in to your portal or create a new administrator account.
            </p>

            {/* Quick Action CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700 transition text-sm flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4 text-amber-400" />
                <span>Sign In to Portal</span>
              </Link>

              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/25 transition text-sm flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Admin Account</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
