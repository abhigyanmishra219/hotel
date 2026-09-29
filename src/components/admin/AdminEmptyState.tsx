import React from "react";
import Link from "next/link";
import { LucideIcon, Plus } from "lucide-react";

interface AdminEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onActionClick?: () => void;
}

export default function AdminEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onActionClick,
}: AdminEmptyStateProps) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
        <Icon className="w-7 h-7 text-slate-400" />
      </div>
      <h3 className="text-base font-bold text-white mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-6">{description}</p>

      {actionLabel && (
        actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{actionLabel}</span>
          </Link>
        ) : (
          <button
            onClick={onActionClick}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{actionLabel}</span>
          </button>
        )
      )}
    </div>
  );
}
