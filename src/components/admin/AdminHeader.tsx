"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  ShieldCheck,
  User,
  Mail,
  LogOut,
  ExternalLink,
  Bell,
  Hotel,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

interface AdminHeaderProps {
  onMenuClick: () => void;
  isCollapsed: boolean;
}

export default function AdminHeader({ onMenuClick, isCollapsed }: AdminHeaderProps) {
  const router = useRouter();
  const { user, logout } = useUser();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <header
      className={`h-18 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 transition-all duration-300 ease-in-out px-4 sm:px-6 lg:px-8 flex items-center justify-between
        ${isCollapsed ? "lg:pl-24" : "lg:pl-68"}
      `}
    >
      {/* Left side: Mobile menu toggle + portal title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          aria-label="Open sidebar navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Platform Admin Control Center</span>
          </div>
        </div>
      </div>

      {/* Right side: Public Site + Profile + Logout */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Link
          href="/"
          target="_blank"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition"
        >
          <span>View Public Site</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </Link>

        {/* User Card */}
        <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-1.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-semibold text-white truncate max-w-[140px]">
              {user?.name || "System Admin"}
            </div>
            <div className="text-[10px] text-amber-300 font-mono">
              {user?.role || "SYSTEM_ADMIN"}
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 text-xs font-semibold border border-rose-500/30 transition shadow-sm"
          title="Sign out of admin session"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
