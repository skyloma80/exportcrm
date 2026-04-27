import { NextRequest, NextResponse } from 'next/server';
import { getPocketBase } from '@/lib/pocketbase/auth';
import { purchaseOrderService, purchaseOrderItemService } from '@/lib/pocketbase/services/purchase-orders';

export async function POST(request: NextRequest) {
  try {
    const pb = getPocketBase();
    if (!pb.authStore.isValid) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { items, ...poData } = body;

    // 1. Create the Purchase Order
    const po = await purchaseOrderService.createPO({
      ...poData,
      status: poData.status || 'draft',
      total_amount: body.total_amount || 0,
    });

    // 2. Create PO Items
    if (items && items.length > 0) {
      const itemPromises = items.map((item: any) => 
        purchaseOrderItemService.createItem({
          purchase_order: po.id,
          product: item.product,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
        })
      );
      await Promise.all(itemPromises);
    }

    return NextResponse.json(po);
  } catch (error: any) {
    console.error('Error creating purchase order:', error);
    return NextResponse.json(
      { message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
    try {
        const pb = getPocketBase();
        if (!pb.authStore.isValid) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const perPage = parseInt(searchParams.get('perPage') || '50');
        const filter = searchParams.get('filter') || '';

        const result = await purchaseOrderService.getListWithExpand(page, perPage, filter);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
