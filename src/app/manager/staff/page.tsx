"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  Filter,
  UserCheck,
  UserX,
  Eye,
  Edit2,
  Phone,
  Mail,
  Copy,
  Check,
  KeyRound,
  AlertCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Calendar,
  Lock,
  ArrowUpDown,
  CheckCircle2,
  Building2,
  Info,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { IStaffMember, generateTemporaryPassword } from "@/types/staff";

export default function ManagerStaffPage() {
  const { token } = useUser();

  const [staffList, setStaffList] = useState<IStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [sortBy, setSortBy] = useState<"createdAt" | "name" | "isActive">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Quota & Counts
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [quota, setQuota] = useState<{
    allowed: boolean;
    current: number;
    max: number;
    planName: string;
  } | null>(null);

  // Add Staff Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Temporary Password Success Modal State
  const [createdStaffResult, setCreatedStaffResult] = useState<{
    name: string;
    email: string;
    temporaryPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Deactivate/Activate Modal State
  const [targetStaff, setTargetStaff] = useState<IStaffMember | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);

      const res = await fetch(`/api/manager/staff?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load staff members");
      }

      setStaffList(data.staff || []);
      setActiveCount(data.activeCount || 0);
      setInactiveCount(data.inactiveCount || 0);
      setQuota(data.quota || null);
    } catch (err: any) {
      setError(err.message || "Failed to load staff list");
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleOpenAddModal = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      password: generateTemporaryPassword(),
    });
    setCreateError(null);
    setIsAddModalOpen(true);
  };

  const handleGeneratePassword = () => {
    setFormData((prev) => ({
      ...prev,
      password: generateTemporaryPassword(),
    }));
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!formData.name.trim()) {
      setCreateError("Staff full name is required.");
      return;
    }
    if (!formData.email.trim()) {
      setCreateError("Staff email address is required.");
      return;
    }

    setIsCreating(true);

    try {
      const res = await fetch("/api/manager/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create staff account");
      }

      setIsAddModalOpen(false);
      setCreatedStaffResult({
        name: data.user.name,
        email: data.user.email,
        temporaryPassword: data.temporaryPassword,
      });

      fetchStaff();
    } catch (err: any) {
      setCreateError(err.message || "An error occurred while creating staff member");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdStaffResult) return;
    const textToCopy = `GrandStay Staff Credentials\nName: ${createdStaffResult.name}\nEmail: ${createdStaffResult.email}\nTemporary Password: ${createdStaffResult.temporaryPassword}\nNote: You will be asked to set a new password upon first sign-in.`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleToggleStatus = async () => {
    if (!targetStaff) return;
    setIsUpdatingStatus(true);
    setStatusActionError(null);

    try {
      const nextActiveState = !targetStaff.isActive;
      const res = await fetch(`/api/manager/staff/${targetStaff._id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: nextActiveState }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update staff status");
      }

      setIsStatusModalOpen(false);
      setTargetStaff(null);
      fetchStaff();
    } catch (err: any) {
      setStatusActionError(err.message || "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const totalMembers = activeCount + inactiveCount;
  const isAtQuota = quota ? quota.max !== -1 && quota.current >= quota.max : false;

  return (
    <div className="space-y-6">
      {/* Header & Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Staff Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Hotel Staff Members
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage staff accounts, credentials, and access for housekeeping and operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStaff}
            disabled={loading}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700/80 transition"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            disabled={isAtQuota}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-semibold rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff</span>
          </button>
        </div>
      </div>

      {/* Subscription Quota Usage Card */}
      {quota && (
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">Staff Plan Allocation</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700">
                  {quota.planName} Plan
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {quota.max === -1
                  ? "Unlimited staff members permitted on your plan"
                  : `${quota.current} of ${quota.max} active staff member accounts registered`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 min-w-[240px]">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-400 font-medium">Capacity Used</span>
                <span className="text-white font-semibold">
                  {quota.max === -1 ? "Unlimited" : `${Math.round((quota.current / quota.max) * 100)}%`}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isAtQuota
                      ? "bg-rose-500"
                      : (quota.current / (quota.max || 1)) > 0.8
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                  }`}
                  style={{
                    width: quota.max === -1 ? "25%" : `${Math.min(100, (quota.current / quota.max) * 100)}%`,
                  }}
                />
              </div>
            </div>
            {isAtQuota && (
              <span className="text-[11px] text-rose-400 font-bold px-2 py-1 bg-rose-500/10 border border-rose-500/30 rounded-lg whitespace-nowrap">
                Limit Reached
              </span>
            )}
          </div>
        </div>
      )}

      {/* KPI Overview Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Staff</p>
            <p className="text-2xl font-bold text-white mt-1">{totalMembers}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Active Staff</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Inactive Staff</p>
            <p className="text-2xl font-bold text-slate-400 mt-1">{inactiveCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <UserX className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/60 rounded-xl p-1 text-xs">
            <span className="px-2 text-slate-400 text-[11px] font-medium flex items-center gap-1">
              <Filter className="w-3 h-3" /> Status:
            </span>
            {(["ALL", "ACTIVE", "INACTIVE"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  statusFilter === st
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {st === "ALL" ? "All" : st === "ACTIVE" ? "Active" : "Inactive"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/60 rounded-xl p-1 text-xs">
            <span className="px-2 text-slate-400 text-[11px] font-medium flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none pr-2"
            >
              <option value="createdAt" className="bg-slate-900">Date Added</option>
              <option value="name" className="bg-slate-900">Name</option>
              <option value="isActive" className="bg-slate-900">Status</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="px-2 py-1 text-xs text-slate-400 hover:text-white rounded bg-slate-700/50"
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Staff Table / Loading / Empty State */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
            <p className="text-sm font-medium">Loading staff members...</p>
          </div>
        ) : staffList.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400 mx-auto mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">No staff members found</h3>
            <p className="text-slate-400 text-xs max-w-md mx-auto mt-1 mb-6">
              {search || statusFilter !== "ALL"
                ? "No staff members matched your current filter criteria."
                : "Add staff members to manage housekeeping and room service operations."}
            </p>
            {!search && statusFilter === "ALL" && (
              <button
                onClick={handleOpenAddModal}
                disabled={isAtQuota}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Staff Member</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Staff Member</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                {staffList.map((member) => (
                  <tr key={member._id} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-300 text-sm shadow-sm">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <Link
                            href={`/manager/staff/${member._id}`}
                            className="font-bold text-white hover:text-emerald-400 transition"
                          >
                            {member.name}
                          </Link>
                          {member.mustChangePassword && (
                            <span className="block text-[10px] text-amber-400 font-mono mt-0.5">
                              • First-login password pending
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          <span>{member.email}</span>
                        </div>
                        {member.phone ? (
                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{member.phone}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">No phone added</span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono text-[10px] font-bold">
                        <ShieldCheck className="w-3 h-3" />
                        STAFF
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      {member.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          INACTIVE
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-slate-400 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{new Date(member.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/manager/staff/${member._id}`}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/manager/staff/${member._id}/edit`}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                          title="Edit Profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => {
                            setTargetStaff(member);
                            setStatusActionError(null);
                            setIsStatusModalOpen(true);
                          }}
                          className={`p-1.5 rounded-lg border transition ${
                            member.isActive
                              ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30"
                              : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          }`}
                          title={member.isActive ? "Deactivate Staff" : "Reactivate Staff"}
                        >
                          {member.isActive ? (
                            <UserX className="w-3.5 h-3.5" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD STAFF MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  Add Hotel Staff Member
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Creates an account under your assigned hotel with role STAFF.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm p-1.5 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amit Kumar"
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
                  placeholder="e.g. amit@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                />
              </div>

              {/* Temporary Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Temporary Password
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerate
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-emerald-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3 text-slate-500" />
                  Staff must change this temporary password on their first login.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-semibold shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 disabled:opacity-60"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Create Staff Member</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEMPORARY PASSWORD CREDENTIALS PRESENTATION MODAL */}
      {createdStaffResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-900 border-b border-slate-800 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Staff Account Created</h3>
              <p className="text-xs text-slate-400 mt-1">
                Share these temporary credentials with the staff member.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Staff Name</span>
                  <p className="text-sm font-bold text-white">{createdStaffResult.name}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Login Email</span>
                  <p className="text-sm font-mono text-slate-200">{createdStaffResult.email}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Temporary Password</span>
                  <div className="flex items-center justify-between mt-1 p-2.5 rounded-lg bg-slate-900 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-sm">
                    <span>{createdStaffResult.temporaryPassword}</span>
                    <KeyRound className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  The staff member will be required to set a new password immediately upon first sign-in.
                </span>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={handleCopyCredentials}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Credentials</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setCreatedStaffResult(null)}
                  className="py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEACTIVATE / REACTIVATE CONFIRMATION MODAL */}
      {isStatusModalOpen && targetStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <div className="text-center mb-5">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
                  targetStaff.isActive
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                }`}
              >
                {targetStaff.isActive ? <UserX className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
              </div>
              <h3 className="text-lg font-bold text-white">
                {targetStaff.isActive ? "Deactivate Staff Member?" : "Reactivate Staff Member?"}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {targetStaff.isActive
                  ? `Are you sure you want to deactivate ${targetStaff.name}? They will not be able to log in to the system. All operational history remains preserved.`
                  : `Are you sure you want to reactivate ${targetStaff.name}? They will be permitted to log in again.`}
              </p>
            </div>

            {statusActionError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{statusActionError}</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsStatusModalOpen(false);
                  setTargetStaff(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={handleToggleStatus}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  targetStaff.isActive
                    ? "bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/20"
                    : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
                }`}
              >
                {isUpdatingStatus ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{targetStaff.isActive ? "Deactivate Account" : "Reactivate Account"}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
