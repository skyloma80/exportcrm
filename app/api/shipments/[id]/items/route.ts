/**
 * Shipment Items API
 * 发货明细 API
 * 
 * GET /api/shipments/[id]/items - 获取发货明细
 * POST /api/shipments/[id]/items - 保存发货明细
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';

interface ShipmentItemWithExpand {
  id: string;
  shipment: string;
  order_item: string;
  quantity: number;
  packages?: number;
  gross_weight?: number;
  net_weight?: number;
  volume?: number;
  package_length?: number;
  package_width?: number;
  package_height?: number;
  expand?: {
    order_item?: {
      id: string;
      product: string;
      quantity: number;
      expand?: {
        product?: {
          id: string;
          code: string;
          name: string;
        };
      };
    };
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shipmentId } = await params;
    const pb = await createServerPocketBase();

    // 获取发货明细
    const items = await pb.collection('shipment_items').getFullList<ShipmentItemWithExpand>({
      filter: `shipment = "${shipmentId}"`,
      expand: 'order_item,order_item.product',
    });

    // 转换为前端期望的格式
    const formattedItems = items.map((item) => ({
      id: item.id,
      shipment: item.shipment,
      order_item: item.order_item,
      quantity: item.quantity,
      packages: item.packages,
      gross_weight: item.gross_weight,
      net_weight: item.net_weight,
      volume: item.volume,
      package_length: item.package_length,
      package_width: item.package_width,
      package_height: item.package_height,
      // 展开的产品信息
      product: item.expand?.order_item?.expand?.product ? {
        id: item.expand.order_item.expand.product.id,
        name: item.expand.order_item.expand.product.name,
        code: item.expand.order_item.expand.product.code,
      } : null,
    }));

    return NextResponse.json({ items: formattedItems });
  } catch (error: any) {
    console.error('Error fetching shipment items:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch shipment items' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shipmentId } = await params;
    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items must be an array' },
        { status: 400 }
      );
    }

    const pb = await createServerPocketBase();

    // 获取现有的发货明细
    const existingItems = await pb.collection('shipment_items').getFullList<ShipmentItemWithExpand>({
      filter: `shipment = "${shipmentId}"`,
    });
    const existingMap = new Map(existingItems.map(item => [item.order_item, item]));

    // 处理每个项目
    const results = [];
    const processedOrderItems = new Set<string>();

    for (const item of items) {
      const { orderItemId, quantity } = item;
      processedOrderItems.add(orderItemId);

      const existing = existingMap.get(orderItemId);
      
      if (existing) {
        // 更新现有记录
        const updated = await pb.collection('shipment_items').update(existing.id, {
          quantity,
        });
        results.push(updated);
      } else {
        // 创建新记录
        const created = await pb.collection('shipment_items').create({
          shipment: shipmentId,
          order_item: orderItemId,
          quantity,
        });
        results.push(created);
      }
    }

    // 删除不再选中的项目
    for (const existing of existingItems) {
      if (!processedOrderItems.has(existing.order_item)) {
        await pb.collection('shipment_items').delete(existing.id);
      }
    }

    return NextResponse.json({ items: results, success: true });
  } catch (error: any) {
    console.error('Error saving shipment items:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save shipment items' },
      { status: 500 }
    );
  }
}
