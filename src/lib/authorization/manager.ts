import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User, { IUser } from "@/models/User";
import Hotel, { IHotel } from "@/models/Hotel";
import {
  requireAuth,
  requireRole,
  requireHotelAccess,
  handleAuthError,
  AuthError,
} from "@/lib/auth";
import { UserTokenPayload } from "@/lib/jwt";
import { USER_ROLES } from "@/types/roles";

export interface AuthenticatedManagerContext {
  user: UserTokenPayload;
  hotelId: string;
  hotel: IHotel;
  dbUser?: IUser | null;
}

/**
 * Server-side authorization helper that strictly verifies:
 * 1. Valid JWT authentication
 * 2. User exists and has role === 'MANAGER'
 * 3. User is assigned to a valid hotelId
 * 4. Hotel exists in MongoDB
 * 5. Tenant isolation (prevents cross-tenant spoofing)
 */
export async function requireManager(
  req?: NextRequest | Request
): Promise<AuthenticatedManagerContext> {
  // 1. Authenticate and enforce MANAGER role
  const authUser = await requireRole(USER_ROLES.MANAGER, req);

  // 2. Enforce hotel assignment
  if (!authUser.hotelId) {
    throw new AuthError(
      "Forbidden: Manager account is not assigned to any hotel tenant",
      403
    );
  }

  await connectToDatabase();

  // 3. Verify user existence in database & active status
  const dbUser = await User.findById(authUser.userId).lean();
  if (!dbUser) {
    throw new AuthError("Unauthorized: Manager account not found", 401);
  }

  if (dbUser.isActive === false) {
    throw new AuthError(
      "Forbidden: Your manager account has been deactivated. Please contact your system administrator.",
      403
    );
  }

  // 4. Fetch assigned hotel from database
  const hotel = await Hotel.findById(authUser.hotelId).lean();
  if (!hotel) {
    throw new AuthError(
      "Not Found: The hotel assigned to this manager does not exist in the system",
      404
    );
  }

  return {
    user: authUser,
    hotelId: authUser.hotelId.toString(),
    hotel: hotel as unknown as IHotel,
    dbUser: dbUser as unknown as IUser,
  };
}

export {
  requireAuth,
  requireRole,
  requireHotelAccess,
  handleAuthError,
  AuthError,
};
