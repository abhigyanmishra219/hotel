"use client";

import React, { useState } from "react";
import {
  User,
  Mail,
  Building2,
  Shield,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Sparkles,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import StaffSidebar from "@/components/staff/StaffSidebar";
import StaffHeader from "@/components/staff/StaffHeader";

export default function StaffProfilePage() {
  const { user, token, login } = useUser();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [profileData, setProfileData] = useState<{
    user?: { name: string; email: string; role: string; shift?: string };
    hotel?: { name: string; address?: string; city?: string; state?: string; country?: string; phone?: string };
  } | null>(null);

  React.useEffect(() => {
    async function loadProfile() {
      try {
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch("/api/staff/profile", { headers });
        if (res.ok) {
          const data = await res.json();
          setProfileData(data);
        }
      } catch {
        // Fallback to user context
      }
    }
    loadProfile();
  }, [token]);

  // Password change state
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.currentPassword) {
      setError("Please enter your current password.");
      return;
    }

    if (!formData.newPassword) {
      setError("Please enter a new password.");
      return;
    }

    if (formData.newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers,
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to change password.");
      }

      login(data.token, data.user);
      setSuccess("Password updated successfully.");
      setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      setError(err.message || "An error occurred while updating your password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex selection:bg-emerald-500 selection:text-slate-950">
      <StaffSidebar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        <StaffHeader
          onMenuClick={() => setIsMobileOpen(true)}
          title="My Profile"
          subtitle="Staff credentials and account security settings"
        />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500/15 via-slate-900 to-slate-950 border border-emerald-500/20 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-2xl shadow-lg shadow-emerald-500/10">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "S"}
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-xs font-semibold mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Staff Account</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                    {user?.name || "Staff Member"}
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account Details (Read-only) */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
                  <User className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-base font-bold text-white">Account Information</h2>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                      Full Name
                    </label>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-white font-medium">
                      {user?.name || "Staff"}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                      Email Address
                    </label>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-white font-mono">
                      {user?.email || "staff@hotel.com"}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                      Role & Permissions
                    </label>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="font-bold text-emerald-300">STAFF</span>
                      <span className="text-[10px] font-mono text-slate-400">Read-Only</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                      Assigned Shift
                    </label>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="text-white font-medium">
                        {profileData?.user?.shift || (user as any)?.shift || "09:00 AM - 06:00 PM (General Shift)"}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">Read-Only</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                      Assigned Hotel Property
                    </label>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-amber-400" />
                        <span className="text-white font-medium">
                          {profileData?.hotel?.name || user?.hotelName || "Grand Royale Hotel"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">Strictly Isolated</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Account identity and tenant mapping are managed by your Hotel Manager.</span>
              </div>
            </div>

            {/* Change Password Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">Change Password</h2>
              </div>

              {error && (
                <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="currentPassword"
                    className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5"
                  >
                    Current Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      required
                      placeholder="Enter current password"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      className="w-full pl-10 pr-11 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-400 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-emerald-400 transition"
                      aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="newPassword"
                    className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="newPassword"
                      name="newPassword"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Minimum 8 characters"
                      value={formData.newPassword}
                      onChange={handleChange}
                      className="w-full pl-10 pr-11 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-400 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-emerald-400 transition"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      placeholder="Repeat new password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full pl-10 pr-11 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-400 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-emerald-400 transition"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
