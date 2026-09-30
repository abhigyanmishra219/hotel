"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { USER_ROLES } from "@/types/roles";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useUser();

  // Strict route protection for all /staff/* routes
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
      } else if (user.role === USER_ROLES.RECEPTIONIST) {
        router.replace("/receptionist/dashboard");
      } else if (user.role !== USER_ROLES.STAFF) {
        router.replace("/");
      }
    }
  }, [user, isLoading, router]);

  if (
    isLoading ||
    !user ||
    user.mustChangePassword ||
    user.role !== USER_ROLES.STAFF
  ) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p className="text-sm font-medium">Verifying Staff Credentials...</p>
      </div>
    );
  }

  return <>{children}</>;
}

