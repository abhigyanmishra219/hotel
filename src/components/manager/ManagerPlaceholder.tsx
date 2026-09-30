"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  LucideIcon,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building,
} from "lucide-react";

interface ManagerPlaceholderProps {
  title: string;
  phase: string;
  description: string;
  icon: LucideIcon;
  plannedFeatures?: string[];
}

export default function ManagerPlaceholder({
  title,
  phase,
  description,
  icon: Icon,
  plannedFeatures = [],
}: ManagerPlaceholderProps) {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Back button */}
      <Link
        href="/manager/dashboard"
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-amber-400 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Manager Dashboard</span>
      </Link>

      {/* Main Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
        <div className="absolute -top-10 -right-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/10">
                <Icon className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    GrandStay Manager Module
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {title}
                </h1>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold self-start sm:self-auto">
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>{phase}</span>
            </div>
          </div>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
            {description}
          </p>

          {/* Planned Features List */}
          {plannedFeatures.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-800/80">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Planned Module Capabilities</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {plannedFeatures.map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs text-slate-300"
                  >
                    <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notice box */}
          <div className="mt-8 p-4 rounded-xl bg-slate-800/30 border border-slate-700/40 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                Tenant-isolated authorization is established for this module.
              </span>
            </div>
            <Link
              href="/manager/dashboard"
              className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold transition flex-shrink-0 ml-2"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
