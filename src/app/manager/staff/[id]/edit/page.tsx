"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  ArrowLeft,
  Save,
  AlertCircle,
  Loader2,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditStaffPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { token } = useUser();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    isActive: true,
    role: "STAFF",
    hotelName: "",
    hotelCode: "",
  });

  useEffect(() => {
    const fetchStaff = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/manager/staff/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load staff member");
        }

        const s = data.staff;
        setFormData({
          name: s.name,
          email: s.email,
          phone: s.phone || "",
          isActive: Boolean(s.isActive),
          role: s.role || "STAFF",
          hotelName: s.hotelName || "Your Hotel",
          hotelCode: s.hotelCode || "HOT-000000",
        });
      } catch (err: any) {
        setError(err.message || "Failed to load staff member");
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, [id, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Full Name is required.");
      return;
    }

    if (!formData.email.trim()) {
      setError("Email Address is required.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/manager/staff/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          isActive: formData.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update staff member");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/manager/staff/${id}`);
      }, 700);
    } catch (err: any) {
      setError(err.message || "Failed to update staff member");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p className="text-sm font-medium">Loading staff profile for editing...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href={`/manager/staff/${id}`}
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Staff Profile</span>
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
          <Users className="w-4 h-4" />
          <span>Edit Staff Account</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Update Profile: {formData.name}
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Modify contact details and account status. Role and hotel tenancy are strictly enforced.
        </p>
      </div>

      {/* Edit Form */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Staff profile updated successfully! Redirecting...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
          </div>

          {/* Active Status Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Account Access Status
            </label>
            <div className="flex items-center gap-3 bg-slate-800/40 border border-slate-700/60 p-3 rounded-xl">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-400 focus:ring-offset-slate-900"
              />
              <label htmlFor="isActive" className="text-xs text-slate-300 cursor-pointer select-none">
                <span className="font-semibold text-white">
                  {formData.isActive ? "Active Account" : "Inactive / Suspended Account"}
                </span>
                <span className="block text-slate-400 text-[11px] mt-0.5">
                  {formData.isActive
                    ? "Staff member can log in and view assigned tasks."
                    : "Staff member login will be prevented."}
                </span>
              </label>
            </div>
          </div>

          {/* Read-only Security Controls (Role & Hotel) */}
          <div className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] text-slate-400 uppercase font-semibold block mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                Assigned Role (Read-Only)
              </span>
              <div className="px-3 py-2 bg-slate-800/40 border border-slate-700/40 rounded-xl text-xs font-mono text-emerald-300 font-bold flex items-center justify-between">
                <span>{formData.role}</span>
                <Lock className="w-3.5 h-3.5 text-slate-500" />
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 uppercase font-semibold block mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                Hotel Tenant (Read-Only)
              </span>
              <div className="px-3 py-2 bg-slate-800/40 border border-slate-700/40 rounded-xl text-xs text-slate-300 font-semibold flex items-center justify-between">
                <span className="truncate">{formData.hotelName}</span>
                <Lock className="w-3.5 h-3.5 text-slate-500" />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <Link
              href={`/manager/staff/${id}`}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || success}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
