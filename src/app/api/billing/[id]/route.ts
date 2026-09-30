import { NextRequest, NextResponse } from "next/server";
import { GET as getInvoiceById } from "@/app/api/invoices/[id]/route";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return getInvoiceById(req, context);
}
