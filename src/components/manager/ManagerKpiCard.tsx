"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface ManagerKpiCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  subtitle?: string;
  badge?: string;
  accentColor?: "amber" | "emerald" | "cyan" | "indigo" | "rose";
  loading?: boolean;
}

export default function ManagerKpiCard({
  title,
  value,
  icon: Icon,
  subtitle,
  badge,
  accentColor = "amber",
  loading = false,
}: ManagerKpiCardProps) {
  if (loading) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-24 bg-slate-800 rounded" />
          <div className="h-8 w-8 bg-slate-800 rounded-lg" />
        </div>
        <div className="h-8 w-16 bg-slate-800 rounded mb-2" />
        <div className="h-3 w-32 bg-slate-800 rounded" />
      </div>
    );
  }

  const getAccentStyles = () => {
    switch (accentColor) {
      case "emerald":
        return {
          iconBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
          glow: "group-hover:border-emerald-500/40",
          badge: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
          text: "text-emerald-400",
        };
      case "cyan":
        return {
          iconBg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400",
          glow: "group-hover:border-cyan-500/40",
          badge: "bg-cyan-400/10 text-cyan-300 border-cyan-400/20",
          text: "text-cyan-400",
        };
      case "indigo":
        return {
          iconBg: "bg-indigo-500/15 border-indigo-500/30 text-indigo-400",
          glow: "group-hover:border-indigo-500/40",
          badge: "bg-indigo-400/10 text-indigo-300 border-indigo-400/20",
          text: "text-indigo-400",
        };
      case "rose":
        return {
          iconBg: "bg-rose-500/15 border-rose-500/30 text-rose-400",
          glow: "group-hover:border-rose-500/40",
          badge: "bg-rose-400/10 text-rose-300 border-rose-400/20",
          text: "text-rose-400",
        };
      case "amber":
      default:
        return {
          iconBg: "bg-amber-500/15 border-amber-500/30 text-amber-400",
          glow: "group-hover:border-amber-500/40",
          badge: "bg-amber-400/10 text-amber-300 border-amber-400/20",
          text: "text-amber-400",
        };
    }
  };

  const styles = getAccentStyles();

  return (
    <div
      className={`group bg-slate-900/70 border border-slate-800 rounded-2xl p-5 transition-all duration-200 hover:bg-slate-900 ${styles.glow} relative overflow-hidden`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div
          className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105 ${styles.iconBg}`}
        >
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>

      <div className="mt-3">
        <div className="text-3xl font-extrabold text-white tracking-tight">
          {value}
        </div>

        <div className="flex items-center justify-between gap-2 mt-2">
          {subtitle && (
            <span className="text-xs text-slate-400 truncate">{subtitle}</span>
          )}
          {badge && (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${styles.badge}`}
            >
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
