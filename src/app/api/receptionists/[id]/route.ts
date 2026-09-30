import { NextRequest } from "next/server";
import {
  GET as managerReceptionistIdGET,
  PATCH as managerReceptionistIdPATCH,
  PUT as managerReceptionistIdPUT,
  DELETE as managerReceptionistIdDELETE,
} from "@/app/api/manager/receptionists/[id]/route";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteParams) {
  return managerReceptionistIdGET(req, context);
}

export async function PATCH(req: NextRequest, context: RouteParams) {
  return managerReceptionistIdPATCH(req, context);
}

export async function PUT(req: NextRequest, context: RouteParams) {
  return managerReceptionistIdPUT(req, context);
}

export async function DELETE(req: NextRequest, context: RouteParams) {
  return managerReceptionistIdDELETE(req, context);
}
