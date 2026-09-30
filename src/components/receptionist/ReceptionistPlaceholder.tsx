"use client";

import React from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Users,
  BedDouble,
  DoorOpen,
  Receipt,
  History,
  Settings,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface ReceptionistPlaceholderProps {
  title: string;
  phase: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  plannedFeatures?: string[];
}

export default function ReceptionistPlaceholder({
  title,
  phase,
  description,
  icon: Icon,
  plannedFeatures = [],
}: ReceptionistPlaceholderProps) {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500/15 via-slate-900 to-slate-950 border border-cyan-500/20 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Front Desk Operations Module • {phase}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {title}
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">{description}</p>
          </div>
          <Link
            href="/receptionist/dashboard"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition self-start sm:self-auto"
          >
            Back to Desk
          </Link>
        </div>
      </div>

      {/* Feature Blueprint Card */}
      <div className="p-6 sm:p-8 bg-slate-900/60 border border-slate-800 rounded-2xl shadow-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Module Blueprint</h3>
            <p className="text-xs text-slate-400">
              This operational module is scheduled for implementation in {phase}.
            </p>
          </div>
        </div>

        {plannedFeatures.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Planned Front Desk Capabilities
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plannedFeatures.map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-300"
                >
                  <span className="w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-mono text-[10px] font-bold flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Multi-tenant permissions and role isolation enforced.</span>
          </div>
          <Link
            href="/receptionist/dashboard"
            className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition"
          >
            <span>Return to Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
