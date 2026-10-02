"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Printer,
  Download,
  DollarSign,
  DoorClosed,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import InvoicePrintView from "@/components/operations/InvoicePrintView";

interface FolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string | null;
  onAddPayment?: (data: any) => void;
  onCheckout?: (booking: any) => void;
}

export default function FolioModal({
  isOpen,
  onClose,
  targetId,
  onAddPayment,
  onCheckout,
}: FolioModalProps) {
  const { token } = useUser();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFolio = useCallback(async () => {
    if (!token || !targetId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/billing/${targetId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to load folio details");
      }

      setData(resData);
    } catch (err: any) {
      setError(err.message || "Failed to load billing folio");
    } finally {
      setLoading(false);
    }
  }, [token, targetId]);

  useEffect(() => {
    if (isOpen && targetId) {
      fetchFolio();
    } else {
      setData(null);
      setError(null);
    }
  }, [isOpen, targetId, fetchFolio]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const invoice = data?.invoice || {};
  const hotel = data?.hotel || {};
  const isDraft = data?.isDraft ?? true;
  const booking = data?.booking || invoice?.bookingId || {};

  const totalCharges = invoice.totalAmount ?? invoice.roomAmount ?? 0;
  const amountPaid = invoice.amountPaid ?? 0;
  const amountDue = invoice.amountDue ?? Math.max(0, totalCharges - amountPaid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in print:p-0 print:bg-white print:static print:block">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl my-auto print:max-h-none print:w-full print:border-none print:shadow-none print:rounded-none">
        
        {/* Top Action Toolbar (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/60 print:hidden flex-shrink-0">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                isDraft
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              {isDraft ? "Draft / Current Folio" : "Finalized Tax Invoice"}
            </span>
            <span className="text-slate-400 text-xs font-mono">
              Ref: {invoice.invoiceId || booking.bookingId || targetId}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {amountDue > 0 && onAddPayment && (
              <button
                onClick={() => {
                  onClose();
                  onAddPayment(invoice);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Add Payment</span>
              </button>
            )}

            {isDraft && booking.status === "CHECKED_IN" && onCheckout && (
              <button
                onClick={() => {
                  onClose();
                  onCheckout(booking);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition"
              >
                <DoorClosed className="w-3.5 h-3.5" />
                <span>Checkout</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition"
              title="Print folio (A4)"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition"
              title="Save as PDF"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Download PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-slate-900 bg-slate-100 print:overflow-visible print:p-0 print:bg-white">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
              <p className="text-sm font-medium">Generating billing statement...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <p className="text-sm text-rose-600 font-semibold">{error}</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 print:border-none print:shadow-none">
              <InvoicePrintView invoice={invoice} hotel={hotel} isDraft={isDraft} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
