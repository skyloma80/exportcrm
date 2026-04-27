import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { excelPiService } from '@/lib/services/excel-pi-service';
import type { OrderWithExpand } from '@/lib/pocketbase/services/orders';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pb = await createServerPocketBase();

    // Check authentication
    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch order with expand
    const order = await pb.collection('orders').getOne<OrderWithExpand>(id, {
      expand: 'customer,project,order_items_via_order,order_items_via_order.product',
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Generate Excel buffer
    const buffer = await excelPiService.generatePiExcel(order);

    // Prepare filename
    const filename = `PI-${order.code}-${new Date().toISOString().split('T')[0]}.xlsx`;

    // Return the excel file - convert Buffer to Uint8Array for NextResponse
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('PI Export Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export PI' },
      { status: 500 }
    );
  }
}
