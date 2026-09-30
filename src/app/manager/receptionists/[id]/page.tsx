"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  UserX,
  ArrowLeft,
  Edit2,
  Mail,
  Phone,
  Building2,
  Calendar,
  Clock,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ReceptionistDetailsPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { token } = useUser();

  const [receptionist, setReceptionist] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/manager/receptionists/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Receptionist not found or access denied");
      }

      setReceptionist(data.receptionist);
    } catch (err: any) {
      setError(err.message || "Failed to load receptionist details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id, token]);

  const handleToggleStatus = async () => {
    if (!receptionist) return;
    setIsUpdatingStatus(true);
    setStatusError(null);

    try {
      const nextActiveState = !receptionist.isActive;
      const res = await fetch(`/api/manager/receptionists/${receptionist._id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: nextActiveState }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      setIsStatusModalOpen(false);
      fetchDetails();
    } catch (err: any) {
      setStatusError(err.message || "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
        <p className="text-sm font-medium">Loading receptionist profile...</p>
      </div>
    );
  }

  if (error || !receptionist) {
    return (
      <div className="max-w-2xl mx-auto p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Receptionist Not Found</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-6">
          {error || "This receptionist account does not exist or does not belong to your hotel property."}
        </p>
        <Link
          href="/manager/receptionists"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Receptionists</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/manager/receptionists"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Receptionists</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setStatusError(null);
              setIsStatusModalOpen(true);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
              receptionist.isActive
                ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30"
                : "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
            }`}
          >
            {receptionist.isActive ? (
              <>
                <UserX className="w-3.5 h-3.5" />
                <span>Deactivate Receptionist</span>
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                <span>Reactivate Receptionist</span>
              </>
            )}
          </button>

          <Link
            href={`/manager/receptionists/${receptionist._id}/edit`}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </Link>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-400 text-slate-950 flex items-center justify-center font-extrabold text-2xl sm:text-3xl shadow-lg shadow-cyan-500/25">
            {receptionist.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                {receptionist.role}
              </span>
              {receptionist.isActive ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ACTIVE
                </span>
              ) : (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  INACTIVE
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {receptionist.name}
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{receptionist.email}</p>
          </div>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact & Credentials */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Front Desk Identity &amp; Credentials</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium block mb-1">Full Name</span>
              <p className="text-sm font-semibold text-white">{receptionist.name}</p>
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1">Email Address</span>
              <div className="flex items-center gap-2 text-slate-200">
                <Mail className="w-4 h-4 text-slate-500" />
                <span className="font-mono">{receptionist.email}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1">Phone Number</span>
              <div className="flex items-center gap-2 text-slate-200">
                <Phone className="w-4 h-4 text-slate-500" />
                <span>{receptionist.phone || "No phone number registered"}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1">First-Login Password Status</span>
              {receptionist.mustChangePassword ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400/10 text-amber-300 border border-amber-400/20 font-semibold text-[11px]">
                  <KeyRound className="w-3.5 h-3.5" />
                  Temporary Password Active (Reset Required)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Password Configured by Receptionist
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Property & Multi-Tenant Mapping */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span>Property &amp; Tenant Assignment</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium block mb-1">Hotel Property</span>
              <p className="text-sm font-semibold text-white">{receptionist.hotelName || "Your Hotel"}</p>
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1">Hotel Business Code</span>
              <span className="font-mono text-cyan-400 font-semibold bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700 inline-block">
                {receptionist.hotelCode || "HOT-000001"}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1">Account Created Date</span>
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>{new Date(receptionist.createdAt).toLocaleDateString()} at {new Date(receptionist.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1">Last Updated</span>
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>{new Date(receptionist.updatedAt || receptionist.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRM STATUS MODAL */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <div className="text-center mb-5">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
                  receptionist.isActive
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                }`}
              >
                {receptionist.isActive ? <UserX className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
              </div>
              <h3 className="text-lg font-bold text-white">
                {receptionist.isActive ? `Deactivate ${receptionist.name}?` : `Reactivate ${receptionist.name}?`}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {receptionist.isActive
                  ? "They will no longer be able to log in to the Front Desk portal. All guest booking records will remain intact."
                  : "This will restore front desk portal access for the receptionist."}
              </p>
            </div>

            {statusError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{statusError}</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={handleToggleStatus}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  receptionist.isActive
                    ? "bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/20"
                    : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20"
                }`}
              >
                {isUpdatingStatus ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{receptionist.isActive ? "Deactivate Account" : "Reactivate Account"}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
