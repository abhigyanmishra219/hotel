"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { USER_ROLES } from "@/types/roles";
import ManagerSidebar from "@/components/manager/ManagerSidebar";
import ManagerHeader from "@/components/manager/ManagerHeader";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useUser();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Strict route protection for all /manager/* routes
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace("/login");
      } else if (user.mustChangePassword) {
        // Enforce password change before accessing any manager routes
        router.replace("/change-password");
      } else if (user.role === USER_ROLES.SYSTEM_ADMIN) {
        // Platform admin must use admin dashboard
        router.replace("/admin/dashboard");
      } else if (user.role === USER_ROLES.RECEPTIONIST) {
        router.replace("/receptionist/dashboard");
      } else if (user.role === USER_ROLES.STAFF) {
        router.replace("/staff/dashboard");
      } else if (user.role !== USER_ROLES.MANAGER) {
        router.replace("/");
      }
    }
  }, [user, isLoading, router]);

  if (
    isLoading ||
    !user ||
    user.mustChangePassword ||
    user.role !== USER_ROLES.MANAGER
  ) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
        <p className="text-sm font-medium">Verifying Manager Credentials...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Persistent Manager Sidebar */}
      <ManagerSidebar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Top Manager Header */}
      <ManagerHeader
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
