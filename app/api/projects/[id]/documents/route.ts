/**
 * Project Documents API
 * 获取项目文档数量 - 通过 S3 目录约定查询
 */

import { NextRequest, NextResponse } from 'next/server';
import { createStorage } from '@/lib/s3/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // 消费 params，避免 Next.js 警告

    // 从查询参数获取客户名和项目名
    const searchParams = request.nextUrl.searchParams;
    const customerName = searchParams.get('customerName');
    const projectName = searchParams.get('projectName');

    if (!customerName || !projectName) {
      return NextResponse.json({ count: 0 });
    }

    // 构建项目文档路径（按 S3 目录约定）
    const prefix = `Customers/${customerName}/${projectName}/`;

    // 使用 storage 直接获取文件列表（递归）
    const storage = createStorage();
    const { data, error } = await storage.list({
      prefix,
      delimiter: '', // 不使用分隔符，递归列出所有文件
    });

    if (error) {
      console.error('Error listing project documents:', error);
      return NextResponse.json({ count: 0 });
    }

    // 过滤掉文件夹和 .keep 文件，只计算实际文件数量
    const fileCount = data.filter(
      (item: { isFolder: boolean; name: string }) => !item.isFolder && item.name !== '.keep'
    ).length;

    return NextResponse.json({ count: fileCount });
  } catch (error) {
    console.error('Error getting project documents:', error);
    return NextResponse.json({ count: 0 });
  }
}
