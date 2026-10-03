"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  ShieldCheck,
  Building,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Hotel as HotelIcon,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import ChangePasswordModal from "@/components/manager/ChangePasswordModal";

export default function ManagerSettingsPage() {
  const { user, token, login } = useUser();
  const [hotelInfo, setHotelInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user]);

  useEffect(() => {
    async function loadHotelData() {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch("/api/manager/hotel", { headers });
        const data = await res.json();
        if (res.ok && data.hotel) {
          setHotelInfo(data.hotel);
        }
      } catch (err) {
        console.error("Failed to load hotel profile:", err);
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      loadHotelData();
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name cannot be empty");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Update locally in UserContext
      if (user && token) {
        login(token, {
          ...user,
          name: name.trim(),
        });
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile name");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Manager Profile &amp; Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          View your manager credentials, tenant boundary assignments, and password security.
        </p>
      </div>

      {/* Success / Error alerts */}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Profile updated successfully.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Account Info Form Card */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl space-y-6">
        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2 border-b border-slate-800 pb-4">
          <User className="w-4 h-4 text-amber-400" />
          <span>Personal Account Information</span>
        </h2>

        <form onSubmit={handleUpdateName} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Manager Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition"
              />
            </div>

            {/* Email Address (Read-only) */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full px-4 py-2.5 bg-slate-800/30 border border-slate-800 rounded-xl text-slate-400 text-sm cursor-not-allowed"
                />
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-3.5" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Managed by System Administrator
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 active:scale-[0.99] text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/20 transition flex items-center gap-2 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Profile Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Tenant Boundary & Permissions (Read-only security card) */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl space-y-5">
        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2 border-b border-slate-800 pb-4">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>Role Permissions &amp; Tenant Boundary</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
              Assigned Role
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">MANAGER</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
                Hotel-Level
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
              Assigned Hotel
            </span>
            <p className="font-bold text-white text-sm truncate">
              {hotelInfo?.name || user?.hotelName || "Grand Royale Hotel"}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
              Property Location
            </span>
            <p className="font-medium text-slate-300 text-sm truncate">
              {hotelInfo?.city ? `${hotelInfo.city}${hotelInfo.state ? `, ${hotelInfo.state}` : ""}` : (hotelInfo?.address || "Dehradun, Uttarakhand")}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Tenant Boundary Notice:</strong> Role assignments, hotel mappings, and subscription tiers are governed by the Platform System Administrator and cannot be modified at the hotel manager level.
          </span>
        </div>
      </div>

      {/* Password & Security Card */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Password &amp; Authentication</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Keep your credentials secure. You can update your password at any time.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsPasswordModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-2 self-start sm:self-auto"
        >
          <span>Change Password</span>
          <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
        </button>
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </main>
  );
}
