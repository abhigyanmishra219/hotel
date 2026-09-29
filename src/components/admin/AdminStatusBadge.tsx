import React from "react";

interface AdminStatusBadgeProps {
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING" | "CANCELLED" | "EXPIRED" | string;
  className?: string;
}

export default function AdminStatusBadge({ status, className = "" }: AdminStatusBadgeProps) {
  const upperStatus = status?.toUpperCase() || "ACTIVE";

  let colorClasses = "bg-slate-800 text-slate-300 border-slate-700";

  switch (upperStatus) {
    case "ACTIVE":
    case "PAID":
    case "SUCCESS":
      colorClasses = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      break;
    case "INACTIVE":
    case "DISABLED":
      colorClasses = "bg-slate-800/80 text-slate-400 border-slate-700";
      break;
    case "SUSPENDED":
    case "FAILED":
    case "CANCELLED":
      colorClasses = "bg-rose-500/15 text-rose-400 border-rose-500/30";
      break;
    case "PENDING":
    case "EXPIRED":
    case "TRIAL":
      colorClasses = "bg-amber-500/15 text-amber-400 border-amber-500/30";
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider border ${colorClasses} ${className}`}
    >
      {upperStatus}
    </span>
  );
}
