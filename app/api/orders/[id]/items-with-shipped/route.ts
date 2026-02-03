/**
 * Order Items with Shipped Quantities API
 * 获取订单项及其已发货数量
 * 
 * GET /api/orders/[id]/items-with-shipped
 * Query params:
 *   - excludeShipmentId: 排除指定发货单的数量（用于编辑发货单时）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';

interface OrderItemWithExpand {
  id: string;
  order: string;
  product: string;
  quantity: number;
  unit_price: number;
  amount: number;
  expand?: {
    product?: {
      id: string;
      code: string;
      name: string;
    };
  };
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

    // 获取订单项
    const orderItems = await pb.collection('order_items').getFullList<OrderItemWithExpand>({
      filter: `order = "${orderId}"`,
      expand: 'product',
    });

    // 获取每个订单项的已发货数量
    const itemsWithShipped = await Promise.all(
      orderItems.map(async (item) => {
        // 获取该订单项的所有发货记录
        const filter = excludeShipmentId 
          ? `order_item = "${item.id}" && shipment != "${excludeShipmentId}"`
          : `order_item = "${item.id}"`;
        
        const shipmentItems = await pb.collection('shipment_items').getFullList<ShipmentItem>({
          filter,
        });

        // 计算已发货总数
        const shippedQuantity = shipmentItems.reduce((sum, si) => sum + si.quantity, 0);
        const remainingQuantity = item.quantity - shippedQuantity;

        // 返回符合 OrderItemWithShipped 接口的格式
        return {
          id: item.id,
          product: {
            id: item.product,
            name: item.expand?.product?.name || '-',
            code: item.expand?.product?.code || '-',
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
