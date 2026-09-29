"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { USER_ROLES } from "@/types/roles";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useUser();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Strict route protection for all /admin/* routes
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== USER_ROLES.SYSTEM_ADMIN) {
        router.push("/");
      }
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== USER_ROLES.SYSTEM_ADMIN) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
        <p className="text-sm font-medium">Verifying System Admin Credentials...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Persistent Sidebar */}
      <AdminSidebar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Top Header */}
      <AdminHeader
        onMenuClick={() => setIsMobileOpen(true)}
        isCollapsed={isCollapsed}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out
          ${isCollapsed ? "lg:pl-20" : "lg:pl-64"}
        `}
      >
        {children}
      </div>
    </div>
  );
}
