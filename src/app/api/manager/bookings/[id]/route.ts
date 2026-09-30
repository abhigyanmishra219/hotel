import { NextRequest } from "next/server";
import {
  GET as bookingIdGET,
  PATCH as bookingIdPATCH,
} from "@/app/api/bookings/[id]/route";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteParams) {
  return bookingIdGET(req, context);
}

export async function PATCH(req: NextRequest, context: RouteParams) {
  return bookingIdPATCH(req, context);
}
