/**
 * Convert Quotation to Order API
 * 报价转订单接口
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';

// Helper function to get exchange rate from server-side PocketBase
async function getServerRate(pb: any, from: string, to: string): Promise<number> {
  if (from === to) return 1;

  try {
    // Try to get direct rate
    const directRate = await pb.collection('exchange_rate_cache').getList(1, 1, {
      filter: `base_currency = "${from}" && target_currency = "${to}"`,
    });

    if (directRate.items.length > 0) {
      return directRate.items[0].rate;
    }

    // Try to get inverse rate
    const inverseRate = await pb.collection('exchange_rate_cache').getList(1, 1, {
      filter: `base_currency = "${to}" && target_currency = "${from}"`,
    });

    if (inverseRate.items.length > 0) {
      return 1 / inverseRate.items[0].rate;
    }

    // Try to calculate via CNY (since rates are stored as CNY -> currency)
    if (from !== 'CNY' && to === 'CNY') {
      // Get CNY -> from rate and invert it
      const cnyToFrom = await pb.collection('exchange_rate_cache').getList(1, 1, {
        filter: `base_currency = "CNY" && target_currency = "${from}"`,
      });
      if (cnyToFrom.items.length > 0) {
        return 1 / cnyToFrom.items[0].rate;
      }
    }

    console.warn(`No rate found for ${from} to ${to}`);
    return 1;
  } catch (error) {
    console.error(`Error getting rate for ${from} to ${to}:`, error);
    return 1;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pb = await createServerPocketBase();

    // Get quotation with items
    const quotation = await pb.collection('quotations').getOne(id, {
      expand: 'project,customer',
    });

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    // Check if quotation is in valid status
    if (quotation.status !== 'sent' && quotation.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Only sent or accepted quotations can be converted to orders' },
        { status: 400 }
      );
    }

    // Check if quotation has already been converted to an order
    const existingOrders = await pb.collection('so').getList(1, 1, {
      filter: `quotation = "${id}"`,
    });

    if (existingOrders.items.length > 0) {
      // Return the existing order instead of error
      return NextResponse.json({
        success: true,
        order: {
          id: existingOrders.items[0].id,
          code: existingOrders.items[0].code,
        },
        message: 'Order already exists for this quotation',
        isExisting: true,
      });
    }

    // Get quotation items
    const quotationItems = await pb.collection('quotation_items').getFullList({
      filter: `quotation = "${id}"`,
    });

    // Generate order code in compact format: A{YY}{XXXX}
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

    const orderCode = `A${yearSuffix}${String(newSequence).padStart(4, '0')}`;

    // Get exchange rate - use quotation rate if available, otherwise fetch current rate
    let exchangeRate = quotation.exchange_rate;
    if (!exchangeRate || exchangeRate <= 0) {
      // Fetch current exchange rate for the currency
      if (quotation.currency && quotation.currency !== 'CNY') {
        exchangeRate = await getServerRate(pb, quotation.currency, 'CNY');
      } else {
        exchangeRate = 1;
      }
    }

    // Create order using the service to properly handle created_by
    const { orderService } = await import('@/lib/pocketbase/services/orders');

    // For server-side API, we might not have user context, so pass undefined
    // The service will try to get user from auth store, which will be empty in server context
    const order = await orderService.createOrder({
      project: quotation.project,
      customer: quotation.customer,
      quotation: id,
      incoterm: quotation.incoterm,
      currency: quotation.currency,
      exchange_rate: exchangeRate,
      port_of_loading: quotation.port_of_loading,
      port_of_destination: quotation.port_of_destination,
      payment_terms: quotation.payment_terms,
      remarks: quotation.remarks,
    }, undefined, quotation.total_amount);

    // Create order items from quotation items
    for (const item of quotationItems) {
      // Ensure item amount is rounded to 2 decimal places to match quotation system behavior
      const amount = Math.round(item.quantity * item.unit_price * 100) / 100;
      await pb.collection('order_items').create({
        order: order.id,
        product: item.product,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: amount,
      });
    }

    // Update quotation status to accepted if not already
    if (quotation.status !== 'accepted') {
      await pb.collection('quotations').update(id, {
        status: 'accepted',
      });
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        code: orderCode,
      },
      message: 'Order created successfully from quotation',
    });

  } catch (error: any) {
    console.error('Convert quotation to order error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to convert quotation to order' },
      { status: 500 }
    );
  }
}
