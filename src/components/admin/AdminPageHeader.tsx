import React, { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  badge?: string;
  actions?: ReactNode;
}

export default function AdminPageHeader({
  title,
  subtitle,
  backHref,
  badge,
  actions,
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
      <div className="flex items-start gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition mt-0.5"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        )}
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {title}
            </h1>
            {badge && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-400/10 text-amber-300 border border-amber-400/20">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>
      </div>

      {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
    </div>
  );
}
