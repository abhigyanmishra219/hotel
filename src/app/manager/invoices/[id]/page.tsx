"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  Printer,
  Download,
  ArrowLeft,
  DollarSign,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { IInvoiceData } from "@/types/invoice";
import PaymentModal from "@/components/operations/PaymentModal";
import InvoicePrintView from "@/components/operations/InvoicePrintView";

export default function ManagerInvoiceDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { token } = useUser();

  const [invoice, setInvoice] = useState<IInvoiceData | null>(null);
  const [hotel, setHotel] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment Recording Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const fetchInvoice = useCallback(async () => {
    if (!token || !resolvedParams.id) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/invoices/${resolvedParams.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load invoice");
      }

      setInvoice(data.invoice);
      setHotel(data.hotel);
    } catch (err: any) {
      setError(err.message || "Failed to load tax invoice record");
    } finally {
      setLoading(false);
    }
  }, [token, resolvedParams.id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
        <p className="text-sm font-medium">Loading tax invoice document...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Invoice Unavailable</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          {error || "The requested invoice was not found or belongs to another property."}
        </p>
        <Link
          href="/manager/billing"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Billing</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4 sm:py-6 px-4 pb-16">
      {/* Top Action Bar (Strictly hidden on print) */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/manager/billing"
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Billing</span>
        </Link>

        <div className="flex items-center gap-2.5">
          {invoice.amountDue > 0 && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition"
            >
              <DollarSign className="w-4 h-4" />
              <span>Record Payment (Due: ₹{invoice.amountDue.toLocaleString()})</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* DEDICATED INVOICE DOCUMENT DISPLAY */}
      <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-white print:border-none print:shadow-none print:rounded-none">
        <InvoicePrintView invoice={invoice} hotel={hotel} isDraft={false} />
      </div>

      {/* PAYMENT MODAL */}
      <PaymentModal
        invoice={invoice}
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => fetchInvoice()}
      />
    </div>
  );
}
