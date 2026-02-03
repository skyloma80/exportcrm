/**
 * Seed Data Import API
 * 种子数据批量导入接口
 * 
 * POST /api/seed/import
 * Body: { type: 'customers' | 'suppliers' | 'projects', data: any[] }
 * 
 * 或者不带 body，自动从 pocketbase/seeds/*.json 读取
 * POST /api/seed/import?type=customers
 * POST /api/seed/import?type=suppliers
 * POST /api/seed/import?type=projects
 * POST /api/seed/import?type=all
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { cookies } from 'next/headers';
import * as fs from 'fs';
import * as path from 'path';

// 检查是否为管理员
async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('pb_auth');
    if (!authCookie?.value) return false;
    
    const authData = JSON.parse(authCookie.value);
    return authData?.model?.role === 'admin' || authData?.model?.is_admin === true;
  } catch {
    return false;
  }
}

// 读取本地 JSON 种子文件
function readSeedFile(type: string): any[] | null {
  try {
    const seedPath = path.join(process.cwd(), 'pocketbase', 'seeds', `${type}.json`);
    if (!fs.existsSync(seedPath)) {
      return null;
    }
    const content = fs.readFileSync(seedPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

interface ImportResult {
  type: string;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}

export async function POST(request: NextRequest) {
  try {
    // 开发环境或管理员才能使用
    const isDev = process.env.NODE_ENV === 'development';
    const admin = await isAdmin();
    
    if (!isDev && !admin) {
      return NextResponse.json(
        { error: 'Unauthorized. This API is only available in development or for admins.' },
        { status: 403 }
      );
    }

    const pb = await createServerPocketBase();
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type') || 'all';
    
    // 尝试从 body 读取数据，如果没有则从文件读取
    let bodyData: { type?: string; data?: any[] } = {};
    try {
      bodyData = await request.json();
    } catch {
      // 没有 body，从文件读取
    }

    const results: ImportResult[] = [];
    const typesToImport = typeParam === 'all' 
      ? ['customers', 'suppliers', 'projects'] 
      : [bodyData.type || typeParam];

    for (const type of typesToImport) {
      const data = bodyData.data || readSeedFile(type);
      
      if (!data || !Array.isArray(data)) {
        results.push({
          type,
          created: 0,
          updated: 0,
          failed: 0,
          errors: [`No data found for ${type}`],
        });
        continue;
      }

      const result: ImportResult = {
        type,
        created: 0,
        updated: 0,
        failed: 0,
        errors: [],
      };

      // 根据类型选择集合和处理逻辑
      const collectionName = type;
      
      // 如果是 projects，需要先建立 customer code -> id 的映射
      let customerCodeToId: Record<string, string> = {};
      if (type === 'projects') {
        try {
          const customers = await pb.collection('customers').getFullList<{ id: string; code: string }>();
          customerCodeToId = Object.fromEntries(customers.map(c => [c.code, c.id]));
        } catch (e: any) {
          result.errors.push(`Failed to load customers: ${e.message}`);
        }
      }

      for (const record of data) {
        try {
          // 处理 projects 的 customer 关联
          let processedRecord = { ...record };
          if (type === 'projects') {
            const customerCode = record.customer_code;
            if (customerCode && customerCodeToId[customerCode]) {
              processedRecord.customer = customerCodeToId[customerCode];
            }
            // 删除临时字段
            delete processedRecord.customer_code;
            delete processedRecord.customer_name;
          }

          // 检查是否已存在（通过 code 字段）
          const code = record.code;
          if (!code) {
            result.failed++;
            result.errors.push(`Record missing code field`);
            continue;
          }

          const existing = await pb.collection(collectionName).getList(1, 1, {
            filter: `code = "${code}"`,
          });

          if (existing.items.length > 0) {
            // 更新已存在的记录
            await pb.collection(collectionName).update(existing.items[0].id, processedRecord);
            result.updated++;
          } else {
            // 创建新记录
            await pb.collection(collectionName).create(processedRecord);
            result.created++;
          }
        } catch (error: any) {
          result.failed++;
          result.errors.push(`${record.code || 'unknown'}: ${error.message}`);
        }
      }

      results.push(result);
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        totalCreated: results.reduce((sum, r) => sum + r.created, 0),
        totalUpdated: results.reduce((sum, r) => sum + r.updated, 0),
        totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
      },
    });
  } catch (error: any) {
    console.error('Seed import error:', error);
    return NextResponse.json(
      { error: error.message || 'Import failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/seed/import
 * 获取可用的种子文件列表
 */
export async function GET() {
  const seedsDir = path.join(process.cwd(), 'pocketbase', 'seeds');
  const files = fs.readdirSync(seedsDir).filter(f => f.endsWith('.json'));
  
  const seeds = files.map(file => {
    const content = fs.readFileSync(path.join(seedsDir, file), 'utf-8');
    const data = JSON.parse(content);
    return {
      file,
      type: file.replace('.json', ''),
      count: Array.isArray(data) ? data.length : 1,
    };
  });

  return NextResponse.json({
    message: 'Seed Data Import API',
    availableSeeds: seeds,
    usage: {
      importAll: 'POST /api/seed/import?type=all',
      importOne: 'POST /api/seed/import?type=customers',
      importWithData: 'POST /api/seed/import with body { type: "customers", data: [...] }',
    },
  });
}
