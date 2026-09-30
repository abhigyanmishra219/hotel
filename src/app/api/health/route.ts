import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";

/**
 * GET /api/health
 * Production health and readiness probe.
 * Checks database connectivity without leaking internal connection strings or credentials.
 */
export async function GET() {
  const startTime = Date.now();

  let databaseStatus = "disconnected";
  try {
    const conn = await connectToDatabase();
    if (conn.connection.readyState === 1) {
      databaseStatus = "connected";
    } else if (conn.connection.readyState === 2) {
      databaseStatus = "connecting";
    }
  } catch {
    databaseStatus = "error";
  }

  const responseTimeMs = Date.now() - startTime;
  const isHealthy = databaseStatus === "connected";

  return NextResponse.json(
    {
      status: isHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: databaseStatus,
      latencyMs: responseTimeMs,
      service: "GrandStay SaaS Core",
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
