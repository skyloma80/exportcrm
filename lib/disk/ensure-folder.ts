/**
 * 目录类型
 */
export type FolderType = 'Customers' | 'Suppliers' | 'ServiceProviders' | 'Products' | 'Projects';

/**
 * 检查目录是否存在
 */
export async function checkFolderExists(path: string): Promise<boolean> {
  if (!path) return true;
  try {
    const response = await fetch(`/api/disk/list?path=${encodeURIComponent(path)}`);
    return response.ok;
  } catch (error) {
    console.error('Error checking folder:', error);
    return false;
  }
}

/**
 * 确保目录存在，如果不存在则创建
 */
export async function ensureFolderExists(path: string): Promise<boolean> {
  if (!path) return true;
  try {
    const response = await fetch('/api/disk/ensure-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    return response.ok;
  } catch (error) {
    console.error('Error ensuring folder exists:', error);
    return false;
  }
}

/**
 * 构建带类型前缀的路径
 */
export function buildTypedPath(
  type: FolderType,
  name: string,
  subPath?: string
): string {
  const parts = [type, name];
  if (subPath) {
    parts.push(subPath);
  }
  return parts.filter(Boolean).join('/');
}

/**
 * 跳转到 disk 页面
 * 1. 先确保目录存在（如果不存在会创建 .keep 文件）
 * 2. 然后跳转到 disk 页面
 */
export async function navigateToDisk(
  path: string,
  router: { push: (url: string) => void }
): Promise<void> {
  // 先确保目录存在，API 会自动处理已存在的情况
  await ensureFolderExists(path);
  router.push(`/disk?path=${encodeURIComponent(path)}`);
}

/**
 * 跳转到客户目录
 */
export async function navigateToCustomerDisk(
  customerName: string,
  router: { push: (url: string) => void },
  projectName?: string
): Promise<void> {
  const path = buildTypedPath('Customers', customerName, projectName);
  await navigateToDisk(path, router);
}

/**
 * 跳转到项目目录
 */
export async function navigateToProjectDisk(
  customerName: string,
  projectName: string,
  router: { push: (url: string) => void }
): Promise<void> {
  const path = buildTypedPath('Customers', customerName, projectName);
  await navigateToDisk(path, router);
}
