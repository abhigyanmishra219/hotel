"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  Search,
  Filter,
  ShieldCheck,
  Building2,
  Calendar,
  Lock,
  User,
  ShieldAlert,
  Clock,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Check,
  FileJson,
  Layers,
  CreditCard,
  Key,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { IAuditLogPopulated, AUDIT_ACTIONS } from "@/types/audit";

export default function AdminAuditLogsPage() {
  const { token } = useUser();

  const [logs, setLogs] = useState<IAuditLogPopulated[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [hotelFilter, setHotelFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Options & Pagination
  const [availableHotels, setAvailableHotels] = useState<Array<{ _id: string; hotelCode: string; name: string }>>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  // Selected Log for Details Modal
  const [selectedLog, setSelectedLog] = useState<IAuditLogPopulated | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  const fetchAuditLogs = useCallback(
    async (pageNumber = 1, isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({
          page: String(pageNumber),
          limit: String(limit),
        });

        if (search.trim()) queryParams.set("search", search.trim());
        if (actionFilter && actionFilter !== "ALL") queryParams.set("action", actionFilter);
        if (hotelFilter && hotelFilter !== "ALL") queryParams.set("hotelId", hotelFilter);
        if (startDate) queryParams.set("startDate", startDate);
        if (endDate) queryParams.set("endDate", endDate);

        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`/api/admin/audit-logs?${queryParams.toString()}`, {
          headers,
          cache: "no-store",
        });

        if (!res.ok) {
          if (res.status === 403 || res.status === 401) {
            throw new Error("Access forbidden. System Administrator privileges required.");
          }
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server error (${res.status})`);
        }

        const resJson = await res.json();
        if (resJson.success) {
          setLogs(resJson.logs || []);
          setTotalPages(resJson.pagination?.totalPages || 1);
          setTotalCount(resJson.pagination?.total || 0);
          setPage(resJson.pagination?.page || 1);
          if (resJson.availableHotels) {
            setAvailableHotels(resJson.availableHotels);
          }
        } else {
          throw new Error(resJson.error || "Failed to load audit logs");
        }
      } catch (err: any) {
        console.error("Error fetching audit logs:", err);
        setError(err.message || "Failed to fetch audit log trail");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, search, actionFilter, hotelFilter, startDate, endDate]
  );

  useEffect(() => {
    fetchAuditLogs(1);
  }, [fetchAuditLogs]);

  const handleCopyJson = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes("CREATE") || action.includes("ASSIGN") || action.includes("ACTIVE") || action.includes("ENABLE")) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    }
    if (action.includes("SUSPEND") || action.includes("CANCEL") || action.includes("DISABLE") || action.includes("BLOCK") || action.includes("UNAUTHORIZED")) {
      return "bg-rose-500/10 text-rose-400 border-rose-500/30";
    }
    if (action.includes("RESET") || action.includes("PASSWORD") || action.includes("KEY")) {
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    }
    if (action.includes("CHANGE") || action.includes("UPDATE")) {
      return "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
    }
    return "bg-slate-800 text-slate-300 border-slate-700";
  };

  const getEntityIcon = (entity: string) => {
    switch (entity?.toLowerCase()) {
      case "hotel":
        return <Building2 className="w-3.5 h-3.5 text-amber-400" />;
      case "user":
        return <User className="w-3.5 h-3.5 text-indigo-400" />;
      case "subscriptionplan":
        return <Layers className="w-3.5 h-3.5 text-cyan-400" />;
      case "hotelsubscription":
        return <CreditCard className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const setPresetDate = (days: number | null) => {
    if (days === null) {
      setStartDate("");
      setEndDate("");
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <AdminPageHeader
        title="Security Audit Logs"
        subtitle="Immutable security audit trail capturing all administrative, tenant, subscription, and lifecycle events"
        badge="Audit Trail"
        actions={
          <button
            onClick={() => fetchAuditLogs(page, true)}
            disabled={refreshing || loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Refreshing..." : "Refresh Logs"}</span>
          </button>
        }
      />

      {/* ERROR ALERT */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Failed to retrieve audit trail</p>
              <p className="text-xs text-rose-400/90">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchAuditLogs(page, true)}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-medium transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* SEARCH AND FILTERS BAR */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search description, entity ID, action..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-400 transition"
            >
              <option value="ALL">All Event Actions</option>
              <optgroup label="Hotel Lifecycle">
                <option value="HOTEL_CREATED">HOTEL_CREATED</option>
                <option value="HOTEL_UPDATED">HOTEL_UPDATED</option>
                <option value="HOTEL_ACTIVATED">HOTEL_ACTIVATED</option>
                <option value="HOTEL_SUSPENDED">HOTEL_SUSPENDED</option>
              </optgroup>
              <optgroup label="Manager Lifecycle">
                <option value="MANAGER_CREATED">MANAGER_CREATED</option>
                <option value="MANAGER_DISABLED">MANAGER_DISABLED</option>
                <option value="MANAGER_ENABLED">MANAGER_ENABLED</option>
                <option value="MANAGER_PASSWORD_RESET">MANAGER_PASSWORD_RESET</option>
              </optgroup>
              <optgroup label="Plan Lifecycle">
                <option value="PLAN_CREATED">PLAN_CREATED</option>
                <option value="PLAN_UPDATED">PLAN_UPDATED</option>
                <option value="PLAN_ACTIVATED">PLAN_ACTIVATED</option>
                <option value="PLAN_DEACTIVATED">PLAN_DEACTIVATED</option>
              </optgroup>
              <optgroup label="Subscription Lifecycle">
                <option value="SUBSCRIPTION_ASSIGNED">SUBSCRIPTION_ASSIGNED</option>
                <option value="SUBSCRIPTION_CHANGED">SUBSCRIPTION_CHANGED</option>
                <option value="SUBSCRIPTION_SUSPENDED">SUBSCRIPTION_SUSPENDED</option>
                <option value="SUBSCRIPTION_CANCELLED">SUBSCRIPTION_CANCELLED</option>
                <option value="SUBSCRIPTION_REACTIVATED">SUBSCRIPTION_REACTIVATED</option>
              </optgroup>
            </select>
          </div>

          {/* Hotel Filter */}
          <div>
            <select
              value={hotelFilter}
              onChange={(e) => setHotelFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-400 transition"
            >
              <option value="ALL">All Properties & Platform</option>
              <option value="PLATFORM">Platform Level (No Hotel)</option>
              {availableHotels.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.name} ({h.hotelCode})
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter Inputs */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-1/2 px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-400 transition"
              title="Start Date"
            />
            <span className="text-slate-500 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-1/2 px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-400 transition"
              title="End Date"
            />
          </div>
        </div>

        {/* Quick Date Range Presets */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Quick Dates:</span>
            <button
              onClick={() => setPresetDate(null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                !startDate && !endDate
                  ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setPresetDate(0)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            >
              Today
            </button>
            <button
              onClick={() => setPresetDate(7)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setPresetDate(30)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            >
              Last 30 Days
            </button>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            {totalCount} Total Audit Records
          </span>
        </div>
      </div>

      {/* AUDIT LOGS TABLE */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="p-8 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-800/50 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-200">No Audit Logs Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              No security events match the current filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                  <th className="py-3.5 px-4 font-semibold">Action</th>
                  <th className="py-3.5 px-4 font-semibold">Entity</th>
                  <th className="py-3.5 px-4 font-semibold">Description</th>
                  <th className="py-3.5 px-4 font-semibold">Performed By</th>
                  <th className="py-3.5 px-4 font-semibold">Hotel Property</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-800/40 transition group">
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{formatDate(log.createdAt)}</span>
                      </div>
                    </td>

                    {/* Action Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border font-mono ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    {/* Entity */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                        {getEntityIcon(log.entity)}
                        <span>{log.entity}</span>
                      </div>
                      {log.entityId && (
                        <span className="text-[10px] font-mono text-slate-500 truncate max-w-[100px] block">
                          #{log.entityId.slice(-6)}
                        </span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-4">
                      <p className="text-slate-200 font-medium leading-relaxed line-clamp-2 max-w-md">
                        {log.description}
                      </p>
                    </td>

                    {/* Performed By */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {log.userId ? (
                        <div>
                          <span className="text-slate-200 font-semibold">{log.userId.name}</span>
                          <p className="text-[10px] text-amber-400 font-mono">
                            {log.userId.role}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">System Engine</span>
                      )}
                    </td>

                    {/* Hotel Property */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {log.hotelId ? (
                        <div>
                          <span className="text-slate-200 font-medium">{log.hotelId.name}</span>
                          <span className="text-[10px] font-mono text-amber-400 block">
                            {log.hotelId.hotelCode}
                          </span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                          Platform Scope
                        </span>
                      )}
                    </td>

                    {/* View Details Button */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing <span className="text-white font-semibold">{(page - 1) * limit + 1}</span> to{" "}
              <span className="text-white font-semibold">
                {Math.min(page * limit, totalCount)}
              </span>{" "}
              of <span className="text-white font-semibold">{totalCount}</span> audit records
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchAuditLogs(page - 1)}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <span className="px-2 py-1 font-mono text-slate-300">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => fetchAuditLogs(page + 1)}
                disabled={page >= totalPages || loading}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. AUDIT LOG DETAILS MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Audit Log Record Details</h3>
                  <p className="text-[11px] font-mono text-slate-400">Log ID: {selectedLog._id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Action</span>
                  <div className="mt-1">
                    <span
                      className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[10px] border ${getActionBadgeColor(
                        selectedLog.action
                      )}`}
                    >
                      {selectedLog.action}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Entity</span>
                  <p className="text-slate-200 font-semibold mt-1 flex items-center gap-1">
                    {getEntityIcon(selectedLog.entity)}
                    <span>{selectedLog.entity}</span>
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Timestamp</span>
                  <p className="text-slate-200 font-mono mt-1">{formatDate(selectedLog.createdAt)}</p>
                </div>
              </div>

              {/* Performed By & Hotel Scope */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Performed By</span>
                  {selectedLog.userId ? (
                    <div className="mt-1">
                      <p className="font-bold text-white text-sm">{selectedLog.userId.name}</p>
                      <p className="text-slate-400 font-mono">{selectedLog.userId.email}</p>
                      <span className="mt-1 inline-block px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold">
                        {selectedLog.userId.role}
                      </span>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic mt-1">System Internal Workflow</p>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Target Hotel</span>
                  {selectedLog.hotelId ? (
                    <div className="mt-1">
                      <p className="font-bold text-white text-sm">{selectedLog.hotelId.name}</p>
                      <p className="text-amber-400 font-mono">{selectedLog.hotelId.hotelCode}</p>
                      {selectedLog.hotelId.city && (
                        <p className="text-slate-400 text-[11px]">{selectedLog.hotelId.city}</p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1">
                      <p className="text-slate-300 font-semibold">Global Platform Scope</p>
                      <p className="text-slate-500 text-[11px]">Action unaffected by specific tenant bounds</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Description</span>
                <p className="text-slate-200 text-sm font-medium mt-1 leading-relaxed">
                  {selectedLog.description}
                </p>
              </div>

              {/* Sanitized Metadata JSON Viewer */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
                    <FileJson className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sanitized Metadata Payload</span>
                  </span>
                  <button
                    onClick={() => handleCopyJson(selectedLog.metadata || {})}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-mono text-[11px] overflow-x-auto max-h-48 leading-relaxed">
                  {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
