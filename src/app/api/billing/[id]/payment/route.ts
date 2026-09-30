import { NextRequest, NextResponse } from "next/server";
import { POST as recordPayment } from "@/app/api/invoices/[id]/payment/route";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return recordPayment(req, context);
}
