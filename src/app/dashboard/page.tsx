"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { getRoleDashboardPath } from "@/types/roles";
import { Loader2 } from "lucide-react";

export default function GenericDashboardRedirect() {
  const router = useRouter();
  const { user, isLoading } = useUser();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else {
        const dest = getRoleDashboardPath(user.role);
        router.push(dest);
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
      <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
      <p className="text-sm font-medium">Navigating to your role dashboard...</p>
    </div>
  );
}
