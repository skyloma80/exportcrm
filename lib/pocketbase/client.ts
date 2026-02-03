/**
 * PocketBase 客户端模块
 *
 * 已统一到 auth.ts，此文件保留为向后兼容的重导出
 * 
 * @deprecated 请直接使用 '@/lib/pocketbase/auth' 中的 getPocketBase()
 */

import { getPocketBase, createServerPB } from './auth';

/**
 * @deprecated 使用 getPocketBase() 代替
 */
export const createClient = getPocketBase;

/**
 * @deprecated 使用 createServerPocketBase() from './server' 代替
 */
export const createServerClient = createServerPB;

// 重导出以保持兼容
export { getPocketBase, createServerPB };
