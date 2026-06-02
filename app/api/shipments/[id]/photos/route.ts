/**
 * 发货装柜照片 API
 * 
 * GET: 列出指定发货记录的装柜照片
 * POST: 上传装柜照片
 */

import { NextRequest, NextResponse } from 'next/server';
import { createStorage } from '@/lib/s3/storage';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { extractOrderPathInfo } from '@/lib/services/shipment-document-path';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 获取装柜照片存储路径
 */
function getLoadingPhotosPath(
  pathInfo: { customerName: string; projectName: string; orderCode?: string },
  shipmentIndex: number
): string {
  const orderCode = pathInfo.orderCode || 'unknown';
  return `Customers/${pathInfo.customerName}/${pathInfo.projectName}/orders/${orderCode}/shipments_${shipmentIndex}/loading_photos/`;
}

/**
 * GET - 列出装柜照片
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const pb = await createServerPocketBase();
    
    // 获取发货记录详情
    let shipment;
    try {
      shipment = await pb.collection('shipments').getOne(id, {
        expand: 'order',
      });
    } catch (e: any) {
      if (e.status === 404) {
        return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
      }
      throw e;
    }

    const order = shipment.expand?.order;
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const pathInfo = extractOrderPathInfo(order);
    if (!pathInfo) {
      return NextResponse.json({ error: 'Missing customer or project info' }, { status: 400 });
    }

    // 获取该发货记录在订单中的序号
    const allShipments = await pb.collection('shipments').getFullList({
      filter: `order = "${order.id}"`,
      sort: 'id',
    });
    const shipmentIndex = allShipments.findIndex(s => s.id === id) + 1;

    const storage = createStorage();
    const photosPath = getLoadingPhotosPath(pathInfo, shipmentIndex);
    
    const { data: files, error } = await storage.list({ prefix: photosPath, delimiter: '' });
    
    if (error) {
      console.error('Error listing photos:', error);
      return NextResponse.json({ photos: [] });
    }

    // 过滤出图片文件
    const photos = files
      .filter(f => !f.isFolder && f.name !== '.keep')
      .filter(f => {
        const ext = f.name.split('.').pop()?.toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
      })
      .map(f => ({
        name: f.name,
        path: f.path,
        size: f.size,
        url: `/api/disk/image?path=${encodeURIComponent(f.path)}`,
        lastModified: f.lastModified?.toISOString(),
      }));

    return NextResponse.json({ photos });
  } catch (error) {
    console.error('Error fetching loading photos:', error);
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
  }
}

/**
 * POST - 上传装柜照片
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'loading' or other types

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 验证文件类型
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 });
    }

    const pb = await createServerPocketBase();
    
    // 获取发货记录详情
    let shipment;
    try {
      shipment = await pb.collection('shipments').getOne(id, {
        expand: 'order',
      });
    } catch (e: any) {
      if (e.status === 404) {
        return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
      }
      throw e;
    }

    const order = shipment.expand?.order;
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const pathInfo = extractOrderPathInfo(order);
    if (!pathInfo) {
      return NextResponse.json({ error: 'Missing customer or project info' }, { status: 400 });
    }

    // 获取发货序号
    const allShipments = await pb.collection('shipments').getFullList({
      filter: `order = "${order.id}"`,
      sort: 'id',
    });
    const shipmentIndex = allShipments.findIndex(s => s.id === id) + 1;

    const storage = createStorage();
    const photosPath = getLoadingPhotosPath(pathInfo, shipmentIndex);
    
    // 生成唯一文件名（时间戳 + 原文件名）
    const timestamp = Date.now();
    const uploadPath = `${photosPath}${timestamp}_${file.name}`;

    // 上传文件
    const buffer = Buffer.from(await file.arrayBuffer());
    const { data, error } = await storage.upload(uploadPath, buffer, {
      contentType: file.type,
    });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      path: data?.path,
      url: `/api/disk/image?path=${encodeURIComponent(data?.path || '')}`,
      name: file.name,
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
  }
}
