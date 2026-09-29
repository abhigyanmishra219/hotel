"use client";

import React, { useState } from "react";
import {
  Receipt,
  Search,
  Filter,
  CreditCard,
  DollarSign,
  Download,
  AlertCircle,
  Building2,
  CheckCircle,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";

interface PaymentTransaction {
  id: string;
  invoiceNumber: string;
  hotelName: string;
  hotelCode: string;
  amount: number;
  plan: string;
  paymentMethod: string;
  date: string;
  status: "PAID" | "PENDING" | "FAILED";
}

const SAMPLE_TRANSACTIONS: PaymentTransaction[] = [
  {
    id: "tx-001",
    invoiceNumber: "INV-2026-0089",
    hotelName: "Grand Palace Hotel A",
    hotelCode: "HOT-000001",
    amount: 2490,
    plan: "Professional Resort (Annual)",
    paymentMethod: "Visa ending in •••• 4242",
    date: "Sep 28, 2026",
    status: "PAID",
  },
  {
    id: "tx-002",
    invoiceNumber: "INV-2026-0090",
    hotelName: "Ocean View Resort Hotel B",
    hotelCode: "HOT-000002",
    amount: 4800,
    plan: "Enterprise Royale (Annual)",
    paymentMethod: "Mastercard ending in •••• 8812",
    date: "Sep 27, 2026",
    status: "PAID",
  },
];

export default function AdminPaymentsPage() {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(SAMPLE_TRANSACTIONS);
  const [search, setSearch] = useState("");

  const filtered = transactions.filter(
    (t) =>
      t.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.hotelName.toLowerCase().includes(search.toLowerCase()) ||
      t.hotelCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <AdminPageHeader
        title="Payments &amp; Transactions"
        subtitle="View tenant subscription payments, invoice history, and billing settlement records"
        badge="Financial Ledger"
      />

      {/* Gateway Status Banner */}
      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3 text-xs text-indigo-300">
        <CreditCard className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold text-white">Payment Processing Infrastructure</strong>
          <p className="text-slate-300 mt-0.5">
            SaaS subscription invoices are securely logged. Stripe webhook synchronization and payout management are configured for live production settlement.
          </p>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-medium">Total Volume</span>
          <p className="text-2xl font-bold text-white mt-1">$7,290.00</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-emerald-400 font-medium">Successful Payments</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">2</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-medium">Pending Invoices</span>
          <p className="text-2xl font-bold text-slate-400 mt-1">0</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-rose-400 font-medium">Failed Charges</span>
          <p className="text-2xl font-bold text-rose-400 mt-1">0</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/60 border border-slate-800 rounded-2xl p-3 sm:p-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search payments by invoice #, hotel name, or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/60 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:ring-2 focus:ring-amber-400/50"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase font-semibold tracking-wider">
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Hotel Property</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Plan Description</th>
                <th className="py-3.5 px-4">Payment Method</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-4 px-4 font-mono font-bold text-amber-400">
                    {tx.invoiceNumber}
                  </td>

                  <td className="py-4 px-4">
                    <div className="font-semibold text-white">{tx.hotelName}</div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {tx.hotelCode}
                    </span>
                  </td>

                  <td className="py-4 px-4 font-mono font-bold text-slate-100 text-sm">
                    ${tx.amount.toLocaleString()}
                  </td>

                  <td className="py-4 px-4 text-slate-300">{tx.plan}</td>

                  <td className="py-4 px-4 font-mono text-slate-400 text-[11px]">
                    {tx.paymentMethod}
                  </td>

                  <td className="py-4 px-4 text-slate-400">{tx.date}</td>

                  <td className="py-4 px-4">
                    <AdminStatusBadge status={tx.status} />
                  </td>

                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => alert(`Downloading ${tx.invoiceNumber} PDF receipt...`)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
