import { NextRequest, NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { verifyToken, UserTokenPayload } from "@/lib/jwt";
import { UserRole, USER_ROLES } from "@/types/roles";

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

/**
 * Extracts the JWT token from request headers (Authorization: Bearer <token>) or cookies.
 */
export async function extractTokenFromRequest(
  req?: NextRequest | Request
): Promise<string | null> {
  // 1. Check direct request headers if provided
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7).trim();
    }
  }

  // 2. Check Next.js server headers() if in App Router context
  try {
    const serverHeaders = await headers();
    const authHeader = serverHeaders.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7).trim();
    }
  } catch {
    // Ignore if not in server action/route handler context
  }

  // 3. Check cookies
  try {
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get("hotel_auth_token")?.value;
    if (cookieToken) return cookieToken;
  } catch {
    // Ignore if cookies are not accessible
  }

  return null;
}

/**
 * Retrieves the authenticated user from the current request or session.
 * @returns UserTokenPayload if valid token found, null otherwise.
 */
export async function getAuthenticatedUser(
  req?: NextRequest | Request
): Promise<UserTokenPayload | null> {
  const token = await extractTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Requires user to be authenticated. Throws 401 AuthError if unauthenticated.
 */
export async function requireAuth(
  req?: NextRequest | Request
): Promise<UserTokenPayload> {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    throw new AuthError("Unauthorized: Authentication token is missing or invalid", 401);
  }
  return user;
}

/**
 * Requires the user to have one of the specified roles. Throws 403 AuthError if unauthorized.
 */
export async function requireRole(
  roles: UserRole | UserRole[],
  req?: NextRequest | Request
): Promise<UserTokenPayload> {
  const user = await requireAuth(req);
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  if (user.mustChangePassword) {
    throw new AuthError(
      "Forbidden: First-time password change required. Please set your password before accessing hotel operations.",
      403
    );
  }

  if (!allowedRoles.includes(user.role)) {
    throw new AuthError(
      `Forbidden: Access denied. Required role: [${allowedRoles.join(", ")}], your role: [${user.role}]`,
      403
    );
  }

  return user;
}

/**
 * Requires user to be assigned to a hotel tenant (MANAGER, RECEPTIONIST, STAFF).
 * Throws 403 AuthError if user has no hotelId or has not fulfilled first-time password setup.
 */
export async function requireHotelUser(
  req?: NextRequest | Request
): Promise<UserTokenPayload & { hotelId: string }> {
  const user = await requireAuth(req);

  if (user.mustChangePassword) {
    throw new AuthError(
      "Forbidden: First-time password change required. Please set your password before accessing hotel operations.",
      403
    );
  }

  if (!user.hotelId) {
    throw new AuthError(
      "Forbidden: User account is not assigned to any hotel tenant",
      403
    );
  }

  return user as UserTokenPayload & { hotelId: string };
}

/**
 * Requires user to have Front Desk authority (MANAGER or RECEPTIONIST).
 * STAFF and unauthenticated users are strictly blocked.
 */
export async function requireFrontDeskUser(
  req?: NextRequest | Request
): Promise<UserTokenPayload & { hotelId: string }> {
  const user = await requireRole([USER_ROLES.MANAGER, USER_ROLES.RECEPTIONIST], req);

  if (!user.hotelId) {
    throw new AuthError(
      "Forbidden: User account is not assigned to any hotel tenant",
      403
    );
  }

  return user as UserTokenPayload & { hotelId: string };
}

/**
 * Requires user to have Staff authority (STAFF role only).
 * SYSTEM_ADMIN, MANAGER, RECEPTIONIST, GUEST and unauthenticated users are strictly blocked.
 */
export async function requireStaffUser(
  req?: NextRequest | Request
): Promise<UserTokenPayload & { hotelId: string }> {
  const user = await requireRole(USER_ROLES.STAFF, req);

  if (!user.hotelId) {
    throw new AuthError(
      "Forbidden: Staff account is not assigned to any hotel tenant",
      403
    );
  }

  return user as UserTokenPayload & { hotelId: string };
}

/**
 * Requires and enforces tenant isolation for a target hotel.
 * - SYSTEM_ADMIN has platform-wide access to all hotels.
 * - MANAGER, RECEPTIONIST, STAFF are strictly locked to their own authenticatedUser.hotelId.
 * - Never trusts query params / body to determine access.
 */
export async function requireHotelAccess(
  targetHotelId: string,
  req?: NextRequest | Request
): Promise<UserTokenPayload> {
  const user = await requireAuth(req);

  // 1. SYSTEM_ADMIN has platform-level access to all hotels
  if (user.role === USER_ROLES.SYSTEM_ADMIN) {
    return user;
  }

  // 2. Hotel users must match target hotel exactly
  if (!user.hotelId || user.hotelId.toString() !== targetHotelId.toString()) {
    throw new AuthError(
      "Forbidden: Cross-tenant access denied. You do not have permission to access this hotel.",
      403
    );
  }

  return user;
}

/**
 * Builds a secure tenant database query filter.
 * - For MANAGER, RECEPTIONIST, STAFF: ALWAYS scopes by authenticatedUser.hotelId (ignores untrusted input).
 * - For SYSTEM_ADMIN: Scopes by requestedHotelId if specified, or returns {} for all hotels.
 */
export function getTenantScope(
  user: UserTokenPayload,
  requestedHotelId?: string | null
): { hotelId?: any } {
  // If not SYSTEM_ADMIN, strictly enforce user.hotelId from JWT
  if (user.role !== USER_ROLES.SYSTEM_ADMIN) {
    if (!user.hotelId) {
      throw new AuthError("User has no assigned hotelId", 403);
    }
    return { hotelId: user.hotelId };
  }

  // SYSTEM_ADMIN can filter by specific hotel if requested, or view all
  if (requestedHotelId) {
    return { hotelId: requestedHotelId };
  }

  return {};
}

/**
 * Re-export/helper: authenticateManager
 * Enforces valid manager authentication and returns hotel context.
 */
export async function authenticateManager(req?: NextRequest | Request) {
  const { requireManager } = await import("@/lib/authorization/manager");
  return requireManager(req);
}

/**
 * Helper to catch AuthError and return standard NextResponse in Route Handlers.
 */
export function handleAuthError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }
  console.error("Unexpected error:", error);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
