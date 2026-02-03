/**
 * PocketBase 认证模块
 * 
 * 提供客户端认证功能，自动处理 cookie 持久化
 * 
 * 从主项目复制，保持一致性
 */

import PocketBase, { RecordModel } from 'pocketbase';

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';
const COOKIE_NAME = 'pb_auth';

// 客户端单例
let clientInstance: PocketBase | null = null;

/**
 * 获取 PocketBase 实例（客户端单例）
 */
export function getPocketBase(): PocketBase {
  if (typeof window === 'undefined') {
    // 服务端：每次创建新实例
    return new PocketBase(POCKETBASE_URL);
  }
  
  // 客户端：使用单例
  if (!clientInstance) {
    clientInstance = new PocketBase(POCKETBASE_URL);
    clientInstance.autoCancellation(false);
    
    // 从 cookie 恢复认证状态
    restoreAuthFromCookie(clientInstance);
    
    // 监听认证状态变化，自动保存到 cookie
    clientInstance.authStore.onChange(() => {
      saveAuthToCookie(clientInstance!);
    });
  }
  
  return clientInstance;
}

/**
 * 从 cookie 恢复认证状态
 */
function restoreAuthFromCookie(pb: PocketBase): void {
  if (typeof document === 'undefined') return;
  
  const cookies = document.cookie.split(';');
  const authCookie = cookies.find(c => c.trim().startsWith(`${COOKIE_NAME}=`));
  
  if (authCookie) {
    const cookieValue = authCookie.split('=')[1];
    if (cookieValue) {
      try {
        // PocketBase cookie 格式是 URL 编码的 JSON
        const decoded = decodeURIComponent(cookieValue);
        const authData = JSON.parse(decoded);
        
        if (authData.token && authData.model) {
          pb.authStore.save(authData.token, authData.model);
        }
      } catch (e) {
        // 解析失败，尝试使用 PocketBase 内置方法
        try {
          pb.authStore.loadFromCookie(`${COOKIE_NAME}=${cookieValue}`);
        } catch {
          // 忽略错误
        }
      }
    }
  }
}

/**
 * 保存认证状态到 cookie
 */
function saveAuthToCookie(pb: PocketBase): void {
  if (typeof document === 'undefined') return;
  
  if (pb.authStore.isValid) {
    // 使用 PocketBase 内置方法导出 cookie
    // 注意：HTTP 环境下 secure 必须为 false
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const cookie = pb.authStore.exportToCookie({
      httpOnly: false,
      secure: isHttps,
      sameSite: 'Lax',
      path: '/',
    });
    document.cookie = cookie;
  } else {
    // 清除 cookie
    document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

/**
 * 登录
 */
export async function login(email: string, password: string): Promise<{
  success: boolean;
  user?: RecordModel;
  error?: string;
}> {
  const pb = getPocketBase();
  try {
    const authData = await pb.collection('users').authWithPassword(email, password);
    
    // 检查用户是否已验证
    if (!authData.record.verified) {
      // 清除认证状态
      pb.authStore.clear();
      return { success: false, error: '账号尚未验证，请等待管理员审核' };
    }
    
    return { success: true, user: authData.record };
  } catch (error: any) {
    console.error('Login error:', error);
    let errorMessage = '登录失败';
    
    if (error.message?.includes('Failed to fetch')) {
      errorMessage = '网络连接失败，请检查网络';
    } else if (error.status === 400) {
      errorMessage = '邮箱或密码错误';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
}

/**
 * 注册
 */
export async function register(data: {
  email: string;
  password: string;
  name?: string;
}): Promise<{
  success: boolean;
  user?: RecordModel;
  error?: string;
}> {
  const pb = getPocketBase();
  try {
    // 创建用户
    await pb.collection('users').create({
      email: data.email,
      password: data.password,
      passwordConfirm: data.password,
      name: data.name,
    });
    
    // 注册成功后不自动登录，需要管理员验证
    return { 
      success: true, 
      error: '注册成功，请等待管理员验证后登录' 
    };
  } catch (error: any) {
    console.error('Register error:', error);
    let errorMessage = '注册失败';
    
    if (error.message?.includes('Failed to fetch')) {
      errorMessage = '网络连接失败，请检查网络';
    } else if (error.data?.email) {
      errorMessage = '该邮箱已被注册';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
}

/**
 * 登出
 */
export function logout(): void {
  const pb = getPocketBase();
  pb.authStore.clear();
  // cookie 会通过 onChange 回调自动清除
}

/**
 * 获取当前用户
 */
export function getCurrentUser(): RecordModel | null {
  const pb = getPocketBase();
  if (pb.authStore.isValid && pb.authStore.record) {
    return pb.authStore.record;
  }
  return null;
}

/**
 * 检查是否已登录
 */
export function isAuthenticated(): boolean {
  const pb = getPocketBase();
  return pb.authStore.isValid;
}

/**
 * 刷新认证 token
 */
export async function refreshAuth(): Promise<boolean> {
  const pb = getPocketBase();
  if (pb.authStore.isValid) {
    try {
      await pb.collection('users').authRefresh();
      return true;
    } catch {
      pb.authStore.clear();
      return false;
    }
  }
  return false;
}

// ============ 服务端工具函数 ============

/**
 * 创建服务端 PocketBase 实例
 */
export function createServerPB(): PocketBase {
  const pb = new PocketBase(POCKETBASE_URL);
  pb.autoCancellation(false);
  return pb;
}

/**
 * 从 cookie 值加载认证状态（服务端用）
 */
export function loadAuthFromCookieValue(pb: PocketBase, cookieValue: string | undefined): void {
  if (!cookieValue) return;
  
  try {
    const decoded = decodeURIComponent(cookieValue);
    const authData = JSON.parse(decoded);
    
    if (authData.token && authData.model) {
      pb.authStore.save(authData.token, authData.model);
    }
  } catch {
    try {
      pb.authStore.loadFromCookie(`${COOKIE_NAME}=${cookieValue}`);
    } catch {
      // 忽略错误
    }
  }
}
