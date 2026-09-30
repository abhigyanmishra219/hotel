"use client";

import React, { useState } from "react";
import {
  Calendar,
  Filter,
  Download,
  Printer,
  RefreshCw,
  Search,
  ChevronDown,
  X,
} from "lucide-react";

export type DateRangePreset =
  | "TODAY"
  | "YESTERDAY"
  | "LAST_7_DAYS"
  | "LAST_30_DAYS"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "THIS_YEAR"
  | "CUSTOM";

export interface ReportFilterProps {
  preset: DateRangePreset;
  onPresetChange: (preset: DateRangePreset) => void;
  startDate?: string;
  endDate?: string;
  onCustomDateChange?: (start: string, end: string) => void;
  // Optional Contextual Filters
  status?: string;
  onStatusChange?: (status: string) => void;
  statusOptions?: Array<{ label: string; value: string }>;
  paymentStatus?: string;
  onPaymentStatusChange?: (status: string) => void;
  paymentOptions?: Array<{ label: string; value: string }>;
  roomType?: string;
  onRoomTypeChange?: (roomType: string) => void;
  roomTypeOptions?: Array<{ label: string; value: string }>;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  // Actions
  onRefresh?: () => void;
  onExportCsv?: () => void;
  onPrint?: () => void;
  isExporting?: boolean;
  isLoading?: boolean;
}

const PRESET_LABELS: Record<DateRangePreset, string> = {
  TODAY: "Today",
  YESTERDAY: "Yesterday",
  LAST_7_DAYS: "Last 7 Days",
  LAST_30_DAYS: "Last 30 Days",
  THIS_MONTH: "This Month",
  LAST_MONTH: "Last Month",
  THIS_YEAR: "This Year",
  CUSTOM: "Custom Range",
};

export default function ReportFilter({
  preset,
  onPresetChange,
  startDate = "",
  endDate = "",
  onCustomDateChange,
  status,
  onStatusChange,
  statusOptions,
  paymentStatus,
  onPaymentStatusChange,
  paymentOptions,
  roomType,
  onRoomTypeChange,
  roomTypeOptions,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search records...",
  onRefresh,
  onExportCsv,
  onPrint,
  isExporting = false,
  isLoading = false,
}: ReportFilterProps) {
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);
  const [dateError, setDateError] = useState("");

  const handleApplyCustomDates = () => {
    if (!customStart || !customEnd) {
      setDateError("Please select both start and end dates.");
      return;
    }
    if (new Date(customStart) > new Date(customEnd)) {
      setDateError("Start date cannot be after end date.");
      return;
    }
    setDateError("");
    onPresetChange("CUSTOM");
    if (onCustomDateChange) {
      onCustomDateChange(customStart, customEnd);
    }
  };

  const handlePresetSelect = (newPreset: DateRangePreset) => {
    setDateError("");
    onPresetChange(newPreset);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl mb-6 backdrop-blur-md space-y-4 print:hidden">
      {/* Top Bar: Preset Selector + Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Date Presets Pill Group */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950/70 border border-slate-800 rounded-xl">
          {(
            [
              "TODAY",
              "YESTERDAY",
              "LAST_7_DAYS",
              "LAST_30_DAYS",
              "THIS_MONTH",
              "LAST_MONTH",
              "THIS_YEAR",
              "CUSTOM",
            ] as DateRangePreset[]
          ).map((p) => {
            const isSelected = preset === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => handlePresetSelect(p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 ${
                  isSelected
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                {PRESET_LABELS[p]}
              </button>
            );
          })}
        </div>

        {/* Action Buttons: Refresh, Print, CSV Export */}
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl border border-slate-800 transition disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-amber-400" : ""}`} />
            </button>
          )}

          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 rounded-xl border border-slate-700/60 transition shadow-sm"
              title="Print Report"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Print</span>
            </button>
          )}

          {onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-md shadow-amber-500/20 transition disabled:opacity-50"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Custom Date Range Picker (Shown when preset is CUSTOM) */}
      {preset === "CUSTOM" && (
        <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Select Range:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
            />
            <span className="text-slate-500 text-xs">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="button"
            onClick={handleApplyCustomDates}
            className="px-3.5 py-1.5 text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-lg transition"
          >
            Apply Range
          </button>
          {dateError && (
            <span className="text-xs text-rose-400 font-medium">{dateError}</span>
          )}
        </div>
      )}

      {/* Contextual Filters Bar: Search, Status, Payment, Room Type */}
      {(onSearchChange || statusOptions || paymentOptions || roomTypeOptions) && (
        <div className="pt-3 border-t border-slate-800/60 flex flex-wrap items-center gap-3">
          {/* Search Box */}
          {onSearchChange && (
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/80 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Status Dropdown */}
          {statusOptions && onStatusChange && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Status:
              </span>
              <select
                value={status || "ALL"}
                onChange={(e) => onStatusChange(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-950/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500/80 transition"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Payment Status Dropdown */}
          {paymentOptions && onPaymentStatusChange && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Payment:
              </span>
              <select
                value={paymentStatus || "ALL"}
                onChange={(e) => onPaymentStatusChange(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-950/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500/80 transition"
              >
                {paymentOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Room Type Dropdown */}
          {roomTypeOptions && onRoomTypeChange && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Room Type:
              </span>
              <select
                value={roomType || "ALL"}
                onChange={(e) => onRoomTypeChange(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-950/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500/80 transition"
              >
                {roomTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
