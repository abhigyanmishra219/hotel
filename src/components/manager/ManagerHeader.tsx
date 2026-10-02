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
  Hotel as HotelIcon,
  Sparkles,
  Building,
  KeyRound,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

interface ManagerHeaderProps {
  onMenuClick: () => void;
  isCollapsed: boolean;
  hotelName?: string;
  hotelCode?: string;
  isInactive?: boolean;
}

export default function ManagerHeader({
  onMenuClick,
  isCollapsed,
  hotelName,
  hotelCode,
  isInactive = false,
}: ManagerHeaderProps) {
  const router = useRouter();
  const { user, logout } = useUser();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <header
      className={`h-18 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 transition-all duration-300 ease-in-out px-4 sm:px-6 lg:px-8 flex items-center justify-between print:hidden
        ${isCollapsed ? "lg:pl-24" : "lg:pl-68"}
      `}
    >
      {/* Left Side: Mobile Menu Button + Portal / Hotel Badge */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          aria-label="Open sidebar navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-semibold">
            <HotelIcon className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline truncate max-w-[150px] sm:max-w-[200px]">
              {hotelName || "Grand Royale"}
            </span>
            <span className="font-mono text-[10px] text-amber-400/80 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/30">
              {hotelCode || (user?.hotelId ? `HOT-${String(user.hotelId).slice(-6).toUpperCase()}` : "HOTEL")}
            </span>
          </div>

          {isInactive && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
              Inactive Hotel
            </span>
          )}
        </div>
      </div>

      {/* Right Side: Manager Identity Card + Logout */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Manager User Info Card */}
        <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-1.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white truncate max-w-[120px] md:max-w-[160px]">
                {user?.name || "Manager"}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
                MANAGER
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
              {user?.email}
            </div>
          </div>
        </div>

        {/* Change Password quick button if needed */}
        <Link
          href="/change-password"
          className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition"
          title="Update Password"
        >
          <KeyRound className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden lg:inline">Password</span>
        </Link>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 text-xs font-semibold border border-rose-500/30 transition shadow-sm"
          title="Sign out of manager session"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
