import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { orderService } from '@/lib/pocketbase/services/orders';

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

    const data = await request.json();
    const { items, ...orderData } = data;

    // 1. Create the order
    const currentUser = pb.authStore.model?.id;
    console.log('[API /orders POST] orderData payload:', JSON.stringify(orderData, null, 2));
    const order = await orderService.createOrder(orderData, currentUser);

    // 2. Create order items
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await pb.collection('order_items').create({
          order: order.id,
          product: item.product,
          quantity: item.quantity,
          unit_price: item.unit_price,
          cost_price: item.cost_price,
          amount: item.amount,
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
