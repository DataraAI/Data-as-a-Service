import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
  storageSlug: string;
  privateContainerName: string;
}

interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  isApproved: boolean;
  user: AuthUser | null;
  refreshAuth: () => Promise<void>;
  login: (nextPath?: string) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchAuthState(): Promise<{
  isAuthenticated: boolean;
  isApproved: boolean;
  user: AuthUser | null;
}> {
  const response = await fetch("/api/auth/me", {
    method: "GET",
    credentials: "same-origin",
  });

  if (!response.ok) {
    return {
      isAuthenticated: false,
      isApproved: false,
      user: null,
    };
  }

  const data = await response.json();
  return {
    isAuthenticated: Boolean(data.isAuthenticated),
    isApproved: Boolean(data.isApproved),
    user: data.user ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const refreshAuth = async () => {
    setIsLoading(true);
    try {
      const next = await fetchAuthState();
      setIsAuthenticated(next.isAuthenticated);
      setIsApproved(next.isApproved);
      setUser(next.user);
    } catch {
      setIsAuthenticated(false);
      setIsApproved(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshAuth();
  }, []);

  const login = (nextPath?: string) => {
    const target = nextPath ?? `${window.location.pathname}${window.location.search}`;
    window.location.assign(`/api/auth/login?next=${encodeURIComponent(target)}`);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    await refreshAuth();
    window.location.assign("/");
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated,
      isApproved,
      user,
      refreshAuth,
      login,
      logout,
    }),
    [isLoading, isAuthenticated, isApproved, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
