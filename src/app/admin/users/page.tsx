"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  Building2,
  Mail,
  UserX,
  UserCheck,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";

interface PlatformUser {
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
  } | null;
}

export default function AdminUsersPage() {
  const { token, user: currentAdmin } = useUser();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [hotelFilter, setHotelFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (hotelFilter !== "ALL") params.set("hotelId", hotelFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load users");

      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, hotelFilter, statusFilter, token]);

  const fetchHotels = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/hotels", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setHotels(data.hotels || []);
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchUsers();
      fetchHotels();
    }
  }, [fetchUsers, fetchHotels, token]);

  const handleToggleStatus = async (userId: string, userName: string) => {
    try {
      setError(null);
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          action: "toggle-status",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user status");

      setUsers((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, isActive: data.isActive } : u
        )
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <AdminPageHeader
        title="Platform Users"
        subtitle="Comprehensive user registry across System Administrators, Hotel Managers, Receptionists, and Staff"
        badge="Access Directory"
      />

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search user name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/60 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:ring-2 focus:ring-amber-400/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Role filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs"
            >
              <option value="ALL">All Roles</option>
              <option value="SYSTEM_ADMIN">SYSTEM_ADMIN</option>
              <option value="MANAGER">MANAGER</option>
              <option value="RECEPTIONIST">RECEPTIONIST</option>
              <option value="STAFF">STAFF</option>
            </select>

            {/* Hotel filter */}
            <select
              value={hotelFilter}
              onChange={(e) => setHotelFilter(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs max-w-[180px] truncate"
            >
              <option value="ALL">All Hotel Properties</option>
              {hotels.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.name} ({h.hotelCode})
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DISABLED">DISABLED</option>
            </select>

            <button
              onClick={fetchUsers}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-slate-300"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase font-semibold tracking-wider">
                <th className="py-3.5 px-4">User Name</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">System Role</th>
                <th className="py-3.5 px-4">Assigned Hotel</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto mb-2" />
                    Loading platform users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-medium text-slate-300">No users found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Try clearing filters or search terms.
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = currentAdmin?.email === u.email;

                  return (
                    <tr key={u._id} className="hover:bg-slate-800/40 transition">
                      <td className="py-4 px-4 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center font-bold">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <span>{u.name}</span>
                            {isCurrent && (
                              <span className="ml-2 text-[10px] text-amber-400 font-normal">
                                (You)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono text-slate-300">
                        {u.email}
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            u.role === "SYSTEM_ADMIN"
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              : u.role === "MANAGER"
                              ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                              : u.role === "RECEPTIONIST"
                              ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        {u.hotelId ? (
                          <Link
                            href={`/admin/hotels/${u.hotelId._id}`}
                            className="hover:underline text-slate-200 flex items-center gap-1 font-medium"
                          >
                            <Building2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>{u.hotelId.name}</span>
                          </Link>
                        ) : (
                          <span className="text-slate-500 italic">
                            Platform Wide (No Hotel)
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <AdminStatusBadge
                          status={u.isActive ? "ACTIVE" : "DISABLED"}
                        />
                      </td>

                      <td className="py-4 px-4 text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {u.hotelId && (
                            <Link
                              href={`/admin/hotels/${u.hotelId._id}`}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium"
                            >
                              View Hotel
                            </Link>
                          )}

                          {!isCurrent ? (
                            <button
                              onClick={() => handleToggleStatus(u._id, u.name)}
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition border ${
                                u.isActive
                                  ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30"
                                  : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              }`}
                            >
                              {u.isActive ? "Disable" : "Enable"}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic px-2">
                              Protected
                            </span>
                          )}
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
    </main>
  );
}
