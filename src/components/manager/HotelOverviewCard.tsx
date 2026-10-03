"use client";

import React from "react";
import {
  Hotel as HotelIcon,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  Layers,
} from "lucide-react";

interface HotelData {
  name: string;
  hotelCode: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  isInactive?: boolean;
}

interface SubscriptionData {
  status: string;
  paymentStatus: string;
  planName: string;
  monthlyPrice: number;
  yearlyPrice: number;
  endDate?: string | null;
  features?: string[];
  maxRooms?: number;
  maxStaff?: number;
}

interface HotelOverviewCardProps {
  hotel: HotelData | null;
  subscription: SubscriptionData | null;
  loading?: boolean;
}

export default function HotelOverviewCard({
  hotel,
  subscription,
  loading = false,
}: HotelOverviewCardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 animate-pulse">
        <div className="h-6 w-36 bg-slate-800 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-20 bg-slate-800/60 rounded-xl" />
          <div className="h-20 bg-slate-800/60 rounded-xl" />
          <div className="h-20 bg-slate-800/60 rounded-xl" />
          <div className="h-20 bg-slate-800/60 rounded-xl" />
        </div>
      </div>
    );
  }

  const isInactive =
    hotel?.status === "INACTIVE" ||
    hotel?.status === "SUSPENDED" ||
    hotel?.isInactive;

  const getStatusBadge = (status?: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            ACTIVE
          </span>
        );
      case "INACTIVE":
      case "SUSPENDED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3" />
            {status.toUpperCase()}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
            {status || "UNKNOWN"}
          </span>
        );
    }
  };

  const getSubStatusBadge = (status?: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <Sparkles className="w-3 h-3" />
            ACTIVE
          </span>
        );
      case "TRIAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30">
            TRIAL
          </span>
        );
      case "EXPIRED":
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30">
            {status.toUpperCase()}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {status || "ACTIVE"}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Inactive Alert Banner if hotel status is deactivated/suspended */}
      {isInactive && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 flex items-start gap-3 shadow-lg shadow-rose-950/40">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5 animate-bounce" />
          <div>
            <h3 className="text-sm font-bold text-white">Hotel Account Inactive</h3>
            <p className="text-xs text-rose-300 mt-0.5">
              Your hotel account is currently inactive or suspended. Please contact the System Administrator to reactivate your operational privileges.
            </p>
          </div>
        </div>
      )}

      {/* Main My Hotel Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-950 border border-slate-800/90 p-6 sm:p-8 shadow-xl backdrop-blur-xl">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-300/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/10">
              <HotelIcon className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-widest">
                  MY HOTEL
                </span>
                {hotel?.city && (
                  <span className="text-[11px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                    {hotel.city}{hotel.state ? `, ${hotel.state}` : ""}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight mt-0.5">
                {hotel?.name || "Assigned Hotel"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getStatusBadge(hotel?.status)}
            {getSubStatusBadge(subscription?.status)}
          </div>
        </div>

        {/* 4 Details Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Property Status */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <span className="text-[11px] text-slate-400 uppercase font-medium tracking-wider block mb-1">
              Property Status
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Operational Status
              </span>
              <span className="text-xs font-bold text-emerald-400">
                {hotel?.status || "ACTIVE"}
              </span>
            </div>
          </div>

          {/* 2. Subscription Plan */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <span className="text-[11px] text-slate-400 uppercase font-medium tracking-wider block mb-1">
              Subscription Plan
            </span>
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-amber-300">
                {subscription?.planName || "Professional"}
              </span>
              <span className="text-xs text-slate-400">
                ₹{subscription?.monthlyPrice ?? 0}/mo
              </span>
            </div>
          </div>

          {/* 3. Subscription Status */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <span className="text-[11px] text-slate-400 uppercase font-medium tracking-wider block mb-1">
              Subscription Status
            </span>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-emerald-400">
                {subscription?.status || "ACTIVE"}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {subscription?.paymentStatus || "PAID"}
              </span>
            </div>
          </div>

          {/* 4. Location & Contact */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <span className="text-[11px] text-slate-400 uppercase font-medium tracking-wider block mb-1">
              Location
            </span>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 truncate">
              <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="truncate">
                {hotel?.city ? `${hotel.city}, ${hotel.state || ""}` : "Location configured"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
