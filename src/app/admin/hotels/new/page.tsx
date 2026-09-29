"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Key,
  Plus,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Hotel as HotelIcon,
  CreditCard,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  BedDouble,
  Users,
  Briefcase,
  Zap,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

interface SubscriptionPlanOption {
  _id: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxRooms: number;
  maxStaff: number;
  maxReceptionists: number;
  features: string[];
  status: "ACTIVE" | "INACTIVE";
}

const ALL_SYSTEM_SERVICES = [
  { id: "booking", name: "Guest Booking Engine", desc: "Room reservations, check-ins, and guest management" },
  { id: "billing", name: "Billing & Invoicing", desc: "Folio generation, payment recording, and checkout invoices" },
  { id: "roomService", name: "Room Service & Orders", desc: "In-room food ordering and service ticket management" },
  { id: "reports", name: "Operational Reports", desc: "Occupancy, revenue summaries, and shift logs" },
  { id: "analytics", name: "Advanced Business Analytics", desc: "Forecasting, RevPAR, and tenant financial trends" },
];

export default function NewHotelPage() {
  const router = useRouter();
  const { token } = useUser();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlanOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "USA",
    managerName: "",
    managerEmail: "",
    managerPassword: "",
    planId: "",
    billingCycle: "MONTHLY" as "MONTHLY" | "YEARLY",
  });

  const [createdResult, setCreatedResult] = useState<{
    hotelId: string;
    hotelCode: string;
    hotelName: string;
    managerEmail?: string;
    tempPassword?: string;
    planName?: string;
  } | null>(null);

  // Fetch available active subscription plans on load
  useEffect(() => {
    async function loadPlans() {
      try {
        setLoadingPlans(true);
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch("/api/admin/subscriptions/plans?status=ACTIVE", {
          headers,
          cache: "no-store",
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.plans)) {
            const activePlans = data.plans.filter((p: SubscriptionPlanOption) => p.status === "ACTIVE");
            setPlans(activePlans);
            // Default select the first active plan if available
            if (activePlans.length > 0 && !formData.planId) {
              setFormData((prev) => ({
                ...prev,
                planId: activePlans[0]._id,
              }));
            }
          }
        }
      } catch (err) {
        console.error("Failed to load subscription plans:", err);
      } finally {
        setLoadingPlans(false);
      }
    }

    loadPlans();
  }, [token]);

  const selectedPlan = plans.find((p) => p._id === formData.planId) || null;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/hotels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create hotel tenant");
      }

      setCreatedResult({
        hotelId: data.hotel._id,
        hotelCode: data.hotel.hotelCode,
        hotelName: data.hotel.name,
        managerEmail: data.manager?.email,
        tempPassword: data.temporaryPassword,
        planName: data.subscription?.planId?.name || selectedPlan?.name || "None",
      });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatQuota = (val: number, label: string) => {
    if (val === -1) return "Unlimited " + label;
    return `${val} ${label}`;
  };

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <AdminPageHeader
        title="Add New Hotel Tenant"
        subtitle="Register a new hotel property, assign an active subscription plan, and provision its General Manager"
        backHref="/admin/hotels"
        badge="Hotel Onboarding"
      />

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {createdResult ? (
        /* Success Screen */
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
            <div className="flex items-center gap-2 font-bold text-emerald-400 text-base mb-1">
              <CheckCircle className="w-5 h-5" />
              <span>Hotel Tenant Created & Initialized Successfully!</span>
            </div>
            <p className="text-xs text-slate-300">
              The property has been added to the multi-tenant SaaS registry with its selected subscription plan and security boundaries.
            </p>
          </div>

          <div className="bg-slate-800/60 p-5 rounded-xl border border-slate-700/60 space-y-4 font-mono text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 block text-[11px]">Assigned Hotel Code:</span>
                <strong className="text-amber-400 text-lg">{createdResult.hotelCode}</strong>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Active Subscription Plan:</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-sans font-bold text-xs">
                    {createdResult.planName}
                  </span>
                  <span className="text-emerald-400 text-[10px] font-sans font-semibold">● Active</span>
                </div>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Hotel Property Name:</span>
              <span className="text-white text-sm font-sans">{createdResult.hotelName}</span>
            </div>

            {createdResult.managerEmail && (
              <div className="pt-3 border-t border-slate-700">
                <span className="text-slate-400 block text-[11px]">
                  General Manager Account:
                </span>
                <span className="text-indigo-300">{createdResult.managerEmail}</span>
              </div>
            )}

            {createdResult.tempPassword && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <span className="text-amber-300 block text-xs font-sans font-semibold mb-1.5">
                  Temporary Manager Password (Save/Copy now):
                </span>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-amber-200 text-sm font-bold">
                    {createdResult.tempPassword}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdResult.tempPassword!)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-sans font-bold text-xs flex items-center gap-1.5 hover:bg-amber-400 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
            <Link
              href="/admin/hotels"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Back to All Hotels
            </Link>

            <Link
              href={`/admin/hotels/${createdResult.hotelId}`}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/20"
            >
              View Hotel Dossier &rarr;
            </Link>
          </div>
        </div>
      ) : (
        /* Create Form */
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-7"
        >
          {/* Section 1: Property Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                1. Hotel Property Information
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Hotel Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Grand Royale Resort & Spa"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:ring-2 focus:ring-amber-400/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Official Contact Email *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="contact@hotel.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:ring-2 focus:ring-amber-400/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phone"
                  placeholder="+1 (555) 234-5678"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:ring-2 focus:ring-amber-400/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Street Address
                </label>
                <input
                  type="text"
                  name="address"
                  placeholder="500 Ocean Avenue"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:ring-2 focus:ring-amber-400/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  placeholder="Miami Beach"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:ring-2 focus:ring-amber-400/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    State / Province
                  </label>
                  <input
                    type="text"
                    name="state"
                    placeholder="FL"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:ring-2 focus:ring-amber-400/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    placeholder="USA"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:ring-2 focus:ring-amber-400/50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Initial Manager Provisioning */}
          <div className="pt-6 border-t border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                2. Initial General Manager (Optional)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Manager Full Name
                </label>
                <input
                  type="text"
                  name="managerName"
                  placeholder="e.g. Amanda Vance"
                  value={formData.managerName}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-400/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Manager Email Address
                </label>
                <input
                  type="email"
                  name="managerEmail"
                  placeholder="manager@hotel.com"
                  value={formData.managerEmail}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-400/50"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Temporary Password (Optional — left blank auto-generates a secure password)
                </label>
                <input
                  type="text"
                  name="managerPassword"
                  placeholder="Leave empty for auto-generated password"
                  value={formData.managerPassword}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-400/50"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Subscription Plan & Available Services Dropdown */}
          <div className="pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  3. Subscription Plan & Service Access
                </h2>
              </div>
              <span className="text-[11px] text-amber-400/90 font-medium">
                Backend Feature Enforcement Active
              </span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Plan Dropdown */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Select Subscription Plan *
                  </label>
                  {loadingPlans ? (
                    <div className="h-10 bg-slate-800 rounded-xl animate-pulse flex items-center px-3 text-slate-500 text-xs">
                      Loading available subscription plans...
                    </div>
                  ) : plans.length === 0 ? (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                      No active subscription plans found. Please create plans in{" "}
                      <Link href="/admin/subscriptions" className="underline font-bold">
                        Subscription Plans
                      </Link>{" "}
                      first.
                    </div>
                  ) : (
                    <select
                      name="planId"
                      value={formData.planId}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-400/50 transition cursor-pointer"
                    >
                      <option value="" disabled>
                        -- Select a Subscription Plan --
                      </option>
                      {plans.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} — ${p.monthlyPrice}/mo (${p.yearlyPrice}/yr)
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">
                    Only services included in the chosen plan will be unlocked for this hotel tenant.
                  </p>
                </div>

                {/* Billing Cycle */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Initial Billing Cycle
                  </label>
                  <select
                    name="billingCycle"
                    value={formData.billingCycle}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-400/50 transition"
                  >
                    <option value="MONTHLY">Monthly (30 Days)</option>
                    <option value="YEARLY">Yearly (365 Days)</option>
                  </select>
                </div>
              </div>

              {/* Selected Plan Details & Feature Matrix Card */}
              {selectedPlan && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950/40 border border-indigo-500/30 space-y-4 shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-700/60">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">
                          {selectedPlan.name} Tier
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          ACTIVE PLAN
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {selectedPlan.description || "Comprehensive hotel management subscription tier"}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-amber-400">
                        ${formData.billingCycle === "YEARLY" ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice}
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        /{formData.billingCycle === "YEARLY" ? "year" : "month"}
                      </span>
                    </div>
                  </div>

                  {/* Quota Limits Preview */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Enforced Quotas & Capacity Limits:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                          <BedDouble className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Room Limit</span>
                          <strong className="text-xs text-white">
                            {formatQuota(selectedPlan.maxRooms, "Rooms")}
                          </strong>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Staff Limit</span>
                          <strong className="text-xs text-white">
                            {formatQuota(selectedPlan.maxStaff, "Staff")}
                          </strong>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                          <Briefcase className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Receptionists</span>
                          <strong className="text-xs text-white">
                            {formatQuota(selectedPlan.maxReceptionists, "Front Desk")}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Available Services Status Checklist */}
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Services Available for this Hotel:</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {ALL_SYSTEM_SERVICES.map((svc) => {
                        const isEnabled = selectedPlan.features.some(
                          (f) => f.toLowerCase() === svc.id.toLowerCase() || f.toLowerCase().includes(svc.id.toLowerCase())
                        );

                        return (
                          <div
                            key={svc.id}
                            className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition ${
                              isEnabled
                                ? "bg-emerald-500/10 border-emerald-500/30 text-slate-200"
                                : "bg-slate-900/60 border-slate-800 text-slate-500 opacity-60"
                            }`}
                          >
                            <div className="mt-0.5">
                              {isEnabled ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-slate-600 flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-bold ${isEnabled ? "text-white" : "text-slate-500"}`}>
                                  {svc.name}
                                </span>
                                <span
                                  className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                    isEnabled
                                      ? "bg-emerald-400/20 text-emerald-300"
                                      : "bg-slate-800 text-slate-500"
                                  }`}
                                >
                                  {isEnabled ? "Enabled" : "Locked"}
                                </span>
                              </div>
                              <p className="text-[10px] mt-0.5 text-slate-400 leading-tight">
                                {svc.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-800">
            <Link
              href="/admin/hotels"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting || loadingPlans}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-60 transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering Tenant...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Hotel Tenant</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
