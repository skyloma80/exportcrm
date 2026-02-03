/**
 * Seed Data Import API
 * 种子数据导入接口
 * 
 * POST /api/seed
 * Content-Type: multipart/form-data
 * Body: file (JSON file)
 * 
 * 上传 JSON 文件并导入到 app_config 表
 * JSON 格式: [{ key: string, category: string, value: any }, ...]
 * 
 * 注意：此接口仅限开发环境或管理员使用
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { cookies } from 'next/headers';

// 种子数据类型
interface SeedItem {
  key: string;
  category: string;
  value: any;
}

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

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (!file.name.endsWith('.json')) {
      return NextResponse.json(
        { error: 'Only JSON files are allowed' },
        { status: 400 }
      );
    }

    // 读取文件内容
    const content = await file.text();
    let seedData: SeedItem[];
    
    try {
      seedData = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON format' },
        { status: 400 }
      );
    }

    // 验证数据格式
    if (!Array.isArray(seedData)) {
      return NextResponse.json(
        { error: 'JSON must be an array of config items' },
        { status: 400 }
      );
    }

    const pb = await createServerPocketBase();
    
    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[],
      items: [] as string[],
    };

    for (const record of seedData) {
      if (!record.key || !record.category) {
        results.failed++;
        results.errors.push(`Invalid record: missing key or category`);
        continue;
      }

      try {
        // 尝试查找已存在的记录
        const existing = await pb.collection('app_config').getList(1, 1, {
          filter: `key = "${record.key}"`,
        });

        if (existing.items.length > 0) {
          // 更新已存在的记录
          await pb.collection('app_config').update(existing.items[0].id, record);
          results.updated++;
        } else {
          // 创建新记录
          await pb.collection('app_config').create(record);
          results.created++;
        }
        results.items.push(record.key);
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${record.key}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      results,
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
 * GET /api/seed
 * 获取 API 使用说明
 */
export async function GET() {
  return NextResponse.json({
    message: 'Seed Data Import API',
    usage: {
      method: 'POST',
      contentType: 'multipart/form-data',
      body: {
        file: 'JSON file - 种子数据文件',
      },
      jsonFormat: [
        { key: 'string', category: 'string', value: 'any' },
      ],
      example: [
        { key: 'ports_of_loading', category: 'ports', value: [{ code: 'CNSHA', name: 'Shanghai' }] },
      ],
    },
  });
}
