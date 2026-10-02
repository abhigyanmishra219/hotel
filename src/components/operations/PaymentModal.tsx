"use client";

import React, { useState } from "react";
import {
  DollarSign,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Receipt,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { IInvoiceData } from "@/types/invoice";

interface PaymentModalProps {
  invoice: IInvoiceData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentModal({
  invoice,
  isOpen,
  onClose,
  onSuccess,
}: {
  invoice: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { token } = useUser();
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetDue = invoice 
    ? (invoice.amountDue !== undefined ? invoice.amountDue : (invoice.balance !== undefined ? invoice.balance : 0))
    : 0;
  const targetTotal = invoice
    ? (invoice.totalAmount !== undefined ? invoice.totalAmount : (invoice.totalCharges !== undefined ? invoice.totalCharges : 0))
    : 0;
  const targetPaid = invoice
    ? (invoice.amountPaid !== undefined ? invoice.amountPaid : (invoice.totalPaid !== undefined ? invoice.totalPaid : 0))
    : 0;

  React.useEffect(() => {
    if (invoice && isOpen) {
      setAmount(String(targetDue));
      setError(null);
      setTransactionRef("");
      setNotes("");
    }
  }, [invoice, isOpen, targetDue]);

  if (!isOpen || !invoice) return null;

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const payAmt = Math.round(parseFloat(amount) || 0);

    if (payAmt <= 0) {
      setError("Please enter a valid payment amount greater than ₹0.");
      return;
    }

    if (payAmt > targetDue) {
      setError(
        `Payment amount (₹${payAmt.toLocaleString()}) cannot exceed remaining balance due (₹${targetDue.toLocaleString()}).`
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const targetId = invoice.invoiceDbId || invoice._id;
      const res = await fetch(`/api/billing/${targetId}/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: payAmt,
          paymentMethod,
          transactionRef: transactionRef.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record payment");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred while recording payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Record Folio Payment</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {invoice.invoiceId || invoice.bookingId || "Folio"} • Total: ₹{targetTotal.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Total Charges:</span>
              <span className="font-mono text-white">₹{targetTotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Already Paid:</span>
              <span className="font-mono text-emerald-400">
                ₹{targetPaid.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span className="font-bold text-slate-300">Remaining Balance Due:</span>
              <span className="font-bold text-amber-400 text-sm font-mono">
                ₹{targetDue.toLocaleString()}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Payment Amount (₹) *
            </label>
            <div className="relative">
              <input
                type="number"
                required
                min={1}
                max={invoice.amountDue}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              />
              <button
                type="button"
                onClick={() => setAmount(String(invoice.amountDue))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold hover:bg-emerald-500/30"
              >
                Full Balance
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Credit / Debit Card</option>
              <option value="UPI">UPI / QR Code</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Transaction Reference (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. UPI Ref / Receipt No."
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="Payment remarks"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Record Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
