/**
 * 收款凭证 API
 * 
 * GET: 列出指定订单的所有收款凭证（按类型分组）
 * POST: 上传收款凭证到对应类型目录
 * 
 * 目录结构: Customers/{客户名}/{项目名}/{订单号}/收款凭证/{类型}/
 * 类型: 定金(deposit), 进度款(progress), 尾款(final)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createStorage } from '@/lib/s3/storage';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { extractOrderPathInfo, getOrderDocumentPath } from '@/lib/services/shipment-document-path';
import type { OrderWithExpand } from '@/lib/pocketbase/services/orders';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 收款类型映射 - 使用英文目录名
const PAYMENT_TYPE_FOLDERS: Record<string, string> = {
  deposit: 'deposit',
  progress: 'progress',
  final: 'final',
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // 获取订单详情
    const pb = await createServerPocketBase();
    let order: OrderWithExpand | null = null;
    try {
      order = await pb.collection('orders').getOne<OrderWithExpand>(id, {
        expand: 'project,customer',
      });
    } catch (e: any) {
      if (e.status === 404) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      throw e;
    }

    const pathInfo = extractOrderPathInfo(order);
    if (!pathInfo) {
      return NextResponse.json({ error: 'Missing customer or project info' }, { status: 400 });
    }

    const storage = createStorage();
    const basePath = getOrderDocumentPath(pathInfo, 'payment_receipts');
    
    // 按类型获取文件
    const filesByType: Record<string, Array<{
      name: string;
      path: string;
      size: number;
      url: string;
      lastModified?: string;
    }>> = {
      deposit: [],
      progress: [],
      final: [],
    };

    for (const [type, folder] of Object.entries(PAYMENT_TYPE_FOLDERS)) {
      const prefix = `${basePath}${folder}/`;
      const { data: files, error } = await storage.list({ prefix, delimiter: '' });
      
      if (error) {
        console.error(`Error listing ${type} receipts:`, error);
        continue;
      }

      filesByType[type] = files
        .filter(f => !f.isFolder && f.name !== '.keep')
        .map(f => ({
          name: f.name,
          path: f.path,
          size: f.size,
          url: `/api/disk/image?path=${encodeURIComponent(f.path)}`,
          lastModified: f.lastModified?.toISOString(),
        }));
    }

    const totalFiles = Object.values(filesByType).reduce((sum, arr) => sum + arr.length, 0);

    return NextResponse.json({
      orderId: id,
      orderCode: order.code,
      filesByType,
      hasFiles: totalFiles > 0,
    });
  } catch (error) {
    console.error('Error fetching payment receipts:', error);
    return NextResponse.json({ error: 'Failed to fetch receipts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const paymentType = formData.get('type') as string;

    console.log('Payment receipt upload - orderId:', id, 'type:', paymentType, 'file:', file?.name);

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!paymentType || !PAYMENT_TYPE_FOLDERS[paymentType]) {
      return NextResponse.json({ error: `Invalid payment type: ${paymentType}` }, { status: 400 });
    }

    // 获取订单详情
    const pb = await createServerPocketBase();
    let order: OrderWithExpand | null = null;
    try {
      order = await pb.collection('orders').getOne<OrderWithExpand>(id, {
        expand: 'project,customer',
      });
    } catch (e: any) {
      if (e.status === 404) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      throw e;
    }

    const pathInfo = extractOrderPathInfo(order);
    if (!pathInfo) {
      console.error('Missing path info - customer:', order.expand?.customer, 'project:', order.expand?.project);
      return NextResponse.json({ error: 'Missing customer or project info' }, { status: 400 });
    }

    // 生成上传路径: Customers/{客户名}/{项目名}/{订单号}/payment_receipts/{类型}/{filename}
    const typeFolder = PAYMENT_TYPE_FOLDERS[paymentType];
    const basePath = getOrderDocumentPath(pathInfo, 'payment_receipts');
    const uploadPath = `${basePath}${typeFolder}/${file.name}`;

    console.log('Upload path:', uploadPath);

    // 上传文件
    const storage = createStorage();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { data, error } = await storage.upload(uploadPath, buffer, {
      contentType: file.type,
    });

    if (error) {
      console.error('S3 Upload error:', error.message, error.stack);
      return NextResponse.json({ error: `Failed to upload file: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      path: data?.path,
      url: `/api/disk/image?path=${encodeURIComponent(data?.path || '')}`,
      type: paymentType,
    });
  } catch (error: any) {
    console.error('Error uploading payment receipt:', error.message, error.stack);
    return NextResponse.json({ error: `Failed to upload receipt: ${error.message}` }, { status: 500 });
  }
}
