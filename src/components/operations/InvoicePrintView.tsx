"use client";

import React from "react";
import { Building2, CheckCircle2, ShieldCheck } from "lucide-react";

export interface InvoicePrintViewProps {
  invoice: any;
  hotel?: any;
  isDraft?: boolean;
  className?: string;
}

export default function InvoicePrintView({
  invoice,
  hotel,
  isDraft = false,
  className = "",
}: InvoicePrintViewProps) {
  if (!invoice) return null;

  const booking = invoice.bookingId && typeof invoice.bookingId === "object"
    ? invoice.bookingId
    : {};
  const customer = invoice.customerId && typeof invoice.customerId === "object"
    ? invoice.customerId
    : {};
  const room = invoice.roomId && typeof invoice.roomId === "object"
    ? invoice.roomId
    : {};

  const guestName = customer.fullName || invoice.guestName || "Guest";
  const guestPhone = customer.phone || invoice.guestPhone || "";
  const guestEmail = customer.email || invoice.guestEmail || "";
  const guestAddress = [customer.address, customer.city, customer.state, customer.country]
    .filter(Boolean)
    .join(", ");

  const roomNumber = room.roomNumber || invoice.roomNumber || "N/A";
  const roomType = room.roomType || invoice.roomType || "Standard";

  // Check-in reference: Prioritize actual check-in, otherwise scheduled check-in (including time)
  const checkInTimestamp =
    booking.actualCheckInAt ||
    booking.actualCheckInDate ||
    booking.checkedInAt ||
    booking.checkInAt ||
    booking.checkInDate ||
    invoice.checkInDate;

  // Checkout reference: Prioritize actual checkout, otherwise scheduled checkout (including time)
  const checkOutTimestamp =
    booking.actualCheckOutAt ||
    booking.actualCheckOutDate ||
    booking.checkOutAt ||
    booking.checkOutDate ||
    invoice.checkOutDate;

  const formatDateTime = (d: any) => {
    if (!d) return "N/A";
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return "N/A";
    const datePart = dateObj.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timePart = dateObj.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${datePart}, ${timePart}`;
  };

  const isCheckedIn = !!(booking.actualCheckInAt || booking.actualCheckInDate || booking.checkedInAt);
  const isCheckedOut = !!(booking.actualCheckOutAt || booking.actualCheckOutDate);
  const nights = invoice.numberOfNights || booking.numberOfNights || 1;
  const pricePerNight = invoice.pricePerNight || booking.pricePerNight || 0;
  const roomAmount = invoice.roomAmount || pricePerNight * nights;

  const additionalCharges: Array<{ description: string; amount: number; date?: any }> =
    invoice.additionalCharges || [];

  const subtotal = roomAmount + additionalCharges.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const discount = invoice.discount || booking.discount || 0;
  const tax = invoice.tax ?? Math.round(Math.max(0, subtotal - discount) * 0.12);
  const totalAmount = invoice.totalAmount ?? Math.max(0, subtotal - discount) + tax;
  const amountPaid = invoice.amountPaid ?? 0;
  const amountDue = invoice.amountDue ?? Math.max(0, totalAmount - amountPaid);
  const paymentStatus = invoice.paymentStatus || (amountDue === 0 ? "PAID" : amountPaid > 0 ? "PARTIALLY_PAID" : "UNPAID");

  const paymentHistory: Array<{
    amount: number;
    paymentMethod: string;
    transactionRef?: string;
    recordedAt?: any;
    notes?: string;
  }> = invoice.paymentHistory || [];

  const invoiceNumber = invoice.invoiceId || (booking.bookingId ? `FOLIO-${booking.bookingId}` : "FOLIO-000001");
  const invoiceDate = invoice.createdAt || invoice.invoiceDate || new Date();

  return (
    <div
      className={`invoice-print-container bg-white text-slate-900 font-sans p-6 sm:p-8 max-w-4xl mx-auto shadow-sm rounded-none print:shadow-none print:max-w-none print:p-0 print:m-0 ${className}`}
      style={{ boxSizing: "border-box", width: "100%" }}
    >
      {/* 1. HOTEL HEADER */}
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-base print:bg-black">
              H
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase">
              {hotel?.name || "GrandStay Hotel"}
            </h1>
          </div>
          <p className="text-xs text-slate-600 max-w-md leading-relaxed">
            {[hotel?.address, hotel?.city, hotel?.state, hotel?.country].filter(Boolean).join(", ") ||
              "Luxury Hospitality Suites & Resorts"}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 font-medium">
            <span>Phone: {hotel?.phone || "+91 (Front Desk)"}</span>
            {hotel?.email && <span>• Email: {hotel.email}</span>}
            {hotel?.gstNumber && <span className="font-semibold text-slate-900">• GSTIN: {hotel.gstNumber}</span>}
          </div>
        </div>

        <div className="text-right">
          <span
            className={`inline-block px-3 py-1 rounded text-[11px] font-black tracking-widest uppercase mb-1 ${
              isDraft
                ? "bg-amber-100 text-amber-900 border border-amber-300"
                : "bg-slate-900 text-white print:bg-black"
            }`}
          >
            {isDraft ? "Draft Stay Folio" : "Tax Invoice"}
          </span>
          <p className="text-sm font-mono font-bold text-slate-900">{invoiceNumber}</p>
          <p className="text-[11px] text-slate-600 font-mono">
            Date: {new Date(invoiceDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
          {booking.bookingId && (
            <p className="text-[11px] text-slate-600 font-mono">
              Booking Ref: <strong>{booking.bookingId}</strong>
            </p>
          )}
        </div>
      </div>

      {/* 2. GUEST & STAY INFORMATION */}
      <div className="grid grid-cols-2 gap-4 border border-slate-300 rounded-lg p-3.5 mb-4 text-xs bg-slate-50/50 print:bg-transparent">
        {/* Guest Details */}
        <div className="space-y-1 border-r border-slate-200 pr-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Guest Information
          </span>
          <p className="font-bold text-sm text-slate-900">{guestName}</p>
          {guestPhone && <p className="text-slate-700">Phone: {guestPhone}</p>}
          {guestEmail && <p className="text-slate-700">Email: {guestEmail}</p>}
          {guestAddress && <p className="text-slate-600 text-[11px] truncate">Address: {guestAddress}</p>}
        </div>

        {/* Stay Details */}
        <div className="space-y-1 pl-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Stay Specification
          </span>
          <div className="flex justify-between">
            <span className="text-slate-600">Room Allocated:</span>
            <span className="font-bold text-slate-900">Room {roomNumber} ({roomType})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">
              {isCheckedIn ? "Check-In (Actual):" : "Check-In (Scheduled):"}
            </span>
            <span className="font-semibold text-slate-900">
              {formatDateTime(checkInTimestamp)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">
              {isCheckedOut ? "Check-Out (Actual):" : "Check-Out (Scheduled):"}
            </span>
            <span className="font-semibold text-slate-900">
              {formatDateTime(checkOutTimestamp)}
            </span>
          </div>
          <div className="flex justify-between pt-0.5 border-t border-slate-200">
            <span className="text-slate-600">Duration:</span>
            <span className="font-bold text-slate-900 font-mono">{nights} {nights === 1 ? "Night" : "Nights"}</span>
          </div>
        </div>
      </div>

      {/* 3. CHARGES BREAKDOWN TABLE */}
      <div className="mb-4 border border-slate-300 rounded-lg overflow-hidden text-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-bold text-slate-700 uppercase tracking-wider print:bg-slate-200">
              <th className="py-2 px-3">Description</th>
              <th className="py-2 px-3 text-center">Qty / Nights</th>
              <th className="py-2 px-3 text-right">Rate (₹)</th>
              <th className="py-2 px-3 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            <tr>
              <td className="py-2.5 px-3 font-semibold text-slate-950">
                Room Accommodation (Room {roomNumber} - {roomType})
              </td>
              <td className="py-2.5 px-3 text-center font-mono">{nights}N</td>
              <td className="py-2.5 px-3 text-right font-mono">₹{pricePerNight.toLocaleString()}</td>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-950">
                ₹{roomAmount.toLocaleString()}
              </td>
            </tr>

            {additionalCharges.map((ch, idx) => (
              <tr key={idx}>
                <td className="py-2 px-3">
                  <span>{ch.description}</span>
                  {ch.date && (
                    <span className="text-[10px] text-slate-500 ml-1.5">
                      ({new Date(ch.date).toLocaleDateString("en-GB")})
                    </span>
                  )}
                </td>
                <td className="py-2 px-3 text-center font-mono">1</td>
                <td className="py-2 px-3 text-right font-mono">₹{Number(ch.amount).toLocaleString()}</td>
                <td className="py-2 px-3 text-right font-mono font-bold text-slate-950">
                  ₹{Number(ch.amount).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. TOTALS & SUMMARY SECTION */}
      <div className="flex items-start justify-between gap-6 mb-4 text-xs">
        {/* Settlement Seal & Status */}
        <div className="space-y-2 max-w-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Payment Status:</span>
            <span
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                paymentStatus === "PAID"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : paymentStatus === "PARTIALLY_PAID"
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-rose-100 text-rose-800 border border-rose-300"
              }`}
            >
              {paymentStatus === "PAID"
                ? "Paid in Full"
                : paymentStatus === "PARTIALLY_PAID"
                ? "Partially Paid"
                : "Payment Due"}
            </span>
          </div>

          {/* Payment Receipts Info */}
          {paymentHistory.length > 0 ? (
            <div className="border border-slate-200 rounded p-2 bg-slate-50 print:bg-transparent space-y-1">
              <span className="text-[10px] font-bold text-slate-600 uppercase block">
                Payment Transactions
              </span>
              {paymentHistory.map((p, i) => (
                <div key={i} className="flex justify-between text-[11px] text-slate-700">
                  <span>
                    ₹{Number(p.amount).toLocaleString()} ({p.paymentMethod || "CASH"})
                    {p.transactionRef && ` • Ref: ${p.transactionRef}`}
                  </span>
                  <span className="font-mono text-slate-500">
                    {p.recordedAt ? new Date(p.recordedAt).toLocaleDateString("en-GB") : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic">No payments logged yet.</p>
          )}
        </div>

        {/* Financial Calculation Totals */}
        <div className="w-64 space-y-1.5 border border-slate-200 rounded-lg p-3 bg-slate-50/50 print:bg-transparent">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal:</span>
            <span className="font-mono font-medium text-slate-900">₹{subtotal.toLocaleString()}</span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Discount:</span>
              <span className="font-mono">- ₹{discount.toLocaleString()}</span>
            </div>
          )}

          <div className="flex justify-between text-slate-600">
            <span>GST Tax (12%):</span>
            <span className="font-mono font-medium text-slate-900">₹{tax.toLocaleString()}</span>
          </div>

          <div className="flex justify-between text-sm font-black border-t-2 border-slate-900 pt-1.5 text-slate-950">
            <span>TOTAL:</span>
            <span className="font-mono text-base">₹{totalAmount.toLocaleString()}</span>
          </div>

          <div className="flex justify-between text-emerald-700 font-semibold pt-1 border-t border-slate-200">
            <span>Amount Paid:</span>
            <span className="font-mono">₹{amountPaid.toLocaleString()}</span>
          </div>

          <div className="flex justify-between font-bold pt-1 border-t border-slate-300 text-slate-900">
            <span>Balance Due:</span>
            <span className={`font-mono text-sm ${amountDue > 0 ? "text-amber-700" : "text-emerald-700"}`}>
              ₹{amountDue.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 5. FOOTER */}
      <div className="border-t border-slate-300 pt-3 text-center text-[10px] text-slate-500 space-y-0.5">
        <p className="font-semibold text-slate-700">Thank you for staying with us at {hotel?.name || "GrandStay Hotel"}!</p>
        <p>This is a computer-generated tax invoice and requires no physical signature.</p>
        <p className="text-[9px] text-slate-400">
          {[hotel?.name, hotel?.phone, hotel?.email].filter(Boolean).join(" • ")}
        </p>
      </div>
    </div>
  );
}
