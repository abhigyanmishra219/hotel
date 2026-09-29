"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Search,
  Filter,
  Plus,
  Hotel as HotelIcon,
  User,
  Mail,
  MapPin,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Edit,
  Eye,
  Key,
  RotateCcw,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";

interface HotelData {
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
  manager?: {
    _id?: string;
    name: string;
    email: string;
    isActive: boolean;
  } | null;
  subscription?: {
    _id: string;
    status: string;
    paymentStatus: string;
    planId?: {
      _id: string;
      name: string;
      monthlyPrice: number;
      features?: string[];
    } | null;
  } | null;
}

export default function AdminHotelsPage() {
  const { token } = useUser();

  const [hotels, setHotels] = useState<HotelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);

  // Modal State for Adding Hotel
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<{
    hotelCode: string;
    hotelName: string;
    managerEmail?: string;
    tempPassword?: string;
  } | null>(null);
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
  });

  const fetchHotels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (search) queryParams.set("search", search);
      if (statusFilter !== "ALL") queryParams.set("status", statusFilter);

      const res = await fetch(`/api/admin/hotels?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch hotels");
      }

      setHotels(data.hotels || []);
    } catch (err: any) {
      setError(err.message || "Could not load hotels");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, token]);

  useEffect(() => {
    if (token) {
      fetchHotels();
    }
  }, [fetchHotels, token]);

  const handleStatusChange = async (
    hotelId: string,
    newStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED"
  ) => {
    try {
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

      // Optimistic update
      setHotels((prev) =>
        prev.map((h) => (h._id === hotelId ? { ...h, status: newStatus } : h))
      );
    } catch (err: any) {
      alert(`Error updating hotel status: ${err.message}`);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateHotel = async (e: React.FormEvent) => {
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
        throw new Error(data.error || "Failed to create hotel");
      }

      setCreatedResult({
        hotelCode: data.hotel.hotelCode,
        hotelName: data.hotel.name,
        managerEmail: data.manager?.email,
        tempPassword: data.temporaryPassword,
      });

      setFormData({
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
      });

      fetchHotels();
    } catch (err: any) {
      setError(err.message || "Failed to create hotel");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeCount = hotels.filter((h) => h.status === "ACTIVE").length;
  const inactiveCount = hotels.filter((h) => h.status === "INACTIVE").length;
  const suspendedCount = hotels.filter((h) => h.status === "SUSPENDED").length;

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Standard Admin Header */}
      <AdminPageHeader
        title="Hotel Management"
        subtitle="Manage all multi-tenant hotels, properties, and assigned General Managers"
        badge="Hotel Portfolio"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/hotels/new"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Hotel</span>
            </Link>
          </div>
        }
      />

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-medium">Total Hotels</span>
          <p className="text-2xl font-bold text-white mt-1">{hotels.length}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-emerald-400 font-medium">Active Tenants</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{activeCount}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-medium">Inactive</span>
          <p className="text-2xl font-bold text-slate-400 mt-1">{inactiveCount}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-rose-400 font-medium">Suspended</span>
          <p className="text-2xl font-bold text-rose-400 mt-1">{suspendedCount}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/60 border border-slate-800 rounded-2xl p-3 sm:p-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by hotel name, code (HOT-XXXXXX), city, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/60 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>

          <button
            onClick={fetchHotels}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-slate-300 hover:text-white transition"
            title="Refresh hotel list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hotel Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase font-semibold tracking-wider">
                <th className="py-3.5 px-4">Hotel Code</th>
                <th className="py-3.5 px-4">Hotel Name &amp; Location</th>
                <th className="py-3.5 px-4">Manager</th>
                <th className="py-3.5 px-4">Email &amp; Phone</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Subscription</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto mb-2" />
                    Loading hotel properties...
                  </td>
                </tr>
              ) : hotels.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-medium text-slate-300">No hotels found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Click &ldquo;+ Add Hotel&rdquo; to create your first property.
                    </p>
                  </td>
                </tr>
              ) : (
                hotels.map((hotel) => (
                  <tr
                    key={hotel._id}
                    className="hover:bg-slate-800/40 transition group"
                  >
                    {/* Code */}
                    <td className="py-4 px-4 font-mono font-bold text-amber-400">
                      <span className="px-2 py-1 rounded bg-amber-400/10 border border-amber-400/20">
                        {hotel.hotelCode}
                      </span>
                    </td>

                    {/* Name & City */}
                    <td className="py-4 px-4">
                      <div className="font-semibold text-white text-sm">
                        {hotel.name}
                      </div>
                      <div className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>
                          {hotel.city ? `${hotel.city}, ` : ""}
                          {hotel.state ? `${hotel.state}, ` : ""}
                          {hotel.country || "USA"}
                        </span>
                      </div>
                    </td>

                    {/* Manager */}
                    <td className="py-4 px-4">
                      {hotel.manager ? (
                        <div>
                          <div className="font-medium text-slate-200 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{hotel.manager.name}</span>
                          </div>
                          <div className="text-slate-400 text-[11px] font-mono">
                            {hotel.manager.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="py-4 px-4 font-mono text-[11px] text-slate-300">
                      <div>{hotel.email}</div>
                      {hotel.phone && (
                        <div className="text-slate-500 text-[10px] mt-0.5">
                          {hotel.phone}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <AdminStatusBadge status={hotel.status} />
                    </td>

                    {/* Subscription */}
                    <td className="py-4 px-4">
                      {hotel.subscription?.planId ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          <CheckCircle className="w-3 h-3 text-indigo-400" />
                          <span>{hotel.subscription.planId.name}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px] italic">
                          No Plan Assigned
                        </span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="py-4 px-4 text-slate-400 text-[11px]">
                      {new Date(hotel.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    {/* Actions: [ View ], [ Edit ], [ Activate / Deactivate / Reactivate ] */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <Link
                          href={`/admin/hotels/${hotel._id}`}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700 transition"
                        >
                          View
                        </Link>

                        <Link
                          href={`/admin/hotels/${hotel._id}/edit`}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700 transition flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </Link>

                        {hotel.status === "ACTIVE" ? (
                          <button
                            onClick={() =>
                              handleStatusChange(hotel._id, "INACTIVE")
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-medium border border-slate-700 transition"
                          >
                            Deactivate
                          </button>
                        ) : hotel.status === "INACTIVE" ? (
                          <button
                            onClick={() =>
                              handleStatusChange(hotel._id, "ACTIVE")
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium transition"
                          >
                            Activate
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleStatusChange(hotel._id, "ACTIVE")
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-medium transition flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reactivate</span>
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
    </main>
  );
}
