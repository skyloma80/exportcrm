/**
 * RFQ Quotations API
 * 供应商报价 API
 * 
 * GET /api/rfqs/[id]/quotations - Get all quotations for an RFQ
 * POST /api/rfqs/[id]/quotations - Save supplier quotation (manual entry)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';

interface QuotationItemInput {
  rfqItemId: string;
  unitPrice: number;
  moq?: number;
  leadTimeDays?: number;
  remarks?: string;
}

interface SaveQuotationRequest {
  supplierId: string;
  currency: string;
  leadTimeDays?: number;
  validityDays?: number;
  paymentTerms?: string;
  shippingTerms?: string;
  notes?: string;
  items: QuotationItemInput[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rfqId } = await params;
    const pb = await createServerPocketBase();

    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all quotations for this RFQ
    const quotations = await pb.collection('rfq_quotations').getFullList({
      filter: `rfq = "${rfqId}"`,
      expand: 'rfq_item,rfq_item.product,supplier',
    });

    return NextResponse.json({ quotations });
  } catch (error: any) {
    console.error('GET quotations error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get quotations' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rfqId } = await params;
    const pb = await createServerPocketBase();

    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify RFQ exists
    let rfq;
    try {
      rfq = await pb.collection('rfqs').getOne(rfqId);
    } catch {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    const body: SaveQuotationRequest = await request.json();
    const { supplierId, items } = body;

    if (!supplierId) {
      return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    // Verify supplier is in RFQ
    const rfqSuppliers = await pb.collection('rfq_suppliers').getFullList({
      filter: `rfq = "${rfqId}" && supplier = "${supplierId}"`,
    });

    if (rfqSuppliers.length === 0) {
      return NextResponse.json({ error: 'Supplier not found in RFQ' }, { status: 400 });
    }

    const rfqSupplier = rfqSuppliers[0];

    // Calculate valid_until date
    const validUntil = body.validityDays
      ? new Date(Date.now() + body.validityDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : undefined;

    // Process each item - update or create quotation
    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (const item of items) {
      try {
        // Check if quotation already exists
        const existing = await pb.collection('rfq_quotations').getFullList({
          filter: `rfq = "${rfqId}" && rfq_item = "${item.rfqItemId}" && supplier = "${supplierId}"`,
        });

        const quotationData = {
          rfq: rfqId,
          rfq_item: item.rfqItemId,
          supplier: supplierId,
          unit_price: item.unitPrice,
          moq: item.moq || null,
          lead_time_days: item.leadTimeDays || body.leadTimeDays || null,
          valid_until: validUntil || null,
          remarks: item.remarks || null,
        };

        if (existing.length > 0) {
          // Update existing quotation
          await pb.collection('rfq_quotations').update(existing[0].id, quotationData);
          results.updated++;
        } else {
          // Create new quotation
          await pb.collection('rfq_quotations').create(quotationData);
          results.created++;
        }
      } catch (err: any) {
        results.errors.push(`Item ${item.rfqItemId}: ${err.message}`);
      }
    }

    // Update RFQ supplier status to 'received'
    if (rfqSupplier.status === 'pending' || rfqSupplier.status === 'sent') {
      await pb.collection('rfq_suppliers').update(rfqSupplier.id, {
        status: 'received',
        received_at: new Date().toISOString(),
      });
    }

    // Update RFQ status if still in draft or sent
    if (rfq.status === 'draft' || rfq.status === 'sent') {
      await pb.collection('rfqs').update(rfqId, { status: 'received' });
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('POST quotation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save quotation' },
      { status: 500 }
    );
  }
}
