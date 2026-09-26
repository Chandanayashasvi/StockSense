import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import * as authService from "@/services/authService";
import type { User } from "@/types";
import { currentUser as demoUser } from "@/services/mockData";
import { USE_MOCKS, ApiError } from "@/services/apiClient";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() =>
    USE_MOCKS && authService.getStoredToken() ? demoUser : null,
  );
  const [isInitializing, setIsInitializing] = useState(
    () => !USE_MOCKS && Boolean(authService.getStoredToken()),
  );

  useEffect(() => {
    if (USE_MOCKS || !authService.getStoredToken()) return;

    let active = true;
    authService.getCurrentUser()
      .then((current) => {
        if (active) setUser(current);
      })
      .catch((error: unknown) => {
        if (active && error instanceof ApiError && error.status === 401) {
          authService.logout();
        }
      })
      .finally(() => {
        if (active) setIsInitializing(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authService.login(email, password);
    setUser(result.user);
    setIsInitializing(false);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const result = await authService.signup(name, email, password);
    setUser(result.user);
    setIsInitializing(false);
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setIsInitializing(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isInitializing, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
