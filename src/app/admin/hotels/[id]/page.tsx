"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Hotel as HotelIcon,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  AlertCircle,
  Key,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  Copy,
  Check,
  Save,
  CreditCard,
  Calendar,
  Lock,
  UserCheck,
  UserX,
  Plus,
  RefreshCw,
  Sparkles,
  ArrowRight,
  History,
  XCircle,
  ShieldAlert,
  Infinity as InfinityIcon,
  Layers,
  PauseCircle,
  PlayCircle,
  DollarSign,
  ChevronRight,
  Clock,
  ArrowUpRight,
  Tag,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { USER_ROLES } from "@/types/roles";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import {
  ISubscriptionPlanResponse,
  IHotelSubscriptionResponse,
  HotelSubscriptionStatus,
  PaymentStatus,
} from "@/types/subscription";

interface HotelDetail {
  _id: string;
  hotelCode: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
}

interface ManagerDetail {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function HotelDetailPage() {
  const router = useRouter();
  const params = useParams();
  const hotelId = params.id as string;
  const { user, token, isLoading } = useUser();

  const [hotel, setHotel] = useState<HotelDetail | null>(null);
  const [managers, setManagers] = useState<ManagerDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Subscription States
  const [currentSubscription, setCurrentSubscription] = useState<IHotelSubscriptionResponse | null>(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState<IHotelSubscriptionResponse[]>([]);
  const [availablePlans, setAvailablePlans] = useState<ISubscriptionPlanResponse[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [subActionLoading, setSubActionLoading] = useState<string | null>(null);

  // Assign/Change Plan Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planFormData, setPlanFormData] = useState({
    planId: "",
    billingCycle: "MONTHLY" as "MONTHLY" | "YEARLY",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    status: "ACTIVE" as HotelSubscriptionStatus,
    paymentStatus: "PAID" as PaymentStatus,
    changeReason: "",
  });

