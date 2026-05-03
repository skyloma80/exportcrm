/**
 * RFQ Merge to Quotation API
 * 询价单合并转报价 API
 * 
 * POST /api/rfqs/merge-to-quotation
 * Merge multiple RFQs into a single customer quotation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { codeGenerator, CODE_PREFIXES } from '@/lib/services/code-generator';

interface MergeToQuotationRequest {
  rfqIds: string[];
  productSupplierMapping?: Record<string, string>; // productId -> supplierId
}

export async function POST(request: NextRequest) {
  try {
    const pb = await createServerPocketBase();

    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: MergeToQuotationRequest = await request.json();
    const { rfqIds, productSupplierMapping = {} } = body;

    if (!rfqIds || rfqIds.length === 0) {
      return NextResponse.json({ error: 'No RFQ IDs provided' }, { status: 400 });
    }

    // Get all RFQs and validate they belong to the same project
    const rfqs = await Promise.all(
      rfqIds.map(id => pb.collection('rfqs').getOne(id, {
        expand: 'project,project.customer',
      }))
    );

    const projectIds = new Set(rfqs.map(r => r.project));
    if (projectIds.size > 1) {
      return NextResponse.json(
        { error: '所有询价单必须属于同一项目' },
        { status: 400 }
      );
    }

    const projectId = rfqs[0].project;
    const project = rfqs[0].expand?.project;
    const customerId = project?.customer;

    if (!customerId) {
      return NextResponse.json(
        { error: '项目未关联客户' },
        { status: 400 }
      );
    }

    // Get all RFQ items and quotations
    const allItems: any[] = [];
    const allQuotations: any[] = [];

    for (const rfqId of rfqIds) {
      const items = await pb.collection('rfq_items').getFullList({
        filter: `rfq = "${rfqId}"`,
        expand: 'product',
      });
      allItems.push(...items.map(item => ({ ...item, rfqId })));

      const quotations = await pb.collection('rfq_quotations').getFullList({
        filter: `rfq = "${rfqId}"`,
      });
      allQuotations.push(...quotations);
    }

    // Build unique products with selected supplier quotations
    const productQuotations = new Map<string, {
      productId: string;
      quantity: number;
      costPrice: number;
      supplierId: string;
    }>();

    for (const item of allItems) {
      const product = item.expand?.product;
      if (!product) continue;

      const productId = product.id;
      const selectedSupplierId = productSupplierMapping[productId];

      // Find the quotation for this product from the selected supplier
      let quotation = null;
      if (selectedSupplierId) {
        quotation = allQuotations.find(
          q => q.rfq_item === item.id && q.supplier === selectedSupplierId
        );
      }

      // If no specific supplier selected, find the lowest price quotation
      if (!quotation) {
        const productQuotations = allQuotations.filter(q => q.rfq_item === item.id);
        if (productQuotations.length > 0) {
          quotation = productQuotations.reduce((min, q) =>
            q.unit_price < min.unit_price ? q : min
          );
        }
      }

      if (!productQuotations.has(productId)) {
        productQuotations.set(productId, {
          productId,
          quantity: item.quantity,
          costPrice: quotation?.unit_price || 0,
          supplierId: quotation?.supplier || '',
        });
      } else {
        // Accumulate quantity for same product
        const existing = productQuotations.get(productId)!;
        existing.quantity += item.quantity;
      }
    }

    // Generate quotation code (pass pb instance for server-side use)
    const quotationCode = await codeGenerator.generate(CODE_PREFIXES.QUOTATION, pb);

    // Build items array for JSONB
    let itemCount = 0;
    let totalAmount = 0;
    const items: Array<{
      id: string;
      product_id: string;
      quantity: number;
      unit: string;
      unit_price: number;
      amount: number;
      cost_price: number;
      profit_margin: number;
    }> = [];

    for (const [productId, data] of productQuotations) {
      const defaultMargin = 0.2;
      const unitPrice = data.costPrice > 0
        ? data.costPrice * (1 + defaultMargin)
        : 0;
      const amount = unitPrice * data.quantity;
      totalAmount += amount;

      items.push({
        id: crypto.randomUUID(),
        product_id: productId,
        quantity: data.quantity,
        unit: 'PCS',
        unit_price: unitPrice,
        amount: amount,
        cost_price: data.costPrice,
        profit_margin: defaultMargin * 100,
      });
      itemCount++;
    }

    // Create quotation with items in JSONB
    const quotationData = {
      code: quotationCode,
      project: projectId,
      customer: customerId,
      status: 'draft',
      version: 1,
      currency: 'USD',
      exchange_rate: 1,
      incoterm: 'FOB',
      validity_days: 30,
      total_amount: totalAmount || 0.01,
      items: items,
    };
    
    console.log('Creating quotation with data:', quotationData);
    
    let quotation;
    try {
      quotation = await pb.collection('quotations').create(quotationData);
    } catch (createError: any) {
      console.error('Quotation create error details:', {
        message: createError.message,
        data: createError.data,
        response: createError.response,
      });
      throw createError;
    }

    // Update RFQ statuses to completed
    for (const rfqId of rfqIds) {
      await pb.collection('rfqs').update(rfqId, { status: 'completed' });
    }

    return NextResponse.json({
      success: true,
      quotationId: quotation.id,
      quotationCode: quotation.code,
      itemCount,
    });
  } catch (error: any) {
    console.error('Merge to quotation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to merge RFQs to quotation' },
      { status: 500 }
    );
  }
}
