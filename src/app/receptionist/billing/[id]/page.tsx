"use client";

import ReceptionistInvoiceDetailsPage from "@/app/receptionist/invoices/[id]/page";

export default function ReceptionistBillingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ReceptionistInvoiceDetailsPage params={params} />;
}
