/**
 * 发货单据 API
 * 
 * GET: 列出指定发货记录的所有单据（支持检测 .na 文件判断"不适用"状态），包含 domestic_freight 字段
 * POST: 上传单据到对应目录，或标记为"不适用"（创建 .na 文件）
 * PATCH: 更新发货记录的 domestic_freight 字段
 * DELETE: 重置"不适用"状态（删除 .na 文件）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createStorage } from '@/lib/s3/storage';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import {
  SHIPMENT_DOCUMENT_TYPES,
  ShipmentDocumentType,
  getShipmentDocumentPath,
  getDocumentUploadPath,
  extractOrderPathInfo,
  DOCUMENT_TYPE_LABELS,
} from '@/lib/services/shipment-document-path';

// 单据状态类型
type DocumentStatus = 'pending' | 'uploaded' | 'not_applicable';

// .na 标记文件名
const NA_MARKER_FILE = '.na';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 根据目录内容判断单据状态
 * - 存在 .na 文件 → not_applicable
 * - 存在其他文件（非 .na, .keep）→ uploaded
 * - 目录为空或只有 .keep → pending
 */
function getDocumentStatus(files: Array<{ name: string }>, hasNaMarker: boolean): DocumentStatus {
  if (hasNaMarker) return 'not_applicable';
  const realFiles = files.filter(f => f.name !== '.keep' && f.name !== NA_MARKER_FILE);
  if (realFiles.length > 0) return 'uploaded';
  return 'pending';
}

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

    // 获取订单详情
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
    const documents: Record<string, { 
      status: DocumentStatus;
      files: Array<{ name: string; path: string; size: number; url: string }>;
    }> = {};

    let completedCount = 0;

    // 遍历所有单据类型，检查是否有文件
    for (const docType of SHIPMENT_DOCUMENT_TYPES) {
      const prefix = getShipmentDocumentPath(pathInfo, shipmentIndex, docType);
      const { data: files, error } = await storage.list({ prefix, delimiter: '' });
      
      if (error) {
        console.error(`Error listing ${docType}:`, error);
        documents[docType] = { status: 'pending', files: [] };
        continue;
      }

      // 检查是否存在 .na 标记文件
      const hasNaMarker = files.some(f => f.name === NA_MARKER_FILE);

      // 过滤出真实文件（排除 .na 和 .keep）
      const fileList = files
        .filter(f => !f.isFolder && f.name !== '.keep' && f.name !== NA_MARKER_FILE)
        .map(f => ({
          name: f.name,
          path: f.path,
          size: f.size,
          url: `/api/disk/image?path=${encodeURIComponent(f.path)}`,
        }));

      const status = getDocumentStatus(files, hasNaMarker);
      
      // 统计已完成数量（uploaded 或 not_applicable）
      if (status === 'uploaded' || status === 'not_applicable') {
        completedCount++;
      }

      documents[docType] = {
        status,
        files: fileList,
      };
    }

    return NextResponse.json({
      shipmentId: id,
      shipmentCode: shipment.code,
      shipmentIndex,
      orderCode: order.code,
      domestic_freight: shipment.domestic_freight ?? null,
      documents,
      documentTypes: SHIPMENT_DOCUMENT_TYPES.map(type => ({
        type,
        label: DOCUMENT_TYPE_LABELS[type] || type,
      })),
      progress: {
        completed: completedCount,
        total: SHIPMENT_DOCUMENT_TYPES.length,
      },
    });
  } catch (error) {
    console.error('Error fetching shipment documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const contentType = request.headers.get('content-type') || '';
    
    // 判断请求类型：JSON 用于标记"不适用"，FormData 用于文件上传
    const isJsonRequest = contentType.includes('application/json');
    
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

    // 获取订单详情
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

    // 处理标记"不适用"请求
    if (isJsonRequest) {
      const body = await request.json();
      const { docType, action } = body;

      if (!docType || !SHIPMENT_DOCUMENT_TYPES.includes(docType)) {
        return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
      }

      if (action !== 'mark_na') {
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }

      // 创建 .na 标记文件
      const naFilePath = `${getShipmentDocumentPath(pathInfo, shipmentIndex, docType)}${NA_MARKER_FILE}`;
      const { error } = await storage.upload(naFilePath, Buffer.from(''), {
        contentType: 'text/plain',
      });

      if (error) {
        console.error('Error creating .na marker:', error);
        return NextResponse.json({ error: 'Failed to mark as not applicable' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        status: 'not_applicable' as DocumentStatus,
      });
    }

    // 处理文件上传请求
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const docType = formData.get('docType') as ShipmentDocumentType;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!docType || !SHIPMENT_DOCUMENT_TYPES.includes(docType)) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }

    // 生成上传路径
    const uploadPath = getDocumentUploadPath(pathInfo, docType, file.name, shipmentIndex);

    // 上传文件
    const buffer = Buffer.from(await file.arrayBuffer());
    const { data, error } = await storage.upload(uploadPath, buffer, {
      contentType: file.type,
    });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      path: data?.path,
      url: `/api/disk/image?path=${encodeURIComponent(data?.path || '')}`,
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}


/**
 * PATCH: 更新发货记录的 domestic_freight 字段
 * Body: { domestic_freight: number }
 * Requirements: 7.2
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { domestic_freight } = body;

    // 验证 domestic_freight 是数字或 null
    if (domestic_freight !== null && domestic_freight !== undefined && typeof domestic_freight !== 'number') {
      return NextResponse.json({ error: 'Invalid domestic_freight value' }, { status: 400 });
    }

    const pb = await createServerPocketBase();

    // 验证发货记录存在
    try {
      await pb.collection('shipments').getOne(id);
    } catch (e: any) {
      if (e.status === 404) {
        return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
      }
      throw e;
    }

    // 更新 domestic_freight 字段
    const updated = await pb.collection('shipments').update(id, {
      domestic_freight: domestic_freight ?? null,
    });

    return NextResponse.json({
      success: true,
      domestic_freight: updated.domestic_freight,
    });
  } catch (error) {
    console.error('Error updating domestic freight:', error);
    return NextResponse.json({ error: 'Failed to update domestic freight' }, { status: 500 });
  }
}

/**
 * DELETE: 重置"不适用"状态（删除 .na 文件）
 * Body: { docType: string }
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { docType } = body;

    if (!docType || !SHIPMENT_DOCUMENT_TYPES.includes(docType)) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
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

    // 获取订单详情
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

    // 删除 .na 标记文件
    const storage = createStorage();
    const naFilePath = `${getShipmentDocumentPath(pathInfo, shipmentIndex, docType as ShipmentDocumentType)}${NA_MARKER_FILE}`;
    
    const { error } = await storage.remove([naFilePath]);

    if (error) {
      console.error('Error removing .na marker:', error);
      return NextResponse.json({ error: 'Failed to reset status' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      status: 'pending' as DocumentStatus,
    });
  } catch (error) {
    console.error('Error resetting document status:', error);
    return NextResponse.json({ error: 'Failed to reset status' }, { status: 500 });
  }
}
