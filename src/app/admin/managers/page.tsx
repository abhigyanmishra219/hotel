"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  UserCheck,
  Search,
  Filter,
  Plus,
  Hotel,
  Mail,
  Key,
  UserX,
  Loader2,
  Copy,
  Check,
  Building2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";

interface ManagerRow {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  hotelId?: {
    _id: string;
    name: string;
    hotelCode: string;
    city?: string;
  } | null;
}

export default function AdminManagersPage() {
  const { token } = useUser();
  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: "",
    email: "",
    hotelId: "",
    password: "",
  });
  const [resetResult, setResetResult] = useState<{
    email: string;
    tempPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchManagers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/managers?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load managers");
      setManagers(data.managers || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, token]);

  const fetchHotels = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/hotels", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setHotels(data.hotels || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchManagers();
      fetchHotels();
    }
  }, [fetchManagers, fetchHotels, token]);

  const handleResetPassword = async (hotelId: string, managerId: string, email: string) => {
    if (!confirm(`Reset password for ${email}?`)) return;

    try {
      const res = await fetch(`/api/admin/hotels/${hotelId}/manager`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "reset-password",
          managerId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      setResetResult({
        email,
        tempPassword: data.temporaryPassword,
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleActive = async (hotelId: string, managerId: string) => {
    try {
      const res = await fetch(`/api/admin/hotels/${hotelId}/manager`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "toggle-status",
          managerId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      setManagers((prev) =>
        prev.map((m) =>
          m._id === managerId ? { ...m, isActive: data.isActive } : m
        )
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.hotelId) {
      alert("Please select a hotel for this manager");
      return;
    }

    try {
      const res = await fetch(`/api/admin/hotels/${addFormData.hotelId}/manager`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "create",
          name: addFormData.name,
          email: addFormData.email,
          password: addFormData.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create manager");

      setResetResult({
        email: data.manager.email,
        tempPassword: data.temporaryPassword,
      });

      setIsAddOpen(false);
      setAddFormData({ name: "", email: "", hotelId: "", password: "" });
      fetchManagers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <AdminPageHeader
        title="General Managers"
        subtitle="Manage authorized General Managers across all registered hotel properties"
        badge="Manager Management"
        actions={
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Manager</span>
          </button>
        }
      />

      {/* Password Reset Alert */}
      {resetResult && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-amber-300 block">
              Temporary Password Generated for {resetResult.email}:
            </span>
            <span className="font-mono text-amber-200 text-sm font-bold">
              {resetResult.tempPassword}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => copyToClipboard(resetResult.tempPassword)}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
            <button
              onClick={() => setResetResult(null)}
              className="text-slate-400 hover:text-white text-xs px-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/60 border border-slate-800 rounded-2xl p-3 sm:p-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search managers by name, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/60 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:ring-2 focus:ring-amber-400/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-200 text-xs font-medium focus:ring-2 focus:ring-amber-400/50"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DISABLED">DISABLED</option>
          </select>

          <button
            onClick={fetchManagers}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-slate-300"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Managers Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase font-semibold tracking-wider">
                <th className="py-3.5 px-4">Manager</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Associated Hotel</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto mb-2" />
                    Loading managers...
                  </td>
                </tr>
              ) : managers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <UserCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-medium text-slate-300">No managers found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Create an initial manager when provisioning a new hotel or click &ldquo;+ Create Manager&rdquo;.
                    </p>
                  </td>
                </tr>
              ) : (
                managers.map((mgr) => (
                  <tr key={mgr._id} className="hover:bg-slate-800/40 transition">
                    <td className="py-4 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                          {mgr.name.charAt(0)}
                        </div>
                        <span>{mgr.name}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono text-slate-300">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>{mgr.email}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      {mgr.hotelId ? (
                        <Link
                          href={`/admin/hotels/${mgr.hotelId._id}`}
                          className="hover:underline inline-flex items-center gap-1.5 text-amber-400 font-medium"
                        >
                          <Building2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>{mgr.hotelId.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ({mgr.hotelId.hotelCode})
                          </span>
                        </Link>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <AdminStatusBadge
                        status={mgr.isActive ? "ACTIVE" : "DISABLED"}
                      />
                    </td>

                    <td className="py-4 px-4 text-slate-400">
                      {new Date(mgr.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {mgr.hotelId && (
                          <Link
                            href={`/admin/hotels/${mgr.hotelId._id}`}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition"
                          >
                            View
                          </Link>
                        )}

                        {mgr.hotelId && (
                          <button
                            onClick={() =>
                              handleResetPassword(
                                mgr.hotelId!._id,
                                mgr._id,
                                mgr.email
                              )
                            }
                            className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-medium transition"
                            title="Reset password"
                          >
                            <Key className="w-3 h-3 inline mr-1" />
                            Reset
                          </button>
                        )}

                        {mgr.hotelId && (
                          <button
                            onClick={() =>
                              handleToggleActive(mgr.hotelId!._id, mgr._id)
                            }
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition border ${
                              mgr.isActive
                                ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30"
                                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            }`}
                          >
                            {mgr.isActive ? "Disable" : "Reactivate"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Manager Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-400" />
                <span>Create General Manager</span>
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManager} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Assign To Hotel Property *
                </label>
                <select
                  required
                  value={addFormData.hotelId}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, hotelId: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-400/50"
                >
                  <option value="">-- Select a Hotel Tenant --</option>
                  {hotels.map((h) => (
                    <option key={h._id} value={h._id}>
                      {h.name} ({h.hotelCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Manager Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={addFormData.name}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-400/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Manager Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="manager@hotel.com"
                  value={addFormData.email}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-400/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Temporary Password (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Leave empty for auto-generated password"
                  value={addFormData.password}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-400/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs rounded-xl"
                >
                  Create Manager
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
