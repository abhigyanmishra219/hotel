/**
 * GrandStay SaaS — Production Environment Validation
 * Validates critical environment variables at startup.
 */

interface ValidatedEnv {
  NODE_ENV: "development" | "production" | "test";
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  NEXT_PUBLIC_APP_URL: string;
}

/**
 * Validates and returns sanitized environment configuration.
 * Fails fast with descriptive errors if required variables are missing or insecure in production.
 */
export function getEnv(): ValidatedEnv {
  const NODE_ENV = (process.env.NODE_ENV || "development") as "development" | "production" | "test";
  const MONGODB_URI = process.env.MONGODB_URI;
  const JWT_SECRET = process.env.JWT_SECRET;
  const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
  const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const missing: string[] = [];

  if (!MONGODB_URI) {
    missing.push("MONGODB_URI");
  }

  if (!JWT_SECRET) {
    if (NODE_ENV === "production") {
      missing.push("JWT_SECRET");
    }
  } else if (NODE_ENV === "production" && JWT_SECRET.length < 32) {
    throw new Error(
      "❌ PRODUCTION SECURITY ERROR: JWT_SECRET must be at least 32 characters long in production."
    );
  }

  if (missing.length > 0) {
    const errorMsg = `❌ CRITICAL ENVIRONMENT ERROR: Missing required environment variables: ${missing.join(
      ", "
    )}. Please define them in your production environment or .env file.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return {
    NODE_ENV,
    MONGODB_URI: MONGODB_URI as string,
    JWT_SECRET: JWT_SECRET || "development_fallback_jwt_secret_key_32chars_min",
    JWT_EXPIRES_IN,
    NEXT_PUBLIC_APP_URL,
  };
}

// Perform initial validation check upon module import
export const env = getEnv();
