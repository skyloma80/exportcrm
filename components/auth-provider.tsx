'use client';

/**
 * 认证 Provider
 * 
 * 从主项目复制，保持一致性
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { RecordModel } from 'pocketbase';
import {
  getPocketBase,
  login as pbLogin,
  logout as pbLogout,
  register as pbRegister,
  getCurrentUser,
} from '@/lib/pocketbase/auth';

interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

interface AuthContextType {
  user: RecordModel | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<RecordModel | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const initAuth = () => {
      try {
        const pb = getPocketBase();
        const currentUser = getCurrentUser();
        setUser(currentUser);
      } catch (e) {
        console.error('Auth init error:', e);
      }
    };

    // 延迟初始化确保 DOM 准备好
    const timer = setTimeout(initAuth, 50);

    const pb = getPocketBase();
    const unsubscribe = pb.authStore.onChange((_token, model) => {
      setUser(model ?? null);
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await pbLogin(email, password);
      if (result.success && result.user) {
        setUser(result.user);
      }
      return { success: result.success, error: result.error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const result = await pbRegister(data);
      if (result.success && result.user) {
        setUser(result.user);
      }
      return { success: result.success, error: result.error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    pbLogout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
