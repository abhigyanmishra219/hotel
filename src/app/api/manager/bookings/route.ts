import { NextRequest } from "next/server";
import { GET as bookingsGET, POST as bookingsPOST } from "@/app/api/bookings/route";

export async function GET(req: NextRequest) {
  return bookingsGET(req);
}

export async function POST(req: NextRequest) {
  return bookingsPOST(req);
}
