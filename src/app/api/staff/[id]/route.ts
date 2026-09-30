import { NextRequest } from "next/server";
import {
  GET as managerStaffIdGET,
  PATCH as managerStaffIdPATCH,
  PUT as managerStaffIdPUT,
  DELETE as managerStaffIdDELETE,
} from "@/app/api/manager/staff/[id]/route";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteParams) {
  return managerStaffIdGET(req, context);
}

export async function PATCH(req: NextRequest, context: RouteParams) {
  return managerStaffIdPATCH(req, context);
}

export async function PUT(req: NextRequest, context: RouteParams) {
  return managerStaffIdPUT(req, context);
}

export async function DELETE(req: NextRequest, context: RouteParams) {
  return managerStaffIdDELETE(req, context);
}
