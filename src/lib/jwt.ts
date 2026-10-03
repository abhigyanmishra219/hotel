import jwt, { SignOptions, JwtPayload } from "jsonwebtoken";
import { UserRole } from "@/types/roles";
import { env } from "@/lib/env";

const JWT_SECRET = env.JWT_SECRET;
const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN;

export interface UserTokenPayload extends JwtPayload {
  userId?: string;
  name: string;
  email: string;
  role: UserRole;
  hotelId?: string | null;
  hotelName?: string | null;
  mustChangePassword?: boolean;
}

/**
 * Creates/Signs a JWT token with the provided payload.
 * @param payload User data to encode in token (name, email, role, hotelId, etc.)
 * @param options Optional jwt.SignOptions
 * @returns Signed JWT string
 */
export function createToken(
  payload: UserTokenPayload,
  options?: SignOptions
): string {
  const tokenPayload: UserTokenPayload = {
    userId: payload.userId,
    name: payload.name,
    email: payload.email,
    role: payload.role,
    hotelId: payload.hotelId ?? null,
    hotelName: payload.hotelName ?? null,
    mustChangePassword: Boolean(payload.mustChangePassword),
  };

  const signOptions: SignOptions = {
    expiresIn: (options?.expiresIn ?? JWT_EXPIRES_IN) as SignOptions["expiresIn"],
    ...options,
  };

  return jwt.sign(tokenPayload, JWT_SECRET, signOptions);
}

/**
 * Verifies and decodes a JWT token.
 * @param token JWT string to verify
 * @returns Decoded UserTokenPayload if valid, or null if invalid/expired
 */
export function verifyToken(token: string): UserTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserTokenPayload;
    return decoded;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}
