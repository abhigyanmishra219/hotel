import { NextRequest, NextResponse } from "next/server";
import { GET as getInvoices } from "@/app/api/invoices/route";

export async function GET(req: NextRequest) {
  return getInvoices(req);
}
