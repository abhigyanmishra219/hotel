import { NextRequest } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User, { IUser } from "@/models/User";
import Hotel, { IHotel } from "@/models/Hotel";
import {
  requireRole,
  handleAuthError,
  AuthError,
} from "@/lib/auth";
import { UserTokenPayload } from "@/lib/jwt";
import { USER_ROLES } from "@/types/roles";

export interface AuthenticatedStaffContext {
  user: UserTokenPayload;
  hotelId: string;
  hotel: IHotel;
  dbUser?: IUser | null;
}

/**
 * Server-side authorization helper for STAFF endpoints that strictly verifies:
 * 1. Valid JWT authentication
 * 2. User exists and has role === 'STAFF'
 * 3. mustChangePassword is false (first login completed)
 * 4. User is assigned to a valid hotelId
 * 5. User account is active in MongoDB (not deactivated)
 * 6. Hotel exists in MongoDB and is ACTIVE (not SUSPENDED/INACTIVE)
 * 7. Multi-tenant isolation (strict hotelId extraction from JWT)
 */
export async function requireStaff(
  req?: NextRequest | Request
): Promise<AuthenticatedStaffContext> {
  // 1. Authenticate and enforce STAFF role + mustChangePassword check
  const authUser = await requireRole(USER_ROLES.STAFF, req);

  // 2. Enforce hotel assignment
  if (!authUser.hotelId) {
    throw new AuthError(
      "Forbidden: Staff account is not assigned to any hotel tenant",
      403
    );
  }

  await connectToDatabase();

  // 3. Verify user existence in database & active status
  const dbUser = await User.findById(authUser.userId).lean();
  if (!dbUser) {
    throw new AuthError("Unauthorized: Staff account not found", 401);
  }

  if (dbUser.isActive === false) {
    throw new AuthError(
      "Forbidden: Your staff account has been deactivated. Please contact your hotel manager.",
      403
    );
  }

  // 4. Fetch assigned hotel from database
  const hotel = await Hotel.findById(authUser.hotelId).lean();
  if (!hotel) {
    throw new AuthError(
      "Not Found: The hotel assigned to this staff account does not exist in the system",
      404
    );
  }

  if (hotel.status === "INACTIVE" || hotel.status === "SUSPENDED") {
    throw new AuthError(
      `Forbidden: Hotel property '${hotel.name}' is ${hotel.status}. Operational access is restricted.`,
      403
    );
  }

  return {
    user: authUser,
    hotelId: authUser.hotelId.toString(),
    hotel: hotel as unknown as IHotel,
    dbUser: dbUser as unknown as IUser,
  };
}

export { handleAuthError, AuthError };
