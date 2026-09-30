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

export interface AuthenticatedReceptionistContext {
  user: UserTokenPayload;
  hotelId: string;
  hotel: IHotel;
  dbUser?: IUser | null;
}

/**
 * Server-side authorization helper that strictly verifies:
 * 1. Valid JWT authentication
 * 2. User exists and has role === 'RECEPTIONIST'
 * 3. mustChangePassword is false (first login completed)
 * 4. User is assigned to a valid hotelId
 * 5. Hotel exists in MongoDB
 * 6. Multi-tenant isolation (strict hotelId extraction from JWT)
 */
export async function requireReceptionist(
  req?: NextRequest | Request
): Promise<AuthenticatedReceptionistContext> {
  // 1. Authenticate and enforce RECEPTIONIST role
  const authUser = await requireRole(USER_ROLES.RECEPTIONIST, req);

  // 2. Enforce hotel assignment
  if (!authUser.hotelId) {
    throw new AuthError(
      "Forbidden: Receptionist account is not assigned to any hotel tenant",
      403
    );
  }

  await connectToDatabase();

  // 3. Verify user existence in database & active status
  const dbUser = await User.findById(authUser.userId).lean();
  if (!dbUser) {
    throw new AuthError("Unauthorized: Receptionist account not found", 401);
  }

  if (dbUser.isActive === false) {
    throw new AuthError(
      "Forbidden: Your receptionist account has been deactivated. Please contact your manager.",
      403
    );
  }

  // 4. Fetch assigned hotel from database
  const hotel = await Hotel.findById(authUser.hotelId).lean();
  if (!hotel) {
    throw new AuthError(
      "Not Found: The hotel assigned to this receptionist does not exist in the system",
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

export { handleAuthError, AuthError };
