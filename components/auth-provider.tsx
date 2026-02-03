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
  const [isLoading, setIsLoading] = useState(true);

  // 初始化：检查现有认证状态
  useEffect(() => {
    const pb = getPocketBase();
    
    // 从 authStore 获取当前用户
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);

    // 监听认证状态变化
    const unsubscribe = pb.authStore.onChange((_token, model) => {
      setUser(model ?? null);
    });

    return () => unsubscribe();
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
