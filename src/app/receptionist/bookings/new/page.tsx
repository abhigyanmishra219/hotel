"use client";

import React, { Suspense } from "react";
import BookingForm from "@/components/booking/BookingForm";
import { Loader2 } from "lucide-react";

export default function ReceptionistNewBookingPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
          <p className="text-sm font-medium">Loading booking wizard...</p>
        </div>
      }
    >
      <BookingForm portalType="receptionist" />
    </Suspense>
  );
}
