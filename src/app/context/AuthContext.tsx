/*
 * AuthContext.tsx — Global authentication state
 *
 * Provides: user, isLoggedIn, login(), logout()
 * Persists to localStorage so page refresh keeps you logged in.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface AuthUser {
  id?:         number;
  name:        string;
  mobile:      string;
  role:        string;
  district_id?: number;
  area_id?:    string;
  booth_id?:   number;
  token?:      string;
  isDemo?:     boolean;
}

interface AuthContextType {
  user:       AuthUser | null;
  isLoggedIn: boolean;
  token:      string | null;
  login:      (user: AuthUser, token?: string) => void;
  logout:     () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "ncp_auth";

function loadFromStorage(): { user: AuthUser | null; token: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, token: null };
    return JSON.parse(raw);
  } catch {
    return { user: null, token: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = loadFromStorage();
  const [user,  setUser]  = useState<AuthUser | null>(stored.user);
  const [token, setToken] = useState<string | null>(stored.token);

  const login = useCallback((newUser: AuthUser, newToken?: string) => {
    const t = newToken ?? newUser.token ?? null;
    setUser(newUser);
    setToken(t);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: newUser, token: t }));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("ncp_location");
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
