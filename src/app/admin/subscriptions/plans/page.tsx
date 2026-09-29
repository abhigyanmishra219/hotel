"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function PlansRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/subscriptions");
  }, [router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
      <p className="text-sm font-medium">Navigating to Subscription Plans...</p>
    </div>
  );
}
