"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  Printer,
  ArrowLeft,
  Receipt,
  Building2,
  Calendar,
  User,
  DoorOpen,
  DollarSign,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { IInvoiceData } from "@/types/invoice";
import PaymentModal from "@/components/operations/PaymentModal";

export default function ReceptionistInvoiceDetailsPage({
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
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
        <p className="text-sm font-medium">Loading tax invoice folio...</p>
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
          href="/receptionist/billing"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Billing</span>
        </Link>
      </div>
    );
  }

  const customer: any = invoice.customerId || {};
  const room: any = invoice.roomId || {};
  const booking: any = invoice.bookingId || {};
  const generatedBy: any = invoice.generatedBy || {};

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/receptionist/billing"
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Folio / Invoice</span>
          </button>
        </div>
      </div>

      {/* PRINTABLE INVOICE FOLIO CONTAINER */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-8 text-white print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        {/* Hotel Header & Invoice Title */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pb-6 border-b border-slate-800 print:border-neutral-300">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-cyan-500 text-slate-950 flex items-center justify-center font-bold print:hidden">
                <Building2 className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white print:text-black">
                {hotel?.name || "GrandStay Hotel"}
              </h1>
            </div>
            <p className="text-xs text-slate-400 print:text-neutral-600">
              {[hotel?.address, hotel?.city, hotel?.state, hotel?.country]
                .filter(Boolean)
                .join(", ")}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 print:text-neutral-600 mt-1">
              <span>Phone: {hotel?.phone || "Front Desk"}</span>
              {hotel?.email && <span>• Email: {hotel.email}</span>}
              <span>• Property ID: {hotel?.hotelCode || "HOTEL"}</span>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 print:text-neutral-800 block">
              Official Tax Invoice
            </span>
            <span className="font-mono text-xl sm:text-2xl font-black text-white print:text-black block mt-0.5">
              {invoice.invoiceId}
            </span>
            <span className="text-xs text-slate-400 print:text-neutral-600 block mt-1">
              Date: {new Date(invoice.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </span>
            <span className="text-[10px] text-slate-500 print:text-neutral-500 block font-mono">
              Booking Ref: {booking?.bookingId || "N/A"}
            </span>
          </div>
        </div>

        {/* Guest & Stay Specification Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          {/* Bill To / Guest Info */}
          <div className="p-4 bg-slate-950/60 print:bg-neutral-50 border border-slate-800 print:border-neutral-200 rounded-2xl space-y-2">
            <span className="text-[10px] uppercase font-bold text-cyan-400 print:text-neutral-700 tracking-wider block">
              Billed To (Guest)
            </span>
            <h3 className="text-sm font-bold text-white print:text-black">
              {customer.fullName || "Guest"}
            </h3>
            <p className="text-slate-300 print:text-neutral-700">Phone: {customer.phone || "N/A"}</p>
            {customer.email && (
              <p className="text-slate-300 print:text-neutral-700">Email: {customer.email}</p>
            )}
            {customer.idType && (
              <p className="text-slate-400 print:text-neutral-600">
                Identity: {customer.idType} ({customer.idNumber || "Recorded"})
              </p>
            )}
            {customer.city && (
              <p className="text-slate-400 print:text-neutral-600">
                City: {[customer.city, customer.state, customer.country].filter(Boolean).join(", ")}
              </p>
            )}
          </div>

          {/* Stay & Room Info */}
          <div className="p-4 bg-slate-950/60 print:bg-neutral-50 border border-slate-800 print:border-neutral-200 rounded-2xl space-y-2">
            <span className="text-[10px] uppercase font-bold text-cyan-400 print:text-neutral-700 tracking-wider block">
              Stay Itinerary
            </span>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 print:text-neutral-600">Room Allocated:</span>
              <span className="font-bold text-white print:text-black">
                Room {room.roomNumber} ({room.roomType})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 print:text-neutral-600">Check-in:</span>
              <span className="font-semibold text-slate-200 print:text-neutral-800">
                {new Date(booking.checkInDate || invoice.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 print:text-neutral-600">Check-out:</span>
              <span className="font-semibold text-slate-200 print:text-neutral-800">
                {booking.actualCheckOutDate
                  ? new Date(booking.actualCheckOutDate).toLocaleDateString()
                  : new Date(booking.checkOutDate || invoice.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 print:text-neutral-600">Total Billed Stay:</span>
              <span className="font-bold text-cyan-400 print:text-black font-mono">
                {invoice.numberOfNights} {invoice.numberOfNights === 1 ? "Night" : "Nights"}
              </span>
            </div>
          </div>
        </div>

        {/* Itemized Charges Table */}
        <div className="overflow-hidden border border-slate-800 print:border-neutral-300 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 print:bg-neutral-100 border-b border-slate-800 print:border-neutral-300 text-[10px] font-bold text-slate-400 print:text-neutral-700 uppercase tracking-wider">
                <th className="py-3 px-4">Item Description</th>
                <th className="py-3 px-4 text-center">Qty / Nights</th>
                <th className="py-3 px-4 text-right">Unit Rate</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 print:divide-neutral-200 text-slate-300 print:text-neutral-900">
              {/* Room Accommodation */}
              <tr>
                <td className="py-3.5 px-4 font-semibold text-white print:text-black">
                  Room Accommodation (Room {room.roomNumber} - {room.roomType})
                </td>
                <td className="py-3.5 px-4 text-center font-mono">{invoice.numberOfNights}N</td>
                <td className="py-3.5 px-4 text-right font-mono">₹{invoice.pricePerNight?.toLocaleString()}</td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-white print:text-black">
                  ₹{invoice.roomAmount?.toLocaleString()}
                </td>
              </tr>

              {/* Additional Services */}
              {invoice.additionalCharges &&
                invoice.additionalCharges.map((ch, idx) => (
                  <tr key={idx}>
                    <td className="py-3 px-4">
                      <span>{ch.description}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">1</td>
                    <td className="py-3 px-4 text-right font-mono">₹{ch.amount?.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white print:text-black">
                      ₹{ch.amount?.toLocaleString()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Financial Subtotals & Totals Box */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pt-2">
          {/* Payment Status Seal */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 print:text-neutral-600">Settlement Status:</span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  invoice.paymentStatus === "PAID"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 print:bg-neutral-100 print:text-emerald-700"
                    : invoice.paymentStatus === "PARTIALLY_PAID"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 print:bg-neutral-100 print:text-amber-700"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/40 print:bg-neutral-100 print:text-rose-700"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-current" />
                {invoice.paymentStatus === "PAID"
                  ? "Paid in Full"
                  : invoice.paymentStatus === "PARTIALLY_PAID"
                  ? "Partially Settled"
                  : "Payment Due"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 print:text-neutral-500">
              Cashier: {generatedBy.name || "Front Desk"} ({generatedBy.role || "STAFF"})
            </p>
          </div>

          {/* Pricing Totals List */}
          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400 print:text-neutral-700">
              <span>Gross Charges:</span>
              <span className="font-mono text-white print:text-black">
                ₹{((invoice.roomAmount || 0) + (invoice.additionalCharges?.reduce((a, b) => a + b.amount, 0) || 0)).toLocaleString()}
              </span>
            </div>

            {invoice.discount > 0 && (
              <div className="flex items-center justify-between text-emerald-400 print:text-emerald-700">
                <span>Discount:</span>
                <span className="font-mono">- ₹{invoice.discount.toLocaleString()}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-slate-400 print:text-neutral-700">
              <span>12% GST Tax:</span>
              <span className="font-mono text-white print:text-black">₹{invoice.tax?.toLocaleString()}</span>
            </div>

            <div className="pt-2 border-t border-slate-800 print:border-neutral-300 flex items-center justify-between text-sm">
              <span className="font-bold text-white print:text-black">Grand Total:</span>
              <span className="font-black text-lg text-white print:text-black">
                ₹{invoice.totalAmount?.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between text-emerald-400 print:text-emerald-700 font-semibold">
              <span>Total Paid:</span>
              <span className="font-mono">₹{invoice.amountPaid?.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between text-amber-400 print:text-amber-800 font-bold pt-1 border-t border-slate-800/60 print:border-neutral-200">
              <span>Balance Due:</span>
              <span className="font-mono text-base">₹{invoice.amountDue?.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Payment History Audit Ledger */}
        {invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
          <div className="pt-4 border-t border-slate-800 print:border-neutral-300 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 print:text-neutral-600 tracking-wider">
              Payment Receipts Log
            </span>
            <div className="divide-y divide-slate-800 print:divide-neutral-200 border border-slate-800 print:border-neutral-300 rounded-xl overflow-hidden text-xs">
              {invoice.paymentHistory.map((p, i) => (
                <div key={i} className="p-2.5 flex items-center justify-between bg-slate-950/40 print:bg-white text-slate-300 print:text-neutral-800">
                  <div>
                    <span className="font-semibold text-white print:text-black">
                      ₹{p.amount.toLocaleString()} ({p.paymentMethod})
                    </span>
                    {p.transactionRef && (
                      <span className="text-[10px] text-slate-500 print:text-neutral-500 block font-mono">
                        Ref: {p.transactionRef}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 print:text-neutral-600 font-mono">
                    {new Date(p.recordedAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Terms */}
        <div className="pt-6 border-t border-slate-800 print:border-neutral-300 text-center text-[10px] text-slate-500 print:text-neutral-600 space-y-1">
          <p>Thank you for staying with us at {hotel?.name || "GrandStay Hotel Property"}.</p>
          <p>This is a computer-generated tax invoice and requires no physical signature.</p>
        </div>
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
