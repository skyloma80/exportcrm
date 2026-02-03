/**
 * RFQ Merge Preview API
 * 询价单合并预览 API
 * 
 * POST /api/rfqs/merge-preview
 * Get preview data for merging multiple RFQs into a quotation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';

interface MergePreviewRequest {
  rfqIds: string[];
}

export async function POST(request: NextRequest) {
  try {
    const pb = await createServerPocketBase();

    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: MergePreviewRequest = await request.json();
    const { rfqIds } = body;

    if (!rfqIds || rfqIds.length === 0) {
      return NextResponse.json({ error: 'No RFQ IDs provided' }, { status: 400 });
    }

    // Get all RFQs with their details
    const rfqs = await Promise.all(
      rfqIds.map(async (id) => {
        const rfq = await pb.collection('rfqs').getOne(id, {
          expand: 'project,project.customer',
        });
        const items = await pb.collection('rfq_items').getFullList({
          filter: `rfq = "${id}"`,
        });
        return { rfq, itemCount: items.length };
      })
    );

    // Validate all RFQs belong to the same project
    const projectIds = new Set(rfqs.map(r => r.rfq.project));
    if (projectIds.size > 1) {
      return NextResponse.json(
        { error: '所有询价单必须属于同一项目' },
        { status: 400 }
      );
    }

    const projectId = rfqs[0].rfq.project;
    const project = rfqs[0].rfq.expand?.project;
    const customer = project?.expand?.customer;

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
        expand: 'supplier',
      });
      allQuotations.push(...quotations.map(q => ({ ...q, rfqId })));
    }

    // Build product list with supplier quotations
    const productMap = new Map<string, {
      productId: string;
      productCode: string;
      productName: string;
      quantity: number;
      unit: string;
      suppliers: Array<{
        supplierId: string;
        supplierName: string;
        unitPrice: number;
        rfqId: string;
      }>;
    }>();

    for (const item of allItems) {
      const product = item.expand?.product;
      if (!product) continue;

      const key = product.id;
      if (!productMap.has(key)) {
        productMap.set(key, {
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          quantity: item.quantity,
          unit: product.unit || 'PCS',
          suppliers: [],
        });
      } else {
        // Accumulate quantity if same product appears in multiple RFQs
        const existing = productMap.get(key)!;
        existing.quantity += item.quantity;
      }
    }

    // Add supplier quotations to products
    for (const quotation of allQuotations) {
      const item = allItems.find(i => i.id === quotation.rfq_item);
      if (!item) continue;

      const product = item.expand?.product;
      if (!product) continue;

      const productData = productMap.get(product.id);
      if (!productData) continue;

      const supplier = quotation.expand?.supplier;
      if (!supplier) continue;

      // Check if this supplier already has a quotation for this product
      const existingSupplier = productData.suppliers.find(s => s.supplierId === supplier.id);
      if (!existingSupplier) {
        productData.suppliers.push({
          supplierId: supplier.id,
          supplierName: supplier.name || supplier.name_cn || '-',
          unitPrice: quotation.unit_price,
          rfqId: quotation.rfqId,
        });
      }
    }

    return NextResponse.json({
      rfqs: rfqs.map(r => ({
        id: r.rfq.id,
        code: r.rfq.code,
        project: r.rfq.project,
        projectName: project?.name || '-',
        itemCount: r.itemCount,
      })),
      project: {
        id: projectId,
        name: project?.name || '-',
        customer: customer?.name || '-',
      },
      products: Array.from(productMap.values()),
    });
  } catch (error: any) {
    console.error('Merge preview error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get merge preview' },
      { status: 500 }
    );
  }
}
