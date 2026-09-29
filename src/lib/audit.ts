import mongoose, { Types } from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";
import { AuditAction } from "@/types/audit";

export interface LogAuditParams {
  userId?: string | Types.ObjectId | null;
  hotelId?: string | Types.ObjectId | null;
  action: AuditAction;
  entity: string;
  entityId?: string | Types.ObjectId | null;
  description: string;
  metadata?: Record<string, any>;
}

// Sensitive fields to automatically redact/sanitize from audit log metadata
const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "currentpassword",
  "newpassword",
  "confirmpassword",
  "token",
  "jwt",
  "secret",
  "authorization",
  "accesstoken",
  "refreshtoken",
  "apikey",
  "creditcard",
  "cvv",
  "cardnumber",
]);

/**
 * Recursively sanitizes metadata object to strip plaintext passwords, tokens, and secrets.
 */
function sanitizeMetadata(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeMetadata(item));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes("password") || lowerKey.includes("secret")) {
      sanitized[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !(value instanceof Date) && !(value instanceof Types.ObjectId)) {
      sanitized[key] = sanitizeMetadata(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Creates an immutable Audit Log record in MongoDB.
 * Never throws an uncaught error to prevent interrupting primary transactional operations.
 */
export async function logAudit(params: LogAuditParams) {
  try {
    await connectToDatabase();

    const formattedUserId =
      params.userId && typeof params.userId === "string" && mongoose.Types.ObjectId.isValid(params.userId)
        ? new mongoose.Types.ObjectId(params.userId)
        : params.userId || null;

    const formattedHotelId =
      params.hotelId && typeof params.hotelId === "string" && mongoose.Types.ObjectId.isValid(params.hotelId)
        ? new mongoose.Types.ObjectId(params.hotelId)
        : params.hotelId || null;

    const sanitizedMeta = sanitizeMetadata(params.metadata || {});

    const logEntry = await AuditLog.create({
      userId: formattedUserId,
      hotelId: formattedHotelId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ? params.entityId.toString() : undefined,
      description: params.description,
      metadata: sanitizedMeta,
    });

    return logEntry;
  } catch (error) {
    console.error("⚠️ Failed to write audit log entry:", error);
    return null;
  }
}
