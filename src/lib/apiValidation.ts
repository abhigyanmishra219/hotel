import mongoose from "mongoose";
import { NextResponse } from "next/server";

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Sanitizes and caps pagination parameters to prevent memory exhaustion and negative offsets.
 * Max limit is enforced at 100 items per page.
 */
export function sanitizePagination(
  rawPage?: string | number | null,
  rawLimit?: string | number | null,
  maxLimit: number = 100
): PaginationParams {
  const parsedPage = typeof rawPage === "number" ? rawPage : parseInt(rawPage || "1", 10);
  const parsedLimit = typeof rawLimit === "number" ? rawLimit : parseInt(rawLimit || "20", 10);

  const page = Math.max(1, isNaN(parsedPage) ? 1 : parsedPage);
  const limit = Math.min(
    maxLimit,
    Math.max(1, isNaN(parsedLimit) ? 20 : parsedLimit)
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Validates a MongoDB ObjectId string.
 */
export function isValidObjectId(id?: string | null): boolean {
  if (!id || typeof id !== "string") return false;
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

/**
 * Escapes user input for safe use in RegExp queries to prevent ReDoS and injection.
 */
export function sanitizeRegex(pattern: string): string {
  if (!pattern || typeof pattern !== "string") return "";
  return pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Sanitizes an object to strip dangerous MongoDB operator keys ($where, $gt, $ne, etc.)
 */
export function sanitizeQueryObject<T = any>(obj: any): T {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeQueryObject(item)) as unknown as T;
  }

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("$")) {
      // Disallow client-provided MongoDB operators
      continue;
    }
    if (value && typeof value === "object" && !(value instanceof Date) && !(value instanceof mongoose.Types.ObjectId)) {
      clean[key] = sanitizeQueryObject(value);
    } else {
      clean[key] = value;
    }
  }

  return clean as T;
}

/**
 * Standardized API Error Response Formatter
 */
export function apiError(
  message: string,
  statusCode: number = 400,
  code: string = "BAD_REQUEST",
  details?: any
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status: statusCode }
  );
}

/**
 * Standardized API Success Response Formatter
 */
export function apiSuccess<T = any>(data: T, statusCode: number = 200, meta?: any) {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(meta ? { meta } : {}),
    },
    { status: statusCode }
  );
}
