import { NextRequest } from "next/server";
import { GET as managerStaffGET, POST as managerStaffPOST } from "@/app/api/manager/staff/route";

export async function GET(req: NextRequest) {
  return managerStaffGET(req);
}

export async function POST(req: NextRequest) {
  return managerStaffPOST(req);
}
