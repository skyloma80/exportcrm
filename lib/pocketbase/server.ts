/**
 * PocketBase 服务端工具
 * 
 * 用于 API Routes，提供带认证的 PocketBase 实例
 */

import PocketBase from 'pocketbase';
import { cookies } from 'next/headers';

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';

/**
 * 创建带认证的服务端 PocketBase 实例
 * 自动从 cookie 加载认证状态
 */
export async function createServerPocketBase(): Promise<PocketBase> {
  const pb = new PocketBase(POCKETBASE_URL);
  pb.autoCancellation(false);
  
  // 从 cookies 加载认证状态
  const cookieStore = await cookies();
  const pbAuthCookie = cookieStore.get('pb_auth')?.value;
  
  if (pbAuthCookie) {
    try {
      pb.authStore.loadFromCookie(`pb_auth=${pbAuthCookie}`);
      
      if (!pb.authStore.isValid) {
        const decoded = decodeURIComponent(pbAuthCookie);
        const authData = JSON.parse(decoded);
        
        if (authData.token && authData.model) {
          pb.authStore.save(authData.token, authData.model);
        }
      }
    } catch (e) {
      console.error('[Server PB] Failed to parse auth cookie:', e);
    }
  }
  
  return pb;
}

/**
 * 创建不带认证的服务端 PocketBase 实例
 * 用于公开数据查询
 */
export function createPublicPB(): PocketBase {
  const pb = new PocketBase(POCKETBASE_URL);
  pb.autoCancellation(false);
  return pb;
}

/**
 * 检查用户是否已认证
 */
export async function isAuthenticated(): Promise<boolean> {
  const pb = await createServerPocketBase();
  return pb.authStore.isValid;
}

/**
 * 获取当前用户
 */
export async function getCurrentUser() {
  const pb = await createServerPocketBase();
  if (pb.authStore.isValid) {
    return pb.authStore.record;
  }
  return null;
}
