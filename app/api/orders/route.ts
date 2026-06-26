import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { orderService } from '@/lib/pocketbase/services/orders';
import { setServerPB } from '@/lib/pocketbase/base-service';

/**
 * Create a new order
 * @description Creates a new sales order with items. Accepts order metadata and an array of line items. Returns the created order record.
 * @request CreateOrderSchema
 * @response 200:OrderSchema:The created order
 * @response 400:ErrorResponse:Invalid input
 * @response 401:ErrorResponse:Unauthorized
 * @response 500:ErrorResponse:Server error
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

    // 2. Store items as JSON on the order record
    if (items && Array.isArray(items)) {
      await orderService.update(order.id, { items });
    }

    // 3. Recalculate total
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
