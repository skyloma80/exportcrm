/**
 * Order Items with Shipped Quantities API
 * 获取订单项及其已发货数量
 * 
 * 从 SO 集合的 JSONB items 字段读取，代替旧的 order_items 表
 * 
 * GET /api/orders/[id]/items-with-shipped
 * Query params:
 *   - excludeShipmentId: 排除指定发货单的数量（用于编辑发货单时）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';

interface SOItem {
  id: string;
  part_number: string;
  product_name: string;
  description_en?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
}

interface ShipmentItem {
  id: string;
  shipment: string;
  order_item: string;
  quantity: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const { searchParams } = new URL(request.url);
    const excludeShipmentId = searchParams.get('excludeShipmentId');

    const pb = await createServerPocketBase();

    // 从 SO 集合读取 JSONB items
    const so = await pb.collection('so').getOne<{ items: SOItem[] }>(orderId);
    const items = Array.isArray(so.items) ? so.items : [];

    // 获取每个订单项的已发货数量
    const itemsWithShipped = await Promise.all(
      items.map(async (item) => {
        const filter = excludeShipmentId
          ? `order_item = "${item.id}" && shipment != "${excludeShipmentId}"`
          : `order_item = "${item.id}"`;

        const shipmentItems = await pb.collection('shipment_items').getFullList<ShipmentItem>({
          filter,
        });

        const shippedQuantity = shipmentItems.reduce((sum, si) => sum + si.quantity, 0);
        const remainingQuantity = item.quantity - shippedQuantity;

        return {
          id: item.id,
          product: {
            id: item.id,
            name: item.product_name || '-',
            code: item.part_number || '-',
            description: item.description_en || '',
          },
          quantity: item.quantity,
          shippedQuantity,
          remainingQuantity: Math.max(0, remainingQuantity),
        };
      })
    );

    return NextResponse.json({ items: itemsWithShipped });
  } catch (error: any) {
    console.error('Error fetching order items with shipped:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch order items' },
      { status: 500 }
    );
  }
}
