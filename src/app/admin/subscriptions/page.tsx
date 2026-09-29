"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Layers,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  DollarSign,
  Building,
  Users,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Sparkles,
  Check,
  AlertCircle,
  HelpCircle,
  FileSpreadsheet,
  ToggleLeft,
  ToggleRight,
  Infinity as InfinityIcon,
  Tag,
  ArrowUpDown,
  Sliders,
  Calendar,
  Eye,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { ISubscriptionPlanResponse, ICreatePlanInput, AVAILABLE_FEATURES } from "@/types/subscription";

// Feature icon mapping helper
const FEATURE_ICONS: Record<string, string> = {
  booking: "🛎️",
  billing: "💳",
  roomService: "🍽️",
  reports: "📊",
  analytics: "📈",
};

export default function SubscriptionPlansManagementPage() {
  const { token } = useUser();
  const [plans, setPlans] = useState<ISubscriptionPlanResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ISubscriptionPlanResponse | null>(null);
  const [deleteModalPlan, setDeleteModalPlan] = useState<ISubscriptionPlanResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const initialFormState: ICreatePlanInput & {
    unlimitedRooms: boolean;
    unlimitedStaff: boolean;
    unlimitedReceptionists: boolean;
    customFeatureInput: string;
  } = {
    name: "",
    description: "",
    monthlyPrice: 99,
    yearlyPrice: 990,
    maxRooms: 25,
    maxStaff: 10,
    maxReceptionists: 3,
    features: ["booking", "billing"],
    status: "ACTIVE",
    unlimitedRooms: false,
    unlimitedStaff: false,
    unlimitedReceptionists: false,
    customFeatureInput: "",
  };

  const [formData, setFormData] = useState(initialFormState);

  // Fetch plans from API
  const fetchPlans = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/admin/subscriptions/plans", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch subscription plans");
      }

      setPlans(data.plans || []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Could not load subscription plans");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Handle open create modal
  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData(initialFormState);
    setErrorMsg(null);
    setIsCreateModalOpen(true);
  };

  // Handle open edit modal
  const openEditModal = (plan: ISubscriptionPlanResponse) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
      maxRooms: plan.maxRooms === -1 ? 0 : plan.maxRooms,
      maxStaff: plan.maxStaff === -1 ? 0 : plan.maxStaff,
      maxReceptionists: plan.maxReceptionists === -1 ? 0 : plan.maxReceptionists,
      features: [...plan.features],
      status: plan.status,
      unlimitedRooms: plan.maxRooms === -1,
      unlimitedStaff: plan.maxStaff === -1,
      unlimitedReceptionists: plan.maxReceptionists === -1,
      customFeatureInput: "",
    });
    setErrorMsg(null);
    setIsCreateModalOpen(true);
  };

  // Feature toggle helper
  const toggleFeature = (featureKey: string) => {
    setFormData((prev) => {
      const exists = prev.features.includes(featureKey);
      return {
        ...prev,
        features: exists
          ? prev.features.filter((f) => f !== featureKey)
          : [...prev.features, featureKey],
      };
    });
  };

  // Add custom feature tag
  const addCustomFeature = () => {
    const trimmed = formData.customFeatureInput.trim();
    if (!trimmed) return;
    if (!formData.features.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        features: [...prev.features, trimmed],
        customFeatureInput: "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, customFeatureInput: "" }));
    }
  };

  // Remove feature tag
  const removeFeature = (featureKey: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((f) => f !== featureKey),
    }));
  };

  // Form submit handler (Create & Edit)
  const handleSubmitPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Client-side validations
    if (!formData.name.trim()) {
      setErrorMsg("Plan name is required");
      return;
    }
    if (formData.monthlyPrice < 0) {
      setErrorMsg("Monthly price cannot be negative");
      return;
    }
    if (formData.yearlyPrice < 0) {
      setErrorMsg("Yearly price cannot be negative");
      return;
    }
    if (!formData.unlimitedRooms && formData.maxRooms < 0) {
      setErrorMsg("Maximum rooms limit cannot be negative");
      return;
    }
    if (!formData.unlimitedStaff && formData.maxStaff < 0) {
      setErrorMsg("Maximum staff limit cannot be negative");
      return;
    }
    if (!formData.unlimitedReceptionists && formData.maxReceptionists < 0) {
      setErrorMsg("Maximum receptionists limit cannot be negative");
      return;
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description?.trim() || "",
      monthlyPrice: Number(formData.monthlyPrice),
      yearlyPrice: Number(formData.yearlyPrice),
      maxRooms: formData.unlimitedRooms ? -1 : Number(formData.maxRooms),
      maxStaff: formData.unlimitedStaff ? -1 : Number(formData.maxStaff),
      maxReceptionists: formData.unlimitedReceptionists ? -1 : Number(formData.maxReceptionists),
      features: formData.features,
      status: formData.status,
    };

    try {
      setActionLoading(editingPlan ? "saving" : "creating");
      const url = editingPlan
        ? `/api/admin/subscriptions/plans/${editingPlan._id}`
        : `/api/admin/subscriptions/plans`;
      const method = editingPlan ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Operation failed");
      }

      setSuccessMsg(
        editingPlan
          ? `Plan '${payload.name}' updated successfully`
          : `Plan '${payload.name}' created successfully`
      );
      setIsCreateModalOpen(false);
      await fetchPlans();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle status (Activate / Deactivate)
  const handleToggleStatus = async (plan: ISubscriptionPlanResponse) => {
    try {
      setActionLoading(plan._id);
      const res = await fetch(`/api/admin/subscriptions/plans/${plan._id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      setPlans((prev) =>
        prev.map((p) => (p._id === plan._id ? { ...p, status: data.plan.status } : p))
      );
      setSuccessMsg(`Plan '${plan.name}' is now ${data.plan.status}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to toggle plan status");
    } finally {
      setActionLoading(null);
    }
  };

  // Delete plan
  const handleDeletePlan = async () => {
    if (!deleteModalPlan) return;
    try {
      setActionLoading("deleting");
      const res = await fetch(`/api/admin/subscriptions/plans/${deleteModalPlan._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete plan");
      }

      setPlans((prev) => prev.filter((p) => p._id !== deleteModalPlan._id));
      setSuccessMsg(`Subscription plan '${deleteModalPlan.name}' deleted successfully`);
      setDeleteModalPlan(null);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete plan");
    } finally {
      setActionLoading(null);
    }
  };

  // Filtered plans
  const filteredPlans = plans.filter((plan) => {
    const matchesSearch =
      plan.name.toLowerCase().includes(search.toLowerCase()) ||
      (plan.description && plan.description.toLowerCase().includes(search.toLowerCase())) ||
      plan.features.some((f) => f.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" || plan.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const totalPlans = plans.length;
  const activePlans = plans.filter((p) => p.status === "ACTIVE").length;
  const inactivePlans = plans.filter((p) => p.status === "INACTIVE").length;
  const avgMonthlyPrice =
    totalPlans > 0
      ? Math.round(plans.reduce((acc, curr) => acc + curr.monthlyPrice, 0) / totalPlans)
      : 0;

  const formatLimit = (limit: number) => {
    return limit === -1 ? "Unlimited" : limit.toLocaleString();
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <AdminPageHeader
        title="Subscription Plans"
        subtitle="Configure SaaS subscription packaging, room/staff quota tiers, and feature entitlements"
        badge="Tier Management"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (!token) return;
                try {
                  setLoading(true);
                  const res = await fetch("/api/admin/subscriptions/plans/seed", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  const data = await res.json();
                  if (res.ok) {
                    setSuccessMsg(data.message || "Seeded default tiers");
                    await fetchPlans();
                  } else {
                    setErrorMsg(data.error || "Failed to seed default tiers");
                  }
                } catch (e: any) {
                  setErrorMsg(e.message);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
              title="Seed Basic, Professional, and Enterprise plans"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Seed Defaults</span>
            </button>
            <button
              onClick={fetchPlans}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
              title="Refresh plans list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              id="create-plan-btn"
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-300 transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Plan</span>
            </button>
          </div>
        }
      />

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <p className="text-xs sm:text-sm font-medium">{successMsg}</p>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs font-semibold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <p className="text-xs sm:text-sm font-medium">{errorMsg}</p>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 hover:text-rose-200 text-xs font-semibold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Plans
            </span>
            <div className="text-2xl font-black text-white mt-1">{totalPlans}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Active Tiers
            </span>
            <div className="text-2xl font-black text-emerald-400 mt-1">{activePlans}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Inactive Tiers
            </span>
            <div className="text-2xl font-black text-slate-400 mt-1">{inactivePlans}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Avg Monthly Base
            </span>
            <div className="text-2xl font-black text-amber-400 mt-1">
              ${avgMonthlyPrice}
              <span className="text-xs font-normal text-slate-400">/mo</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & View Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/60 border border-slate-800 rounded-2xl p-3 sm:p-4">
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search plans by name, feature, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:ring-2 focus:ring-amber-400/50 outline-none"
          />
        </div>

        {/* Status Filter & View Toggle */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === "ALL"
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All ({plans.length})
            </button>
            <button
              onClick={() => setStatusFilter("ACTIVE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === "ACTIVE"
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Active ({activePlans})
            </button>
            <button
              onClick={() => setStatusFilter("INACTIVE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === "INACTIVE"
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Inactive ({inactivePlans})
            </button>
          </div>

          <div className="hidden md:flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === "table" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
              }`}
              title="Table View"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === "cards" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
              }`}
              title="Card Grid View"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: Plans List (Table or Card View) */}
      {viewMode === "table" ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/95 text-slate-400 uppercase font-semibold tracking-wider">
                  <th className="py-3.5 px-4">Plan Name</th>
                  <th className="py-3.5 px-4">Monthly Price</th>
                  <th className="py-3.5 px-4">Yearly Price</th>
                  <th className="py-3.5 px-4">Room Limit</th>
                  <th className="py-3.5 px-4">Staff Limit</th>
                  <th className="py-3.5 px-4">Receptionist Limit</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-slate-400">
                      <Loader2 className="w-7 h-7 animate-spin text-amber-400 mx-auto mb-2" />
                      Loading subscription plans...
                    </td>
                  </tr>
                ) : filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-slate-400">
                      <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2.5" />
                      <p className="font-semibold text-slate-300 text-sm">No subscription plans found</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Create your first subscription tier (e.g. Basic, Professional, Enterprise) to package features for hotel properties.
                      </p>
                      <button
                        onClick={openCreateModal}
                        className="mt-4 px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20"
                      >
                        + Create First Plan
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredPlans.map((plan) => {
                    const isRowActionLoading = actionLoading === plan._id;
                    return (
                      <tr
                        key={plan._id}
                        className="hover:bg-slate-800/40 transition group"
                      >
                        {/* Plan Name & Features */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            <span>{plan.name}</span>
                          </div>
                          {plan.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {plan.description}
                            </p>
                          )}
                          {/* Feature Badges */}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {plan.features.map((feat, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 border border-slate-700/80 text-slate-300 font-medium"
                              >
                                <span>{FEATURE_ICONS[feat] || "✨"}</span>
                                <span>{feat}</span>
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Monthly Price */}
                        <td className="py-4 px-4 font-mono font-bold text-slate-200">
                          ${plan.monthlyPrice.toLocaleString()}
                          <span className="text-[10px] text-slate-400 font-normal">/mo</span>
                        </td>

                        {/* Yearly Price */}
                        <td className="py-4 px-4 font-mono font-bold text-amber-400">
                          ${plan.yearlyPrice.toLocaleString()}
                          <span className="text-[10px] text-slate-400 font-normal">/yr</span>
                        </td>

                        {/* Room Limit */}
                        <td className="py-4 px-4">
                          {plan.maxRooms === -1 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold text-[11px]">
                              <InfinityIcon className="w-3.5 h-3.5" />
                              <span>Unlimited</span>
                            </span>
                          ) : (
                            <span className="font-semibold text-slate-200">
                              {plan.maxRooms.toLocaleString()} rooms
                            </span>
                          )}
                        </td>

                        {/* Staff Limit */}
                        <td className="py-4 px-4">
                          {plan.maxStaff === -1 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold text-[11px]">
                              <InfinityIcon className="w-3.5 h-3.5" />
                              <span>Unlimited</span>
                            </span>
                          ) : (
                            <span className="font-semibold text-slate-200">
                              {plan.maxStaff.toLocaleString()} staff
                            </span>
                          )}
                        </td>

                        {/* Receptionist Limit */}
                        <td className="py-4 px-4">
                          {plan.maxReceptionists === -1 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold text-[11px]">
                              <InfinityIcon className="w-3.5 h-3.5" />
                              <span>Unlimited</span>
                            </span>
                          ) : (
                            <span className="font-semibold text-slate-200">
                              {plan.maxReceptionists.toLocaleString()} receptionists
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          <AdminStatusBadge status={plan.status} />
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Activate / Deactivate Toggle */}
                            <button
                              onClick={() => handleToggleStatus(plan)}
                              disabled={isRowActionLoading}
                              title={plan.status === "ACTIVE" ? "Deactivate Plan" : "Activate Plan"}
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition border ${
                                plan.status === "ACTIVE"
                                  ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-amber-300"
                                  : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              }`}
                            >
                              {isRowActionLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : plan.status === "ACTIVE" ? (
                                "Deactivate"
                              ) : (
                                "Activate"
                              )}
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => openEditModal(plan)}
                              className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => setDeleteModalPlan(plan)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-[11px] transition"
                              title="Delete Plan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
            <div
              key={plan._id}
              className={`bg-slate-900/90 border rounded-2xl p-6 relative flex flex-col justify-between shadow-xl transition hover:border-slate-700 ${
                plan.status === "ACTIVE" ? "border-slate-800" : "border-slate-800/50 opacity-75"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white tracking-tight">{plan.name}</h3>
                  <AdminStatusBadge status={plan.status} />
                </div>

                {plan.description && (
                  <p className="text-xs text-slate-400 mb-4 line-clamp-2">{plan.description}</p>
                )}

                {/* Price Display */}
                <div className="flex items-baseline gap-1 my-3">
                  <span className="text-3xl font-extrabold text-white">
                    ${plan.monthlyPrice}
                  </span>
                  <span className="text-slate-400 text-xs">/month</span>
                  <span className="text-[11px] text-amber-400 ml-2 font-mono font-semibold">
                    (${plan.yearlyPrice}/yr)
                  </span>
                </div>

                {/* Quota Limits Box */}
                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-2 text-xs mb-4">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-amber-400" />
                      Room Limit:
                    </span>
                    <strong className="font-mono text-white">
                      {formatLimit(plan.maxRooms)}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      Staff Limit:
                    </span>
                    <strong className="font-mono text-white">
                      {formatLimit(plan.maxStaff)}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                      Receptionists:
                    </span>
                    <strong className="font-mono text-white">
                      {formatLimit(plan.maxReceptionists)}
                    </strong>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-1.5 mb-6">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-2">
                    Included Features ({plan.features.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.features.map((feat, i) => (
                      <div
                        key={i}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
                      >
                        <span>{FEATURE_ICONS[feat] || "✨"}</span>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleStatus(plan)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    plan.status === "ACTIVE"
                      ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                      : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  }`}
                >
                  {plan.status === "ACTIVE" ? "Deactivate" : "Activate"}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(plan)}
                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => setDeleteModalPlan(plan)}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs"
                    title="Delete Plan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SECTIONS 2 & 3: CREATE / EDIT PLAN MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Sticky Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-5 sm:px-6 py-4 flex-shrink-0 bg-slate-900/95">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {editingPlan ? `Edit Subscription Plan: ${editingPlan.name}` : "Create Subscription Plan"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Define pricing structure, tenant quota limits, and enabled SaaS modules
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmitPlan} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Row 1: Plan Name & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Plan Name <span className="text-amber-400">*</span>
                    </label>
                    <input
                      id="plan-name-input"
                      type="text"
                      required
                      placeholder="e.g. Basic, Professional, Enterprise"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:ring-2 focus:ring-amber-400/50 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as "ACTIVE" | "INACTIVE" })
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:ring-2 focus:ring-amber-400/50 outline-none"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Target audience, packaging highlights, and tier benefits..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-400/50 outline-none"
                  />
                </div>

                {/* Pricing Grid */}
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2.5">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                    Pricing Configuration
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Monthly Price ($ USD) <span className="text-amber-400">*</span>
                      </label>
                      <div className="relative">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="plan-monthly-price"
                          type="number"
                          min="0"
                          step="1"
                          required
                          value={formData.monthlyPrice}
                          onChange={(e) =>
                            setFormData({ ...formData, monthlyPrice: Math.max(0, Number(e.target.value)) })
                          }
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:ring-2 focus:ring-amber-400/50 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Yearly Price ($ USD) <span className="text-amber-400">*</span>
                      </label>
                      <div className="relative">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="plan-yearly-price"
                          type="number"
                          min="0"
                          step="1"
                          required
                          value={formData.yearlyPrice}
                          onChange={(e) =>
                            setFormData({ ...formData, yearlyPrice: Math.max(0, Number(e.target.value)) })
                          }
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:ring-2 focus:ring-amber-400/50 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Limits Configuration */}
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                      Tenant Capacity Limits
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Check unlimited for unrestricted tiers
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Max Rooms */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-300">
                          Max Rooms
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer text-[10px] text-amber-400">
                          <input
                            type="checkbox"
                            checked={formData.unlimitedRooms}
                            onChange={(e) =>
                              setFormData({ ...formData, unlimitedRooms: e.target.checked })
                            }
                            className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-400/40"
                          />
                          <span>Unlimited</span>
                        </label>
                      </div>
                      {formData.unlimitedRooms ? (
                        <div className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-300 text-xs font-bold flex items-center gap-1.5">
                          <InfinityIcon className="w-3.5 h-3.5" />
                          <span>Unlimited (-1)</span>
                        </div>
                      ) : (
                        <input
                          id="plan-max-rooms"
                          type="number"
                          min="0"
                          required
                          value={formData.maxRooms}
                          onChange={(e) =>
                            setFormData({ ...formData, maxRooms: Math.max(0, parseInt(e.target.value || "0", 10)) })
                          }
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-400/50 outline-none"
                        />
                      )}
                    </div>

                    {/* Max Staff */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-300">
                          Max Staff
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer text-[10px] text-amber-400">
                          <input
                            type="checkbox"
                            checked={formData.unlimitedStaff}
                            onChange={(e) =>
                              setFormData({ ...formData, unlimitedStaff: e.target.checked })
                            }
                            className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-400/40"
                          />
                          <span>Unlimited</span>
                        </label>
                      </div>
                      {formData.unlimitedStaff ? (
                        <div className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-300 text-xs font-bold flex items-center gap-1.5">
                          <InfinityIcon className="w-3.5 h-3.5" />
                          <span>Unlimited (-1)</span>
                        </div>
                      ) : (
                        <input
                          id="plan-max-staff"
                          type="number"
                          min="0"
                          required
                          value={formData.maxStaff}
                          onChange={(e) =>
                            setFormData({ ...formData, maxStaff: Math.max(0, parseInt(e.target.value || "0", 10)) })
                          }
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-400/50 outline-none"
                        />
                      )}
                    </div>

                    {/* Max Receptionists */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-300">
                          Receptionists
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer text-[10px] text-amber-400">
                          <input
                            type="checkbox"
                            checked={formData.unlimitedReceptionists}
                            onChange={(e) =>
                              setFormData({ ...formData, unlimitedReceptionists: e.target.checked })
                            }
                            className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-400/40"
                          />
                          <span>Unlimited</span>
                        </label>
                      </div>
                      {formData.unlimitedReceptionists ? (
                        <div className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-300 text-xs font-bold flex items-center gap-1.5">
                          <InfinityIcon className="w-3.5 h-3.5" />
                          <span>Unlimited (-1)</span>
                        </div>
                      ) : (
                        <input
                          id="plan-max-receptionists"
                          type="number"
                          min="0"
                          required
                          value={formData.maxReceptionists}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              maxReceptionists: Math.max(0, parseInt(e.target.value || "0", 10)),
                            })
                          }
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-400/50 outline-none"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Feature Toggles */}
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2.5">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                    Core Feature Toggles
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {AVAILABLE_FEATURES.map((feat) => {
                      const isChecked = formData.features.includes(feat.key);
                      return (
                        <div
                          key={feat.key}
                          onClick={() => toggleFeature(feat.key)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start gap-2.5 select-none ${
                            isChecked
                              ? "bg-amber-500/10 border-amber-500/40 text-white"
                              : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-600"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center mt-0.5 flex-shrink-0 transition ${
                              isChecked
                                ? "bg-amber-500 text-slate-950 font-bold"
                                : "border border-slate-600 bg-slate-800"
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold flex items-center gap-1.5">
                              <span>{FEATURE_ICONS[feat.key] || "✨"}</span>
                              <span className={isChecked ? "text-amber-300" : "text-slate-300"}>
                                {feat.label}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                              {feat.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Additional Custom Features */}
                  <div className="pt-1.5">
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Custom Features / Tags
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. 24/7 Support, Multi-Currency, Keycards"
                        value={formData.customFeatureInput}
                        onChange={(e) =>
                          setFormData({ ...formData, customFeatureInput: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomFeature();
                          }
                        }}
                        className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs outline-none focus:ring-2 focus:ring-amber-400/50"
                      />
                      <button
                        type="button"
                        onClick={addCustomFeature}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-xl"
                      >
                        + Add
                      </button>
                    </div>

                    {/* Active tags */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {formData.features.map((feat) => (
                        <span
                          key={feat}
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-200"
                        >
                          <span>{FEATURE_ICONS[feat] || "✨"}</span>
                          <span>{feat}</span>
                          <button
                            type="button"
                            onClick={() => removeFeature(feat)}
                            className="hover:text-rose-400 text-slate-400 ml-1 font-bold"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Modal Footer with Actions */}
              <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-3.5 border-t border-slate-800 bg-slate-900/95 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  id="save-plan-submit-btn"
                  type="submit"
                  disabled={actionLoading !== null}
                  className="px-6 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Plan...</span>
                    </>
                  ) : (
                    <span>{editingPlan ? "Update Plan" : "Create Plan"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Delete Subscription Plan</h3>
            </div>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-white">"{deleteModalPlan.name}"</strong>? This will remove
              the plan tier configuration.
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteModalPlan(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePlan}
                disabled={actionLoading === "deleting"}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                {actionLoading === "deleting" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete Plan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
