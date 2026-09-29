"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Mail,
  LogOut,
  Hotel as HotelIcon,
  TrendingUp,
  CalendarCheck,
  DollarSign,
  Users,
  BedDouble,
  Loader2,
  ChevronRight,
  Briefcase,
  MapPin,
  Building2,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { USER_ROLES } from "@/types/roles";

export default function ManagerDashboardPage() {
  const router = useRouter();
  const { user, token, logout, isLoading } = useUser();
  const [assignedHotel, setAssignedHotel] = useState<any>(null);
  const [loadingHotel, setLoadingHotel] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (
        user.role !== USER_ROLES.MANAGER &&
        user.role !== USER_ROLES.SYSTEM_ADMIN
      ) {
        router.push("/");
      }
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    async function loadHotelInfo() {
      if (!token || !user?.hotelId) {
        setLoadingHotel(false);
        return;
      }

      try {
        const res = await fetch("/api/manager/hotel", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (res.ok) {
          setAssignedHotel(data.hotel);
        }
      } catch (err) {
        console.error("Failed to load hotel info:", err);
      } finally {
        setLoadingHotel(false);
      }
    }

    if (user && token) {
      loadHotelInfo();
    }
  }, [user, token]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
        <p className="text-sm font-medium">Verifying Manager Credentials...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-300 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20">
              <HotelIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">
                  {assignedHotel ? assignedHotel.name : "Grand Royale"}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-indigo-400/10 text-indigo-300 border border-indigo-400/20">
                  Manager Portal
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                {assignedHotel
                  ? `Hotel Code: ${assignedHotel.hotelCode} • Status: ${assignedHotel.status}`
                  : "Operations & Revenue Management"}
              </p>
            </div>
          </div>

          {/* User Info & Logout Button */}
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3.5 py-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <User className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white truncate max-w-[130px] sm:max-w-[180px]">
                    {user.name}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500/15 via-slate-900 to-slate-950 border border-indigo-500/20 p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-400/10 border border-indigo-400/20 text-indigo-300 text-xs font-medium mb-3">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Manager Dashboard • Role: {user.role}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome back, {user.name}
              </h1>
              <p className="text-slate-400 text-sm mt-1 max-w-2xl">
                Logged in as <strong className="text-slate-200">{user.email}</strong>. Assigned to{" "}
                <strong className="text-amber-400">
                  {assignedHotel ? `${assignedHotel.name} (${assignedHotel.hotelCode})` : "your designated hotel"}
                </strong>.
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

        {/* Assigned Hotel Details Card */}
        {assignedHotel && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Your Assigned Hotel Tenant</h3>
                  <p className="text-xs text-slate-400">Verified tenant authorization</p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-amber-400/10 text-amber-400 border border-amber-400/20">
                {assignedHotel.hotelCode}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                <span className="text-slate-400 block mb-0.5">Hotel Name</span>
                <span className="font-semibold text-white text-sm">{assignedHotel.name}</span>
              </div>
              <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                <span className="text-slate-400 block mb-0.5">Official Email</span>
                <span className="font-mono text-slate-200">{assignedHotel.email}</span>
              </div>
              <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                <span className="text-slate-400 block mb-0.5">Location</span>
                <span className="text-slate-200 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  {assignedHotel.city || "N/A"}, {assignedHotel.state || "N/A"} ({assignedHotel.country || "USA"})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Manager KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Monthly Revenue</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-white mt-2">$128,450</p>
            <span className="text-[11px] text-emerald-400 mt-1 inline-flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +14.2% vs target
            </span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Occupancy Rate</span>
              <BedDouble className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-2xl font-bold text-white mt-2">71.0%</p>
            <span className="text-[11px] text-slate-400 mt-1 inline-block">88 of 124 rooms booked</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Bookings</span>
              <CalendarCheck className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-white mt-2">342</p>
            <span className="text-[11px] text-emerald-400 mt-1 inline-block">+28 this week</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Active Staff</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-2xl font-bold text-white mt-2">16</p>
            <span className="text-[11px] text-slate-400 mt-1 inline-block">All departments staffed</span>
          </div>
        </div>
      </main>
    </div>
  );
}
