/**
 * Quotation Revise API
 * 报价单修订 API
 * 
 * POST /api/quotations/[id]/revise
 * Create a new revision of the quotation, copying all items and mold items.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { codeGenerator, CODE_PREFIXES } from '@/lib/services/code-generator';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const pb = await createServerPocketBase();

    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get original quotation with items
    const original = await pb.collection('quotations').getOne(id, {
      expand: 'quotation_items_via_quotation,quotation_mold_items_via_quotation',
    });

    if (!original) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    // Mark original as revised
    await pb.collection('quotations').update(id, { status: 'revised' });

    // Generate new code for the revision
    const newCode = await codeGenerator.generate(CODE_PREFIXES.QUOTATION, pb);

    // Create new quotation with incremented version
    const newQuotation = await pb.collection('quotations').create({
      code: newCode,
      project: original.project,
      customer: original.customer,
      version: (original.version || 1) + 1,
      status: 'draft',
      incoterm: original.incoterm,
      port_of_loading: original.port_of_loading,
      port_of_destination: original.port_of_destination,
      payment_terms: original.payment_terms,
      validity_days: original.validity_days,
      global_profit_margin: original.global_profit_margin,
      currency: original.currency,
      exchange_rate: original.exchange_rate,
      total_amount: original.total_amount,
    });

    // Copy quotation items
    const originalItems = original.expand?.quotation_items_via_quotation || [];
    for (const item of originalItems) {
      await pb.collection('quotation_items').create({
        quotation: newQuotation.id,
        product: item.product,
        quantity: item.quantity,
        cost_price: item.cost_price,
        profit_margin: item.profit_margin,
        unit_price: item.unit_price,
        amount: item.amount,
        remarks: item.remarks,
      });
    }

   
    return NextResponse.json({
      success: true,
      quotationId: newQuotation.id,
      quotationCode: newQuotation.code,
      version: newQuotation.version,
    });
  } catch (error: any) {
    console.error('Quotation revise error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create revision' },
      { status: 500 }
    );
  }
}
