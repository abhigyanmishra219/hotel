"use client";

import React from "react";
import { UserProvider } from "@/context/UserContext";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-center">
        {children}
      </div>
    </UserProvider>
  );
}
