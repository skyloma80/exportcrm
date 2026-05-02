/**
 * Copy Order API
 * 复制订单接口
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';

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

    // Get order items
    const orderItems = await pb.collection('order_items').getFullList({
      filter: `order = "${id}"`,
    });

    // Generate new order code in compact format: A{YY}{XXXX}
    const year = new Date().getFullYear();
    const yearSuffix = year.toString().slice(-2);
    const sequences = await pb.collection('code_sequences').getList(1, 1, {
      filter: `prefix = "ORD" && year = ${year}`,
    });

    let newSequence = 1;
    if (sequences.items.length > 0) {
      newSequence = sequences.items[0].current_sequence + 1;
      await pb.collection('code_sequences').update(sequences.items[0].id, {
        current_sequence: newSequence,
      });
    } else {
      await pb.collection('code_sequences').create({
        prefix: 'ORD',
        year,
        current_sequence: 1,
      });
    }

    const newOrderCode = `A${yearSuffix}${String(newSequence).padStart(4, '0')}`;

    // Create new order (copy)
    // Ensure total_amount is not 0 to avoid PocketBase validation error
    const totalAmount = order.total_amount || 0.01;
    
    const newOrder = await pb.collection('so').create({
      code: newOrderCode,
      project: order.project,
      customer: order.customer,
      status: 'draft',
      incoterm: order.incoterm,
      currency: order.currency,
      exchange_rate: order.exchange_rate,
      port_of_loading: order.port_of_loading,
      port_of_destination: order.port_of_destination,
      payment_terms: order.payment_terms,
      total_amount: totalAmount,
      remarks: order.remarks ? `[Copied from ${order.code}] ${order.remarks}` : `Copied from ${order.code}`,
    });

    // Copy order items
    for (const item of orderItems) {
      await pb.collection('order_items').create({
        order: newOrder.id,
        product: item.product,
        quantity: item.quantity,
        unit_price: item.unit_price,
        remarks: item.remarks,
      });
    }

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
