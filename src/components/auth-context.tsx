"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface UserInfo {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  role: "super_admin" | "sub_admin" | "user";
}

interface AuthContextType {
  user: UserInfo | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        if (storedToken) {
          setToken(storedToken);
          // Verify token with server
          const res = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data.data);
            localStorage.setItem(USER_KEY, JSON.stringify(data.data));
          } else {
            // Token invalid, clear
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setToken(null);
            setUser(null);
          }
        } else {
          // Try loading from localStorage as fallback
          const storedUser = localStorage.getItem(USER_KEY);
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
            } catch {
              localStorage.removeItem(USER_KEY);
            }
          }
        }
      } catch {
        // Network error, try cached user
        const storedUser = localStorage.getItem(USER_KEY);
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            // ignore
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = useCallback(async (username: string, password: string, remember = false) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, remember }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "登录失败");
    }

    const { token: newToken, user: userInfo } = data.data;
    setToken(newToken);
    setUser(userInfo);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userInfo));

    if (remember) {
      localStorage.setItem("auth_remember", "true");
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // ignore
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem("auth_remember");
    }
  }, [token]);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    if (!token) throw new Error("未登录");

    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ oldPassword, newPassword }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "密码修改失败");
    }
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) return;

    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.data);
        localStorage.setItem(USER_KEY, JSON.stringify(data.data));
      }
    } catch {
      // ignore
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        changePassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/** Check if user has a specific global role or higher */
export function hasRole(user: UserInfo | null, ...roles: string[]): boolean {
  if (!user) return false;
  const roleHierarchy = { super_admin: 3, sub_admin: 2, user: 1 };
  const userLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0;
  return roles.some((role) => {
    const requiredLevel = roleHierarchy[role as keyof typeof roleHierarchy] || 0;
    return userLevel >= requiredLevel;
  });
}

/** Check if user is admin (super_admin or sub_admin) */
export function isAdmin(user: UserInfo | null): boolean {
  return hasRole(user, "sub_admin");
}
