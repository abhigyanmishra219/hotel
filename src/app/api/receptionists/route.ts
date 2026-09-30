import { NextRequest } from "next/server";
import {
  GET as managerReceptionistsGET,
  POST as managerReceptionistsPOST,
} from "@/app/api/manager/receptionists/route";

export async function GET(req: NextRequest) {
  return managerReceptionistsGET(req);
}

export async function POST(req: NextRequest) {
  return managerReceptionistsPOST(req);
}
