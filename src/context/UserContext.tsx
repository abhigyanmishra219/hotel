"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { UserRole, isValidRole, USER_ROLES } from "@/types/roles";

export interface User {
  userId?: string;
  name: string;
  email: string;
  role: UserRole;
  hotelId?: string | null;
  hotelName?: string | null;
  hotel?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
  } | null;
  shift?: string | null;
  mustChangePassword?: boolean;
}

interface UserContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, userData?: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const TOKEN_KEY = "hotel_auth_token";
const USER_KEY = "hotel_auth_user";

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const syncAuthState = useCallback(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        if (isValidRole(parsedUser.role)) {
          setTokenState(storedToken);
          setUserState({
            ...parsedUser,
            hotelId: parsedUser.hotelId ?? null,
            hotelName: parsedUser.hotelName ?? parsedUser.hotel?.name ?? null,
            hotel: parsedUser.hotel ?? null,
            mustChangePassword: Boolean(parsedUser.mustChangePassword),
          });
          return;
        }
      }
      setTokenState(null);
      setUserState(null);
    } catch (error) {
      console.error("Failed to restore auth session from storage:", error);
      setTokenState(null);
      setUserState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load user and token from localStorage on initial mount and listen to bfcache pageshow/storage events
  useEffect(() => {
    syncAuthState();

    const handlePageShow = () => {
      syncAuthState();
    };

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === TOKEN_KEY ||
        event.key === USER_KEY ||
        event.key === null
      ) {
        syncAuthState();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("storage", handleStorage);
    };
  }, [syncAuthState]);

  const setUser = useCallback((newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, []);

  const login = useCallback((newToken: string, userData?: User) => {
    setTokenState(newToken);
    localStorage.setItem(TOKEN_KEY, newToken);
    if (typeof document !== "undefined") {
      document.cookie = `${TOKEN_KEY}=${newToken}; path=/; max-age=604800; SameSite=Lax`;
    }

    if (userData) {
      const sanitizedUser: User = {
        ...userData,
        hotelId: userData.hotelId ?? null,
        hotelName: userData.hotelName ?? userData.hotel?.name ?? null,
        hotel: userData.hotel ?? null,
        mustChangePassword: Boolean(userData.mustChangePassword),
      };
      setUserState(sanitizedUser);
      localStorage.setItem(USER_KEY, JSON.stringify(sanitizedUser));
    } else {
      // Decode JWT payload in browser if userData is not explicitly provided
      try {
        const payloadBase64 = newToken.split(".")[1];
        if (payloadBase64) {
          const decoded = JSON.parse(atob(payloadBase64));
          const role: UserRole = isValidRole(decoded.role)
            ? decoded.role
            : USER_ROLES.STAFF;

          const decodedUser: User = {
            userId: decoded.userId || decoded.sub || decoded.id,
            name: decoded.name || "",
            email: decoded.email || "",
            role,
            hotelId: decoded.hotelId ?? null,
            hotelName: decoded.hotelName ?? null,
            hotel: decoded.hotelName ? { name: decoded.hotelName } : null,
            mustChangePassword: Boolean(decoded.mustChangePassword),
          };
          setUserState(decodedUser);
          localStorage.setItem(USER_KEY, JSON.stringify(decodedUser));
        }
      } catch (err) {
        console.error("Error decoding token payload:", err);
      }
    }
  }, []);

  const logout = useCallback(() => {
    setTokenState(null);
    setUserState(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      sessionStorage.clear();
    } catch (err) {
      console.error("Error clearing storage during logout:", err);
    }
    if (typeof document !== "undefined") {
      document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0; SameSite=Lax`;
      document.cookie = `${USER_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0; SameSite=Lax`;
    }
  }, []);

  const hasRole = useCallback(
    (roles: UserRole | UserRole[]): boolean => {
      if (!user || !user.role) return false;
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      return allowedRoles.includes(user.role);
    },
    [user]
  );

  return (
    <UserContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        setUser,
        hasRole,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

/**
 * Custom hook to access logged in user data (name, email, role, hotelId) and auth functions
 */
export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

export default UserContext;
export { USER_ROLES };
