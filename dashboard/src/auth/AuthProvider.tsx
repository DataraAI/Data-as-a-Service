import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ApprovalStatus = "pending" | "approved" | "rejected" | null;
export type AuthRole = "customer" | "analyst" | "admin";

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  role: AuthRole;
  storageSlug: string;
  privateContainerName: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isApproved: boolean;
  approvalStatus: ApprovalStatus;
  user: AuthUser | null;
}

export interface AuthContextValue extends AuthState {
  isLoading: boolean;
  refreshAuth: () => Promise<AuthState>;
  login: (nextPath?: string) => void;
  register: (nextPath?: string) => void;
  submitLogin: (email: string, password: string) => Promise<AuthState>;
  submitRegister: (payload: {
    displayName: string;
    email: string;
    password: string;
  }) => Promise<AuthState>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function buildAuthPageUrl(mode: "login" | "register", nextPath?: string) {
  const params = new URLSearchParams({ mode });
  const rawTarget = nextPath ?? `${window.location.pathname}${window.location.search}`;
  const target = rawTarget.startsWith("/auth") ? "/viewer" : rawTarget;
  if (target) {
    params.set("next", target);
  }
  return `/auth?${params.toString()}`;
}

async function fetchAuthState(): Promise<AuthState> {
  const response = await fetch("/api/auth/me", {
    method: "GET",
    credentials: "same-origin",
  });

  if (!response.ok) {
    return {
      isAuthenticated: false,
      isApproved: false,
      approvalStatus: null,
      user: null,
    };
  }

  const data = await response.json();
  return {
    isAuthenticated: Boolean(data.isAuthenticated),
    isApproved: Boolean(data.isApproved),
    approvalStatus: (data.approvalStatus as ApprovalStatus) ?? null,
    user: data.user ?? null,
  };
}

async function postAuthJson<TPayload>(url: string, payload: TPayload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error =
      typeof data.error === "string" && data.error.trim()
        ? data.error
        : "Authentication request failed";
    throw new Error(error);
  }

  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isApproved: false,
    approvalStatus: null,
    user: null,
  });

  const refreshAuth = async (): Promise<AuthState> => {
    setIsLoading(true);
    try {
      const next = await fetchAuthState();
      setAuthState(next);
      return next;
    } catch {
      const fallback = {
        isAuthenticated: false,
        isApproved: false,
        approvalStatus: null,
        user: null,
      } satisfies AuthState;
      setAuthState(fallback);
      return fallback;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshAuth();
  }, []);

  const login = (nextPath?: string) => {
    window.location.assign(buildAuthPageUrl("login", nextPath));
  };

  const register = (nextPath?: string) => {
    window.location.assign(buildAuthPageUrl("register", nextPath));
  };

  const submitLogin = async (email: string, password: string) => {
    await postAuthJson("/api/auth/login", { email, password });
    return refreshAuth();
  };

  const submitRegister = async (payload: {
    displayName: string;
    email: string;
    password: string;
  }) => {
    await postAuthJson("/api/auth/register", payload);
    return refreshAuth();
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
      ...authState,
      isLoading,
      refreshAuth,
      login,
      register,
      submitLogin,
      submitRegister,
      logout,
    }),
    [authState, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
