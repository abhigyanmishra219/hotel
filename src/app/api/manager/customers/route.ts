import { NextRequest } from "next/server";
import { GET as customersGET, POST as customersPOST } from "@/app/api/customers/route";

export async function GET(req: NextRequest) {
  return customersGET(req);
}

export async function POST(req: NextRequest) {
  return customersPOST(req);
}
