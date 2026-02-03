/**
 * API: Purchase Order Payments
 * POST /api/purchase-orders/[id]/payments - Create payment
 * GET /api/purchase-orders/[id]/payments - List payments
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { setServerPB } from '@/lib/pocketbase/base-service';
import { purchaseOrderPaymentService, purchaseOrderService } from '@/lib/pocketbase/services/purchase-orders';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poId } = await params;
    const pb = await createServerPocketBase();
    setServerPB(pb);

    const data = await request.json();

    // 创建付款记录
    const payment = await purchaseOrderPaymentService.create({
      purchase_order: poId,
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      payment_method: data.payment_method || '',
      payment_date: data.payment_date,
      bank_reference: data.bank_reference || '',
    });

    // 更新采购订单的已付金额
    const payments = await purchaseOrderPaymentService.getByPO(poId);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    await purchaseOrderService.update(poId, { paid_amount: totalPaid });

    return NextResponse.json(payment);
  } catch (error: any) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poId } = await params;
    const pb = await createServerPocketBase();
    setServerPB(pb);

    const payments = await purchaseOrderPaymentService.getByPO(poId);
    return NextResponse.json(payments);
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
