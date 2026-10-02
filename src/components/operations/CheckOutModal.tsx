"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  DoorClosed,
  Calendar,
  User,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  Receipt,
  Sparkles,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { IBookingData } from "@/types/booking";

interface AdditionalChargeInput {
  description: string;
  amount: number;
}

interface CheckOutModalProps {
  booking: any | null;
  isOpen: boolean;
  portalType: "manager" | "receptionist";
  onClose: () => void;
  onSuccess: () => void;
  existingPaid?: number;
  existingAdditionalCharges?: AdditionalChargeInput[];
}

export default function CheckOutModal({
  booking,
  isOpen,
  portalType,
  onClose,
  onSuccess,
  existingPaid = 0,
  existingAdditionalCharges = [],
}: CheckOutModalProps) {
  const router = useRouter();
  const { token } = useUser();

  const [additionalCharges, setAdditionalCharges] = useState<AdditionalChargeInput[]>([]);
  const [newChargeDesc, setNewChargeDesc] = useState("");
  const [newChargeAmount, setNewChargeAmount] = useState("");
  const [discount, setDiscount] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState("");

  // Actual Checkout Date & Time state
  const getCurrentDateString = () => new Date().toISOString().split("T")[0];
  const getCurrentTimeString = () =>
    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const [checkoutDate, setCheckoutDate] = useState<string>(getCurrentDateString());
  const [checkoutTime, setCheckoutTime] = useState<string>(getCurrentTimeString());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priorPaid = existingPaid || booking?.totalPaid || 0;

  React.useEffect(() => {
    if (booking && isOpen) {
      setDiscount(booking.discount || 0);
      setAdditionalCharges(existingAdditionalCharges || []);
      setAmountPaid(0);
      setNewChargeDesc("");
      setNewChargeAmount("");
      setNotes("");
      setCheckoutDate(getCurrentDateString());
      setCheckoutTime(getCurrentTimeString());
      setError(null);
    }
  }, [booking, isOpen, existingAdditionalCharges]);

  if (!isOpen || !booking) return null;

  const customer: any = booking.customerId || {};
  const room: any = booking.roomId || {};

  // Billing calculation preview
  const scheduledNights = booking.numberOfNights || 1;
  const pricePerNight = booking.pricePerNight || 0;
  const roomAmount = pricePerNight * scheduledNights;

  const additionalChargesTotal = additionalCharges.reduce(
    (acc, curr) => acc + (Number(curr.amount) || 0),
    0
  );

  const taxableAmount = Math.max(0, roomAmount + additionalChargesTotal - (discount || 0));
  const tax = Math.round(taxableAmount * 0.12);
  const totalAmount = taxableAmount + tax;

  const netBalanceDue = Math.max(0, totalAmount - priorPaid);
  const remainingAfterPayment = Math.max(0, netBalanceDue - (amountPaid || 0));

  const handleAddCharge = () => {
    if (!newChargeDesc.trim()) return;
    const amt = Math.max(0, parseFloat(newChargeAmount) || 0);
    if (amt <= 0) return;

    setAdditionalCharges((prev) => [
      ...prev,
      { description: newChargeDesc.trim(), amount: amt },
    ]);
    setNewChargeDesc("");
    setNewChargeAmount("");
  };

  const handleRemoveCharge = (index: number) => {
    setAdditionalCharges((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/bookings/${booking._id}/check-out`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          checkOutDate: checkoutDate,
          checkOutTime: checkoutTime,
          additionalCharges,
          discount: Number(discount) || 0,
          amountPaid: Number(amountPaid) || 0,
          paymentMethod,
          transactionRef: transactionRef.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process check-out");
      }

      onSuccess();
      onClose();

      // Navigate to generated invoice
      if (data.invoice?._id) {
        router.push(`/${portalType}/invoices/${data.invoice._id}`);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during check-out.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <DoorClosed className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Check-out & Final Folio Settlement
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Booking: {booking.bookingId} • Room {room.roomNumber}
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

        <form onSubmit={handleConfirmCheckOut} className="space-y-5">
          {/* Guest & Stay Summary */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Guest</span>
              <span className="font-bold text-white truncate block">
                {customer.fullName || "Guest"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Room</span>
              <span className="font-bold text-amber-400 block">
                Room {room.roomNumber} ({room.roomType})
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Scheduled Check-in</span>
              <span className="font-medium text-slate-300 block">
                {new Date(booking.checkInDate).toLocaleDateString()}{" "}
                {booking.checkInAt ? new Date(booking.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Scheduled Checkout</span>
              <span className="font-medium text-slate-300 block">
                {new Date(booking.checkOutDate).toLocaleDateString()}{" "}
                {booking.checkOutAt ? new Date(booking.checkOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "11:00 AM"}
              </span>
            </div>
          </div>

          {/* Actual Checkout Date & Time Selector */}
          <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Actual Checkout Schedule
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Actual Checkout Date *
                </label>
                <input
                  type="date"
                  required
                  value={checkoutDate}
                  onChange={(e) => setCheckoutDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Actual Checkout Time *
                </label>
                <input
                  type="time"
                  required
                  value={checkoutTime}
                  onChange={(e) => setCheckoutTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                />
              </div>
            </div>
          </div>

          {/* Section 1: Additional Services / Charges */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Additional Charges & Services</span>
              <span className="text-[11px] text-slate-400">
                Extra Bed, Laundry, Food & Beverage
              </span>
            </div>

            {/* Existing List */}
            {additionalCharges.length > 0 && (
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950/40 overflow-hidden">
                {additionalCharges.map((ch, i) => (
                  <div
                    key={i}
                    className="p-2.5 flex items-center justify-between text-xs text-slate-300"
                  >
                    <span>{ch.description}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-white">
                        ₹{ch.amount.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCharge(i)}
                        className="text-rose-400 hover:text-rose-300 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Charge Inputs */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Service (e.g. Laundry, Extra Bed)"
                value={newChargeDesc}
                onChange={(e) => setNewChargeDesc(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              />
              <input
                type="number"
                placeholder="Amount ₹"
                value={newChargeAmount}
                onChange={(e) => setNewChargeAmount(e.target.value)}
                className="w-28 px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              />
              <button
                type="button"
                onClick={handleAddCharge}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Section 2: Bill Summary Box */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Room Accommodation ({scheduledNights} Nights × ₹{pricePerNight}):</span>
              <span className="font-mono text-white">₹{roomAmount.toLocaleString()}</span>
            </div>

            {additionalChargesTotal > 0 && (
              <div className="flex items-center justify-between text-slate-400">
                <span>Additional Services Total:</span>
                <span className="font-mono text-white">
                  + ₹{additionalChargesTotal.toLocaleString()}
                </span>
              </div>
            )}

            {discount > 0 && (
              <div className="flex items-center justify-between text-emerald-400">
                <span>Discount:</span>
                <span className="font-mono">- ₹{discount.toLocaleString()}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-slate-400">
              <span>12% GST Tax:</span>
              <span className="font-mono text-white">₹{tax.toLocaleString()}</span>
            </div>

            {priorPaid > 0 && (
              <div className="flex items-center justify-between text-emerald-400">
                <span>Previously Paid / Deposits:</span>
                <span className="font-mono">₹{priorPaid.toLocaleString()}</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="font-bold text-white text-sm">Total Stay Charges:</span>
              <span className="font-black text-white text-lg">
                ₹{totalAmount.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between text-amber-400 font-semibold pt-1">
              <span>Unsettled Balance Due:</span>
              <span className="font-mono text-base font-bold">
                ₹{netBalanceDue.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Section 3: Payment Capture */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
            <span className="text-xs font-bold text-white block">Checkout Payment Settlement</span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Amount Paid Now (₹)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={netBalanceDue}
                    value={amountPaid}
                    onChange={(e) =>
                      setAmountPaid(
                        Math.max(0, Math.min(netBalanceDue, parseFloat(e.target.value) || 0))
                      )
                    }
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                  />
                  {netBalanceDue > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmountPaid(netBalanceDue)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold hover:bg-emerald-500/30"
                    >
                      Pay Full Due
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Transaction Ref (Optional)
                </label>
                <input
                  type="text"
                  placeholder="UPI Ref, Card Last 4"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Remaining Balance Post Checkout:</span>
              <span
                className={`font-mono font-bold ${
                  remainingAfterPayment > 0 ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                ₹{remainingAfterPayment.toLocaleString()} {remainingAfterPayment === 0 ? "(Fully Settled)" : ""}
              </span>
            </div>

            {remainingAfterPayment > 0 && (
              <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Outstanding Balance: ₹{remainingAfterPayment.toLocaleString()}</span>
                  <span>Please collect payment or proceed according to your property's checkout credit policy.</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs text-slate-300">
            Completing check-out automatically transitions Room <strong>{(room as any)?.roomNumber}</strong> status to{" "}
            <strong>CLEANING</strong> and generates the final tax invoice.
          </div>

          {/* Action Buttons */}
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
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Check-out...</span>
                </>
              ) : (
                <>
                  <DoorClosed className="w-4 h-4" />
                  <span>Confirm Check-out &amp; Generate Bill</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
