/**
 * API: Upload Payment Receipt Files
 * POST /api/purchase-orders/[id]/payment-receipts
 * 
 * 上传付款凭证到磁盘目录
 * 目录结构: Customers/{客户名}/{项目名}/{订单号}/purchase_orders/{采购单号}/{payment_type}/{filename}
 */

import { NextRequest, NextResponse } from 'next/server';
import { createStorage } from '@/lib/s3/storage';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { extractOrderPathInfo } from '@/lib/services/shipment-document-path';

// 付款类型映射
const PAYMENT_TYPE_FOLDERS: Record<string, string> = {
  deposit: 'deposit',
  progress: 'progress',
  final: 'final',
};

/**
 * 清理路径中的特殊字符
 */
function sanitizePath(str: string): string {
  return str
    .replace(/[\/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .trim();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poId } = await params;
    const pb = await createServerPocketBase();

    // 获取采购订单信息（包含关联的订单、项目、客户）
    const po = await pb.collection('po').getOne(poId, {
      expand: 'order,order.project,order.customer',
    });
    
    if (!po) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    // 检查是否有关联订单
    if (!po.order) {
      return NextResponse.json({ error: 'Purchase order must be linked to a sales order' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const paymentType = formData.get('payment_type') as string;
    const paymentId = formData.get('payment_id') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!paymentType || !PAYMENT_TYPE_FOLDERS[paymentType]) {
      return NextResponse.json({ error: `Invalid payment type: ${paymentType}` }, { status: 400 });
    }

    // 获取订单信息
    const order = po.expand?.order;
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 提取路径信息
    const pathInfo = extractOrderPathInfo(order as any);
    if (!pathInfo) {
      return NextResponse.json({ error: 'Missing customer or project info' }, { status: 400 });
    }

    // 构建目录路径: Customers/{客户名}/{项目名}/orders/{订单号}/purchase_orders/{采购单号}/{payment_type}/
    const typeFolder = PAYMENT_TYPE_FOLDERS[paymentType];
    const uploadPath = `Customers/${sanitizePath(pathInfo.customerName)}/${sanitizePath(pathInfo.projectName)}/orders/${sanitizePath(pathInfo.orderCode)}/purchase_orders/${sanitizePath(po.code)}/${typeFolder}/${file.name}`;

    console.log('Upload path:', uploadPath);

    // 上传文件
    const storage = createStorage();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { data, error } = await storage.upload(uploadPath, buffer, {
      contentType: file.type,
    });

    if (error) {
      console.error('Storage upload error:', error);
      return NextResponse.json({ error: `Failed to upload file: ${error.message}` }, { status: 500 });
    }

    // 构建相对路径（用于保存到数据库）
    const relativePath = `${sanitizePath(pathInfo.customerName)}/${sanitizePath(pathInfo.projectName)}/orders/${sanitizePath(pathInfo.orderCode)}/purchase_orders/${sanitizePath(po.code)}/${typeFolder}/${file.name}`;

    // 如果提供了 payment_id，更新付款记录
    if (paymentId) {
      await pb.collection('purchase_order_payments').update(paymentId, {
        voucher_file: relativePath,
      });
    }

    return NextResponse.json({
      success: true,
      path: data?.path,
      relativePath,
      fileName: file.name,
      url: `/api/disk/image?path=${encodeURIComponent(data?.path || '')}`,
    });
  } catch (error: any) {
    console.error('Error uploading payment receipt:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/purchase-orders/[id]/payment-receipts?payment_id={id}
 * 获取付款凭证文件信息
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const paymentId = searchParams.get('payment_id');

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID required' }, { status: 400 });
    }

    const pb = await createServerPocketBase();
    const payment = await pb.collection('purchase_order_payments').getOne(paymentId);

    if (!payment.voucher_file) {
      return NextResponse.json({ hasFile: false });
    }

    // 构建完整路径
    const fullPath = `Customers/${payment.voucher_file}`;
    const storage = createStorage();
    
    // 检查文件是否存在
    const { data: files } = await storage.list({ 
      prefix: fullPath,
      delimiter: '',
    });

    const fileExists = files && files.length > 0;

    return NextResponse.json({
      hasFile: fileExists,
      path: payment.voucher_file,
      url: fileExists ? `/api/disk/image?path=${encodeURIComponent(fullPath)}` : null,
      fileName: payment.voucher_file.split('/').pop(),
    });
  } catch (error: any) {
    console.error('Error getting payment receipt info:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get file info' },
      { status: 500 }
    );
  }
}
