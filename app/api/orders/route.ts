import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { orderService } from '@/lib/pocketbase/services/orders';
import { setServerPB } from '@/lib/pocketbase/base-service';

/**
 * Orders API Route (POST)
 * 创建订单 API
 */
export async function POST(request: NextRequest) {
  try {
    const pb = await createServerPocketBase();

    // Check authentication
    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Set server PB for services
    setServerPB(pb);

    const data = await request.json();
    const { items, ...orderData } = data;

    // 1. Create the order
    const currentUser = pb.authStore.model?.id;
    console.log('[API /orders POST] orderData payload:', JSON.stringify(orderData, null, 2));
    const order = await orderService.createOrder(orderData, currentUser);

    // 2. Create order items
    if (items && Array.isArray(items)) {
      const { orderItemService } = await import('@/lib/pocketbase/services/orders');
      for (const item of items) {
        await orderItemService.createItem({
          order: order.id,
          product: item.product,
          product_name: item.product_name,
          product_code: item.product_code,
          part_number: item.part_number,
          description_en: item.description_en,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          cost_price: item.cost_price,
        });
      }
    }

    // 3. Recalculate total (though the service might handle it, let's be sure)
    await orderService.recalculateTotal(order.id);

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Order Creation Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
