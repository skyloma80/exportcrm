/**
 * Order Templates API
 * 订单模板API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';

export async function GET(request: NextRequest) {
  try {
    const pb = await createServerPocketBase();
    
    const templates = await pb.collection('order_templates').getFullList({
      sort: '-id',
    });

    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error('Failed to fetch order templates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const pb = await createServerPocketBase();
    const body = await request.json();

    const { name, description, order_id } = body;

    if (!name || !order_id) {
      return NextResponse.json(
        { error: 'Name and order_id are required' },
        { status: 400 }
      );
    }

    // Get the source order with items
    const order = await pb.collection('orders').getOne(order_id, {
      expand: 'order_items_via_order',
    });

    // Create template data
    const templateData = {
      customer: order.customer,
      project: order.project,
      currency: order.currency,
      incoterm: order.incoterm,
      payment_terms: order.payment_terms,
      delivery_port: order.delivery_port,
      destination_port: order.destination_port,
      remarks: order.remarks,
    };

    // Get order items
    const items = order.expand?.order_items_via_order || [];
    const templateItems = items.map((item: any) => ({
      product: item.product,
      quantity: item.quantity,
      unit_price: item.unit_price,
      unit: item.unit,
      remarks: item.remarks,
    }));

    // Create the template
    const template = await pb.collection('order_templates').create({
      name,
      description,
      template_data: templateData,
      template_items: templateItems,
      source_order: order_id,
    });

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error('Failed to create order template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create template' },
      { status: 500 }
    );
  }
}
