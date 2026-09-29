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

  // Load user and token from localStorage on initial mount
  useEffect(() => {
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
          });
        }
      }
    } catch (error) {
      console.error("Failed to restore auth session from storage:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

    if (userData) {
      const sanitizedUser: User = {
        ...userData,
        hotelId: userData.hotelId ?? null,
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
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
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
