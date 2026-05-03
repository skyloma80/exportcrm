/**
 * Copy Order API
 * 复制销售订单接口 (使用新的 items 字段)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { generateOrderCode } from '@/lib/services/code-generator';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pb = await createServerPocketBase();

    // Get original order
    const order = await pb.collection('so').getOne(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Generate new order code
    const newOrderCode = await generateOrderCode(pb);

    // Copy items using new JSONB field
    const copiedItems = (order.items || []).map((item: any) => ({
      ...item,
      id: crypto.randomUUID(),
    }));

    // Create new order (copy)
    const totalAmount = order.total_amount || 0.01;

    const newOrder = await pb.collection('so').create({
      code: newOrderCode,
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      customer_address: order.customer_address,
      customer_tax_id: order.customer_tax_id,
      customer_po: order.customer_po,
      vendor_code: order.vendor_code,
      currency: order.currency,
      incoterm: order.incoterm,
      port_of_loading: order.port_of_loading,
      port_of_destination: order.port_of_destination,
      payment_terms: order.payment_terms,
      bank_info: order.bank_info,
      country_of_origin: order.country_of_origin,
      country_of_destination: order.country_of_destination,
      mode_of_shipment: order.mode_of_shipment,
      shipping_marks: order.shipping_marks,
      expected_delivery_date: order.expected_delivery_date,
      estimated_shipping_date: order.estimated_shipping_date,
      remarks: order.remarks ? `[Copied from ${order.code}] ${order.remarks}` : `Copied from ${order.code}`,
      project_id: order.project_id,
      total_amount: totalAmount,
      paid_amount: 0,
      status: 'draft',
      items: copiedItems,
    });

    return NextResponse.json({
      success: true,
      order: {
        id: newOrder.id,
        code: newOrderCode,
      },
      message: 'Order copied successfully',
    });

  } catch (error: any) {
    console.error('Copy order error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to copy order' },
      { status: 500 }
    );
  }
}
