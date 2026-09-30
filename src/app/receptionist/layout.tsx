"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Menu } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { USER_ROLES } from "@/types/roles";
import ReceptionistSidebar from "@/components/receptionist/ReceptionistSidebar";

export default function ReceptionistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useUser();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Strict route protection for all /receptionist/* routes
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace("/login");
      } else if (user.mustChangePassword) {
        router.replace("/change-password");
      } else if (user.role === USER_ROLES.SYSTEM_ADMIN) {
        router.replace("/admin/dashboard");
      } else if (user.role === USER_ROLES.MANAGER) {
        router.replace("/manager/dashboard");
      } else if (user.role === USER_ROLES.STAFF) {
        router.replace("/staff/dashboard");
      } else if (user.role !== USER_ROLES.RECEPTIONIST) {
        router.replace("/");
      }
    }
  }, [user, isLoading, router]);

  if (
    isLoading ||
    !user ||
    user.mustChangePassword ||
    user.role !== USER_ROLES.RECEPTIONIST
  ) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
        <p className="text-sm font-medium">Verifying Receptionist Credentials...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* Persistent Receptionist Sidebar */}
      <ReceptionistSidebar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        {/* Mobile Header Bar */}
        <div className="lg:hidden h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold text-cyan-400 font-mono">
            GrandStay • Front Desk
          </span>
          <div className="w-8" />
        </div>

        {/* Page Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
