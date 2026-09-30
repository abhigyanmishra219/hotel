"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { useUser } from "@/context/UserContext";
import CustomerForm from "@/components/customer/CustomerForm";
import { ICustomerFormData } from "@/types/customer";

export default function ManagerNewCustomerPage() {
  const router = useRouter();
  const { token } = useUser();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (formData: ICustomerFormData) => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register customer");
      }

      setSuccessMessage(`Customer ${data.customer.fullName} registered successfully!`);
      setTimeout(() => {
        router.push(`/manager/customers/${data.customer._id}`);
      }, 700);
    } catch (err: any) {
      setError(err.message || "An error occurred while creating the customer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href="/manager/customers"
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Customer Directory</span>
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
          <Users className="w-4 h-4" />
          <span>Guest Registration</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Register Customer Profile
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Add guest contact details and verification credentials for reservations.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <CustomerForm
        onSubmit={handleSubmit}
        isSubmitting={submitting}
        submitButtonText="Register Customer"
        cancelHref="/manager/customers"
      />
    </div>
  );
}
