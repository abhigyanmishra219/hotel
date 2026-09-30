"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useUser } from "@/context/UserContext";
import CustomerForm from "@/components/customer/CustomerForm";
import { ICustomerFormData } from "@/types/customer";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ManagerEditCustomerPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { token } = useUser();

  const [initialData, setInitialData] = useState<ICustomerFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomer = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/customers/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load customer details");
        }

        const c = data.customer;
        setInitialData({
          fullName: c.fullName,
          phone: c.phone,
          email: c.email || "",
          dateOfBirth: c.dateOfBirth ? String(c.dateOfBirth).split("T")[0] : "",
          gender: c.gender || "UNSPECIFIED",
          address: c.address || "",
          city: c.city || "",
          state: c.state || "",
          country: c.country || "India",
          idType: c.idType || "NONE",
          idNumber: c.idNumber || "",
          notes: c.notes || "",
        });
      } catch (err: any) {
        setError(err.message || "Failed to load customer");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [id, token]);

  const handleSubmit = async (formData: ICustomerFormData) => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update customer");
      }

      setSuccessMessage("Customer profile updated successfully!");
      setTimeout(() => {
        router.push(`/manager/customers/${id}`);
      }, 700);
    } catch (err: any) {
      setError(err.message || "An error occurred while updating the customer");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
        <p className="text-sm font-medium">Loading customer profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href={`/manager/customers/${id}`}
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Customer Profile</span>
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
          <Users className="w-4 h-4" />
          <span>Edit Guest Profile</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Update Customer Information
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Modify contact details, identity verification, and special stay notes.
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

      {initialData && (
        <CustomerForm
          initialData={initialData}
          onSubmit={handleSubmit}
          isSubmitting={submitting}
          submitButtonText="Save Changes"
          cancelHref={`/manager/customers/${id}`}
        />
      )}
    </div>
  );
}
