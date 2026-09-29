"use client";

import React, { useState } from "react";
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Database,
  Key,
  Save,
  CheckCircle,
  Lock,
  User,
  Mail,
  Server,
  Globe,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export default function AdminSettingsPage() {
  const { user } = useUser();
  const [saved, setSaved] = useState(false);

  const [settings, setSettings] = useState({
    platformName: "Grand Royale Hotel Suite",
    supportEmail: "support@grandroyale.com",
    sessionExpiryDays: "7",
    enableAutoHotelCodes: true,
    hotelCodePrefix: "HOT-",
    enforceStrongPasswords: true,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <AdminPageHeader
        title="Platform Settings"
        subtitle="System configurations, security policies, and platform defaults"
        badge="Configuration"
      />

      {saved && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Platform configuration saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Administrator Profile Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                System Administrator Profile
              </h2>
              <p className="text-xs text-slate-400">Active root session identity</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/50">
              <span className="text-slate-400 block mb-1">Admin Name</span>
              <span className="text-white font-semibold">{user?.name || "Abhigyan Mishra"}</span>
            </div>
            <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/50">
              <span className="text-slate-400 block mb-1">Email</span>
              <span className="text-slate-200 font-mono">{user?.email || "admin@hotel.com"}</span>
            </div>
            <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/50">
              <span className="text-slate-400 block mb-1">Assigned Security Role</span>
              <span className="text-amber-400 font-bold">{user?.role || "SYSTEM_ADMIN"}</span>
            </div>
            <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/50">
              <span className="text-slate-400 block mb-1">Tenant Scope</span>
              <span className="text-emerald-400 font-semibold">Global (All Hotels)</span>
            </div>
          </div>
        </div>

        {/* System & Architecture Policies */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                SaaS System Parameters
              </h2>
              <p className="text-xs text-slate-400">Multi-tenant defaults and session security</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                SaaS Platform Brand Name
              </label>
              <input
                type="text"
                value={settings.platformName}
                onChange={(e) =>
                  setSettings({ ...settings, platformName: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-400/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Platform Support Email
              </label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) =>
                  setSettings({ ...settings, supportEmail: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-400/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                JWT Session Expiry (Days)
              </label>
              <input
                type="number"
                value={settings.sessionExpiryDays}
                onChange={(e) =>
                  setSettings({ ...settings, sessionExpiryDays: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-400/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Hotel Code Auto Prefix
              </label>
              <input
                type="text"
                value={settings.hotelCodePrefix}
                onChange={(e) =>
                  setSettings({ ...settings, hotelCodePrefix: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs font-mono focus:ring-2 focus:ring-amber-400/50"
              />
            </div>
          </div>
        </div>

        {/* Database & Infrastructure Status */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Database &amp; Engine Status
              </h2>
              <p className="text-xs text-slate-400">Underlying MongoDB connection cluster</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
              <span className="text-slate-400 block mb-1">Database Engine</span>
              <span className="text-white font-semibold">MongoDB Atlas v8.0</span>
            </div>
            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
              <span className="text-slate-400 block mb-1">Connection State</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Connected
              </span>
            </div>
            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
              <span className="text-slate-400 block mb-1">Permanent Roles</span>
              <span className="text-amber-300 font-mono">4 Hardcoded Roles</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </main>
  );
}
