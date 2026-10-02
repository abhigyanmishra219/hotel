"use client";

import ManagerInvoiceDetailsPage from "@/app/manager/invoices/[id]/page";

export default function BillingInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ManagerInvoiceDetailsPage params={params} />;
}