  // Edit Hotel Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
  });

  // Password Reset Modal / Display
  const [resetResult, setResetResult] = useState<{
    managerEmail: string;
    tempPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Add Manager Modal
  const [isAddManagerOpen, setIsAddManagerOpen] = useState(false);
  const [newManagerData, setNewManagerData] = useState({
    name: "",
    email: "",
    password: "",
  });

  // Protect route
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== USER_ROLES.SYSTEM_ADMIN) {
        router.push("/");
      }
    }
  }, [user, isLoading, router]);

  // Fetch Hotel Details
  const fetchHotelDetails = useCallback(async () => {
    if (!hotelId || !token) return;
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/admin/hotels/${hotelId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load hotel details");
      }

      setHotel(data.hotel);
      setManagers(data.managers || []);
      setEditFormData({
        name: data.hotel.name || "",
        email: data.hotel.email || "",
        phone: data.hotel.phone || "",
        address: data.hotel.address || "",
        city: data.hotel.city || "",
        state: data.hotel.state || "",
        country: data.hotel.country || "USA",
      });
    } catch (err: any) {
      setError(err.message || "Failed to load hotel details");
    } finally {
      setLoading(false);
    }
  }, [hotelId, token]);

  // Fetch Subscription Data & Available Plans
  const fetchSubscriptionData = useCallback(async () => {
    if (!hotelId || !token) return;
    try {
      setSubLoading(true);

      // Fetch subscriptions for this hotel
      const subRes = await fetch(`/api/admin/hotels/${hotelId}/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const subData = await subRes.json();
      if (subRes.ok) {
        setCurrentSubscription(subData.currentSubscription || null);
        setSubscriptionHistory(subData.history || []);
      }

      // Fetch all active subscription plans
      const plansRes = await fetch(`/api/admin/subscriptions/plans?status=ACTIVE`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const plansData = await plansRes.json();
      if (plansRes.ok) {
        setAvailablePlans(plansData.plans || []);
        if (plansData.plans && plansData.plans.length > 0 && !planFormData.planId) {
          setPlanFormData((prev) => ({ ...prev, planId: plansData.plans[0]._id }));
        }
      }
    } catch (err: any) {
      console.error("Subscription load error:", err);
    } finally {
      setSubLoading(false);
    }
  }, [hotelId, token, planFormData.planId]);

  useEffect(() => {
    if (user && user.role === USER_ROLES.SYSTEM_ADMIN && token) {
      fetchHotelDetails();
      fetchSubscriptionData();
    }
  }, [fetchHotelDetails, fetchSubscriptionData, user, token]);

  // Handle Hotel Status Update
  const handleStatusUpdate = async (
    newStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED"
  ) => {
    try {
      setError(null);
      const res = await fetch(`/api/admin/hotels/${hotelId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      setHotel((prev) => (prev ? { ...prev, status: newStatus } : null));
      setSuccessMsg(`Hotel status updated to ${newStatus}`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle Save Hotel Info
  const handleSaveHotelInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const res = await fetch(`/api/admin/hotels/${hotelId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editFormData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save hotel info");
      }

      setHotel(data.hotel);
      setIsEditing(false);
      setSuccessMsg("Hotel information saved successfully");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Open Plan Modal
  const openPlanModal = () => {
    const today = new Date();
    const startDateStr = today.toISOString().split("T")[0];

    const nextMonth = new Date(today);
    nextMonth.setDate(nextMonth.getDate() + 30);
    const endDateStr = nextMonth.toISOString().split("T")[0];

    setPlanFormData({
      planId: currentSubscription ? (currentSubscription.planId?._id || currentSubscription.planId) : (availablePlans[0]?._id || ""),
      billingCycle: "MONTHLY",
      startDate: startDateStr,
      endDate: endDateStr,
      status: "ACTIVE",
      paymentStatus: "PAID",
      changeReason: currentSubscription
        ? `Upgraded/Changed plan from ${currentPlanDetails?.name || "Current"}`
        : "Initial SaaS tier assignment",
    });
    setError(null);
    setIsPlanModalOpen(true);
  };

  // Handle Assign / Change Plan Form Submit
  const handleAssignPlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setSubActionLoading("assigning");

      const res = await fetch(`/api/admin/hotels/${hotelId}/subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(planFormData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to assign subscription plan");
      }

      setSuccessMsg(data.message || "Subscription plan updated successfully");
      setIsPlanModalOpen(false);
      await fetchSubscriptionData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to assign plan");
    } finally {
      setSubActionLoading(null);
    }
  };

  // Handle Status Toggle / Actions (Activate, Suspend, Cancel)
  const handleSubscriptionStatusAction = async (
    targetStatus: HotelSubscriptionStatus,
    targetPayment?: PaymentStatus
  ) => {
    if (!currentSubscription) return;
    try {
      setSubActionLoading(targetStatus);
      setError(null);

      const payload: any = { status: targetStatus };
      if (targetPayment) payload.paymentStatus = targetPayment;

      const res = await fetch(`/api/admin/hotels/${hotelId}/subscription/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update subscription status");
      }

      setSuccessMsg(`Subscription marked as ${targetStatus}`);
      await fetchSubscriptionData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update subscription status");
    } finally {
      setSubActionLoading(null);
    }
  };

  // Manager password reset
  const handleResetPassword = async (managerId: string, managerEmail: string) => {
    if (!confirm(`Are you sure you want to reset password for ${managerEmail}?`)) {
      return;
    }

    try {
      setError(null);
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
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setResetResult({
        managerEmail,
        tempPassword: data.temporaryPassword,
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleManagerActive = async (managerId: string) => {
    try {
      setError(null);
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
      if (!res.ok) {
        throw new Error(data.error || "Failed to toggle manager status");
      }

      setManagers((prev) =>
        prev.map((m) =>
          m._id === managerId ? { ...m, isActive: data.isActive } : m
        )
      );

      setSuccessMsg(data.message);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const res = await fetch(`/api/admin/hotels/${hotelId}/manager`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "create",
          name: newManagerData.name,
          email: newManagerData.email,
          password: newManagerData.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create manager");
      }

      setResetResult({
        managerEmail: data.manager.email,
        tempPassword: data.temporaryPassword,
      });

      setIsAddManagerOpen(false);
      setNewManagerData({ name: "", email: "", password: "" });
      fetchHotelDetails();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
        <p className="text-sm font-medium">Loading Hotel Dossier & Subscriptions...</p>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <p className="text-base text-rose-400">Hotel tenant not found.</p>
        <Link
          href="/admin/hotels"
          className="mt-4 px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-white"
        >
          Return to Hotels
        </Link>
      </div>
    );
  }

  // Resolved current plan details
  const currentPlanDetails: ISubscriptionPlanResponse | null =
    currentSubscription && typeof currentSubscription.planId === "object"
      ? (currentSubscription.planId as ISubscriptionPlanResponse)
      : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/hotels"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white">
                  {hotel.name}
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
                  {hotel.hotelCode}
                </span>
              </div>
              <p className="text-xs text-slate-400">Tenant Management, Quotas &amp; SaaS Subscriptions</p>
            </div>
          </div>

          {/* Hotel Status Controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 mr-1 hidden sm:inline">
              Tenant Status:
            </span>
            <button
              onClick={() => handleStatusUpdate("ACTIVE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                hotel.status === "ACTIVE"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              ACTIVE
            </button>
            <button
              onClick={() => handleStatusUpdate("INACTIVE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                hotel.status === "INACTIVE"
                  ? "bg-slate-300 text-slate-950 shadow-md"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              INACTIVE
            </button>
            <button
              onClick={() => handleStatusUpdate("SUSPENDED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                hotel.status === "SUSPENDED"
                  ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              SUSPENDED
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Toast / Alert Feedback */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-xs text-rose-400 hover:text-white">✕</button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-xs text-emerald-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Temporary Password Display Alert */}
        {resetResult && (
          <div className="p-5 rounded-2xl bg-amber-500/15 border border-amber-500/30 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-amber-300 font-bold text-sm flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  <span>Manager Password Generated</span>
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Account: <strong className="text-white">{resetResult.managerEmail}</strong>
                </p>
              </div>
              <button
                onClick={() => setResetResult(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕ Close
              </button>
            </div>

            <div className="mt-3 flex items-center gap-3 bg-slate-900/80 p-3 rounded-xl border border-amber-500/30 font-mono">
              <span className="text-amber-200 font-bold text-sm flex-1">
                {resetResult.tempPassword}
              </span>
              <button
                onClick={() => copyToClipboard(resetResult.tempPassword)}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-sans font-bold text-xs flex items-center gap-1.5 hover:bg-amber-400 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy Password"}</span>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Hotel Information & Managers */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hotel Info Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Hotel Information
                    </h2>
                    <p className="text-xs text-slate-400">
                      Tenant identification and official location
                    </p>
                  </div>
                </div>

                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
                  >
                    Edit Details
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold rounded-xl transition"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleSaveHotelInfo} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Hotel Name
                      </label>
                      <input
                        type="text"
                        value={editFormData.name}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, name: e.target.value })
                        }
                        required
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-400/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Official Email
                      </label>
                      <input
                        type="email"
                        value={editFormData.email}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, email: e.target.value })
                        }
                        required
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-400/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Phone
                      </label>
                      <input
                        type="text"
                        value={editFormData.phone}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, phone: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-400/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        value={editFormData.address}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, address: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-400/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={editFormData.city}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, city: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-400/50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          State
                        </label>
                        <input
                          type="text"
                          value={editFormData.state}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, state: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-400/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Country
                        </label>
                        <input
                          type="text"
                          value={editFormData.country}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, country: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-400/50"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/50">
                    <span className="text-slate-400 block mb-1">Official Email</span>
                    <div className="flex items-center gap-2 text-slate-200 font-mono">
                      <Mail className="w-3.5 h-3.5 text-amber-400" />
                      <span>{hotel.email}</span>
                    </div>
                  </div>

                  <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/50">
                    <span className="text-slate-400 block mb-1">Contact Phone</span>
                    <div className="flex items-center gap-2 text-slate-200">
                      <Phone className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{hotel.phone || "Not specified"}</span>
                    </div>
                  </div>

                  <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/50 sm:col-span-2">
                    <span className="text-slate-400 block mb-1">Address &amp; Location</span>
                    <div className="flex items-start gap-2 text-slate-200">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span>
                        {hotel.address ? `${hotel.address}, ` : ""}
                        {hotel.city ? `${hotel.city}, ` : ""}
                        {hotel.state ? `${hotel.state}, ` : ""}
                        {hotel.country || "USA"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/50">
                    <span className="text-slate-400 block mb-1">Tenant Registered</span>
                    <div className="flex items-center gap-2 text-slate-200">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {new Date(hotel.createdAt).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/50">
                    <span className="text-slate-400 block mb-1">Internal Database ID</span>
                    <span className="font-mono text-[11px] text-slate-400 truncate block">
                      {hotel._id}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Manager Management Section */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      General Manager Accounts
                    </h2>
                    <p className="text-xs text-slate-400">
                      Authorized manager accounts assigned exclusively to this hotel
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsAddManagerOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold rounded-xl transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Manager</span>
                </button>
              </div>

              {managers.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  <User className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p>No manager is currently assigned to this hotel.</p>
                  <button
                    onClick={() => setIsAddManagerOpen(true)}
                    className="mt-3 px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Initial Manager</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {managers.map((mgr) => (
                    <div
                      key={mgr._id}
                      className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm">
                            {mgr.name}
                          </h4>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {mgr.role}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.2 rounded ${
                              mgr.isActive
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {mgr.isActive ? "ACTIVE" : "DEACTIVATED"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-slate-400 text-xs font-mono mt-1">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span>{mgr.email}</span>
                        </div>

                        <p className="text-[11px] text-slate-500 mt-1">
                          Assigned on {new Date(mgr.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Actions on Manager */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResetPassword(mgr._id, mgr.email)}
                          className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                          title="Generate new temporary password"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>Reset Password</span>
                        </button>

                        <button
                          onClick={() => handleToggleManagerActive(mgr._id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
                            mgr.isActive
                              ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30"
                              : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          }`}
                        >
                          {mgr.isActive ? (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              <span>Disable</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Reactivate</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subscription History Audit Log Section */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Subscription History & Transitions
                    </h2>
                    <p className="text-xs text-slate-400">
                      Full historical audit trail of plan upgrades, downgrades, and status changes
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold text-slate-400 px-2 py-1 rounded bg-slate-800 border border-slate-700">
                  {subscriptionHistory.length} Records
                </span>
              </div>

              {subscriptionHistory.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  <Clock className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                  <p>No previous subscription transitions recorded.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subscriptionHistory.map((sub, idx) => {
                    const plan = typeof sub.planId === "object" ? (sub.planId as ISubscriptionPlanResponse) : null;
                    return (
                      <div
                        key={sub._id}
                        className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                          sub.isCurrent
                            ? "bg-amber-500/5 border-amber-500/30 ring-1 ring-amber-500/20"
                            : "bg-slate-800/40 border-slate-800 text-slate-400"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">
                              {plan?.name || "Unknown Plan"}
                            </span>
                            {sub.isCurrent && (
                              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-amber-400 text-slate-950">
                                Current
                              </span>
                            )}
                            <AdminStatusBadge status={sub.status} />
                            <AdminStatusBadge status={sub.paymentStatus} />
                          </div>

                          <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-3">
                            <span>
                              Period: {new Date(sub.startDate).toLocaleDateString()} &rarr; {new Date(sub.endDate).toLocaleDateString()}
                            </span>
                            {sub.changeReason && (
                              <span className="text-slate-300 italic">
                                &ldquo;{sub.changeReason}&rdquo;
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0 text-[11px] font-mono text-slate-400">
                          Assigned: {new Date(sub.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: HOTEL SUBSCRIPTION MANAGEMENT */}
          <div className="space-y-6">
            {/* Current Subscription Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Current Subscription
                    </h3>
                    <p className="text-xs text-slate-400">Tenant SaaS Plan &amp; Quotas</p>
                  </div>
                </div>

                <button
                  id="assign-change-plan-btn"
                  onClick={openPlanModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{currentSubscription ? "Change Plan" : "Assign Plan"}</span>
                </button>
              </div>

              {subLoading ? (
                <div className="py-8 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto mb-2" />
                  <span>Loading subscription...</span>
                </div>
              ) : currentSubscription && currentPlanDetails ? (
                <div className="space-y-4">
                  {/* Plan Name & Highlights */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900 border border-slate-700/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block">
                          Assigned Tier
                        </span>
                        <h4 className="text-lg font-black text-white">
                          {currentPlanDetails.name}
                        </h4>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-extrabold text-white">
                          ${currentPlanDetails.monthlyPrice}
                          <span className="text-xs font-normal text-slate-400">/mo</span>
                        </div>
                        <span className="text-[10px] text-amber-300 font-mono">
                          (${currentPlanDetails.yearlyPrice}/yr)
                        </span>
                      </div>
                    </div>

                    {currentPlanDetails.description && (
                      <p className="text-xs text-slate-300 leading-snug">
                        {currentPlanDetails.description}
                      </p>
                    )}

                    {/* Status & Payment Badges */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Subscription:</span>
                        <AdminStatusBadge status={currentSubscription.status} />
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Payment:</span>
                        <AdminStatusBadge status={currentSubscription.paymentStatus} />
                      </div>
                    </div>
                  </div>

                  {/* Dates & Quotas Box */}
                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        Start Date:
                      </span>
                      <strong className="font-mono text-white">
                        {new Date(currentSubscription.startDate).toLocaleDateString()}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        End Date / Renewal:
                      </span>
                      <strong className="font-mono text-white">
                        {new Date(currentSubscription.endDate).toLocaleDateString()}
                      </strong>
                    </div>

                    <div className="pt-2 border-t border-slate-700/50 space-y-1.5">
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-slate-400">Max Rooms Limit:</span>
                        <strong className="text-white font-mono">
                          {currentPlanDetails.maxRooms === -1 ? "Unlimited (∞)" : `${currentPlanDetails.maxRooms} rooms`}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-slate-400">Max Staff Limit:</span>
                        <strong className="text-white font-mono">
                          {currentPlanDetails.maxStaff === -1 ? "Unlimited (∞)" : `${currentPlanDetails.maxStaff} staff`}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-slate-400">Receptionists Limit:</span>
                        <strong className="text-white font-mono">
                          {currentPlanDetails.maxReceptionists === -1 ? "Unlimited (∞)" : `${currentPlanDetails.maxReceptionists}`}
                        </strong>
                      </div>
                    </div>

                    {/* Features list */}
                    <div className="pt-2 border-t border-slate-700/50">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                        Enabled Modules ({currentPlanDetails.features.length})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {currentPlanDetails.features.map((feat, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300"
                          >
                            <span>✨</span>
                            <span>{feat}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar: Activate, Suspend, Cancel */}
                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Subscription Controls
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Activate */}
                      <button
                        onClick={() => handleSubscriptionStatusAction("ACTIVE", "PAID")}
                        disabled={subActionLoading !== null || currentSubscription.status === "ACTIVE"}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
                          currentSubscription.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 opacity-60 cursor-not-allowed"
                            : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40"
                        }`}
                        title="Activate subscription and mark paid"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Activate</span>
                      </button>

                      {/* Suspend */}
                      <button
                        onClick={() => handleSubscriptionStatusAction("SUSPENDED")}
                        disabled={subActionLoading !== null || currentSubscription.status === "SUSPENDED"}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
                          currentSubscription.status === "SUSPENDED"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30 opacity-60 cursor-not-allowed"
                            : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40"
                        }`}
                        title="Suspend subscription"
                      >
                        <PauseCircle className="w-3.5 h-3.5" />
                        <span>Suspend</span>
                      </button>

                      {/* Cancel */}
                      <button
                        onClick={() => handleSubscriptionStatusAction("CANCELLED")}
                        disabled={subActionLoading !== null || currentSubscription.status === "CANCELLED"}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
                          currentSubscription.status === "CANCELLED"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30 opacity-60 cursor-not-allowed"
                            : "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40"
                        }`}
                        title="Cancel subscription"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl space-y-3">
                  <CreditCard className="w-8 h-8 text-slate-600 mx-auto" />
                  <div>
                    <p className="font-semibold text-slate-300 text-sm">No Active Subscription</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Assign a SaaS tier to enable hotel capacity limits and platform modules.
                    </p>
                  </div>
                  <button
                    onClick={openPlanModal}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md"
                  >
                    + Assign Subscription Plan
                  </button>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-3">
              <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Platform Utilities
              </h3>
              <Link
                href="/admin/subscriptions"
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-between border border-slate-700 transition"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Configure SaaS Plan Catalog</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                href="/admin/hotels"
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-between border border-slate-700 transition"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  <span>All Hotel Tenants</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* ASSIGN / CHANGE PLAN MODAL */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Sticky Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-5 sm:px-6 py-4 flex-shrink-0 bg-slate-900/95">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {currentSubscription ? "Change Subscription Plan" : "Assign Subscription Plan"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Select a SaaS tier and configure billing period for {hotel.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleAssignPlanSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
                {/* Select Plan */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Select Plan Tier <span className="text-amber-400">*</span>
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                    {availablePlans.map((p) => {
                      const isSelected = planFormData.planId === p._id;
                      return (
                        <div
                          key={p._id}
                          onClick={() => setPlanFormData({ ...planFormData, planId: p._id })}
                          className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                            isSelected
                              ? "bg-amber-500/15 border-amber-500/50 text-white ring-1 ring-amber-500/30"
                              : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected ? "border-amber-400 bg-amber-500" : "border-slate-600"
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                            </div>
                            <div>
                              <span className="font-bold text-xs text-white block">{p.name}</span>
                              <span className="text-[11px] text-slate-400">
                                {p.maxRooms === -1 ? "Unlimited" : `${p.maxRooms} rooms`} &bull; {p.maxStaff === -1 ? "Unlimited" : `${p.maxStaff} staff`}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-mono font-bold text-xs text-amber-400">
                              ${p.monthlyPrice}/mo
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              (${p.yearlyPrice}/yr)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Billing Cycle & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Billing Cycle
                    </label>
                    <select
                      value={planFormData.billingCycle}
                      onChange={(e) => {
                        const cycle = e.target.value as "MONTHLY" | "YEARLY";
                        const start = new Date(planFormData.startDate || Date.now());
                        const end = new Date(start);
                        if (cycle === "YEARLY") end.setFullYear(end.getFullYear() + 1);
                        else end.setDate(end.getDate() + 30);

                        setPlanFormData({
                          ...planFormData,
                          billingCycle: cycle,
                          endDate: end.toISOString().split("T")[0],
                        });
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Annual (Yearly)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Subscription Status
                    </label>
                    <select
                      value={planFormData.status}
                      onChange={(e) =>
                        setPlanFormData({
                          ...planFormData,
                          status: e.target.value as HotelSubscriptionStatus,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="TRIAL">TRIAL</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={planFormData.startDate}
                      onChange={(e) =>
                        setPlanFormData({ ...planFormData, startDate: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      End Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={planFormData.endDate}
                      onChange={(e) =>
                        setPlanFormData({ ...planFormData, endDate: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                    />
                  </div>
                </div>

                {/* Payment Status & Reason */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Payment Status
                    </label>
                    <select
                      value={planFormData.paymentStatus}
                      onChange={(e) =>
                        setPlanFormData({
                          ...planFormData,
                          paymentStatus: e.target.value as PaymentStatus,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                    >
                      <option value="PAID">PAID</option>
                      <option value="PENDING">PENDING</option>
                      <option value="FAILED">FAILED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Transition Notes / Reason
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Upgraded to Enterprise tier"
                      value={planFormData.changeReason}
                      onChange={(e) =>
                        setPlanFormData({ ...planFormData, changeReason: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-3.5 border-t border-slate-800 bg-slate-900/95 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  id="submit-assign-plan-btn"
                  type="submit"
                  disabled={subActionLoading !== null}
                  className="px-6 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition"
                >
                  {subActionLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Assigning Plan...</span>
                    </>
                  ) : (
                    <span>{currentSubscription ? "Confirm Plan Change" : "Assign Plan"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Manager Modal */}
      {isAddManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-400" />
                <span>Assign Hotel Manager</span>
              </h3>
              <button
                onClick={() => setIsAddManagerOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManager} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Manager Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Robert Smith"
                  value={newManagerData.name}
                  onChange={(e) =>
                    setNewManagerData({ ...newManagerData, name: e.target.value })
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
                  placeholder="rsmith@hotel.com"
                  value={newManagerData.email}
                  onChange={(e) =>
                    setNewManagerData({ ...newManagerData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-400/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Custom Password (or leave blank to auto-generate)
                </label>
                <input
                  type="text"
                  placeholder="Leave empty for auto-generation"
                  value={newManagerData.password}
                  onChange={(e) =>
                    setNewManagerData({ ...newManagerData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-indigo-400/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddManagerOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
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
    </div>
  );
}
