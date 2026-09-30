import { NextRequest } from "next/server";
import {
  GET as customerIdGET,
  PATCH as customerIdPATCH,
  DELETE as customerIdDELETE,
} from "@/app/api/customers/[id]/route";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteParams) {
  return customerIdGET(req, context);
}

export async function PATCH(req: NextRequest, context: RouteParams) {
  return customerIdPATCH(req, context);
}

export async function DELETE(req: NextRequest, context: RouteParams) {
  return customerIdDELETE(req, context);
}
