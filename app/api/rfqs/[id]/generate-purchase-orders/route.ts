/**
 * API Route: Generate Purchase Orders from RFQ
 * 
 * POST /api/rfqs/[id]/generate-purchase-orders
 * 
 * Generates purchase order drafts from RFQ quotations.
 * Supports two modes:
 * - single: All items from one supplier -> 1 PO
 * - mixed: Items from different suppliers based on best price -> multiple POs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { codeGenerator, CODE_PREFIXES } from '@/lib/services/code-generator';

interface GeneratePORequest {
  planType: 'single' | 'mixed';
  singleSupplierId?: string;
  aiAnalysis?: {
    item_recommendations: Array<{
      rfq_item_id: string;
      best_supplier_id: string;
      unit_price: number;
    }>;
  };
}

interface GeneratedPO {
  id: string;
  code: string;
  supplier_id: string;
  supplier_name: string;
  total_amount: number;
  items_count: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rfqId } = await params;
    const pb = await createServerPocketBase();
    
    // Check authentication
    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: GeneratePORequest = await request.json();
    const { planType, singleSupplierId, aiAnalysis } = body;

    // Validate request
    if (!planType || !['single', 'mixed'].includes(planType)) {
      return NextResponse.json(
        { error: 'Invalid planType. Must be "single" or "mixed"' },
        { status: 400 }
      );
    }

    // Get RFQ with details
    const rfq = await pb.collection('rfqs').getOne(rfqId, {
      expand: 'project',
    });

    if (!rfq) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    // Check if POs already exist for this RFQ
    const existingPOs = await pb.collection('po').getList(1, 1, {
      filter: `rfq = "${rfqId}"`,
    });

    if (existingPOs.items.length > 0) {
      return NextResponse.json(
        { error: 'Purchase orders already exist for this RFQ', existingCount: existingPOs.totalItems },
        { status: 409 }
      );
    }

    // Get RFQ items
    const rfqItems = await pb.collection('rfq_items').getFullList({
      filter: `rfq = "${rfqId}"`,
      expand: 'product',
    });

    if (rfqItems.length === 0) {
      return NextResponse.json(
        { error: 'No items found in this RFQ' },
        { status: 400 }
      );
    }

    // Get all quotations for this RFQ
    const quotations = await pb.collection('rfq_quotations').getFullList({
      filter: `rfq = "${rfqId}"`,
    });

    if (quotations.length === 0) {
      return NextResponse.json(
        { error: 'No supplier quotations found for this RFQ' },
        { status: 400 }
      );
    }

    // Get mold quotations
    const moldQuotations = await pb.collection('rfq_mold_quotations').getFullList({
      filter: `rfq = "${rfqId}"`,
    });

    // Build supplier-item mapping based on plan type
    const supplierItemsMap: Map<string, Array<{
      rfqItem: any;
      quotation: any;
    }>> = new Map();

    const supplierMoldsMap: Map<string, any[]> = new Map();

    if (planType === 'single') {
      // Single supplier mode: all items from one supplier
      if (!singleSupplierId) {
        return NextResponse.json(
          { error: 'singleSupplierId is required for single supplier plan' },
          { status: 400 }
        );
      }
      
      const supplierQuotations = quotations.filter(q => q.supplier === singleSupplierId);
      
      if (supplierQuotations.length === 0) {
        return NextResponse.json(
          { error: 'No quotations found for the selected supplier' },
          { status: 400 }
        );
      }

      const items: Array<{ rfqItem: any; quotation: any }> = [];
      
      for (const rfqItem of rfqItems) {
        const quotation = supplierQuotations.find(q => q.rfq_item === rfqItem.id);
        if (quotation) {
          items.push({ rfqItem, quotation });
        }
      }

      if (items.length > 0) {
        supplierItemsMap.set(singleSupplierId, items);
      }

      // Add mold quotations for this supplier
      const supplierMolds = moldQuotations.filter(m => m.supplier === singleSupplierId);
      if (supplierMolds.length > 0) {
        supplierMoldsMap.set(singleSupplierId, supplierMolds);
      }

    } else {
      // Mixed supplier mode: best price for each item
      for (const rfqItem of rfqItems) {
        let bestQuotation: any = null;
        let bestSupplierId: string | null = null;

        // Check if AI analysis provides recommendation
        if (aiAnalysis?.item_recommendations) {
          const recommendation = aiAnalysis.item_recommendations.find(
            r => r.rfq_item_id === rfqItem.id
          );
          if (recommendation) {
            bestSupplierId = recommendation.best_supplier_id;
            bestQuotation = quotations.find(
              q => q.rfq_item === rfqItem.id && q.supplier === bestSupplierId
            );
          }
        }

        // If no AI recommendation, find lowest price
        if (!bestQuotation) {
          const itemQuotations = quotations.filter(q => q.rfq_item === rfqItem.id);
          if (itemQuotations.length > 0) {
            bestQuotation = itemQuotations.reduce((min, q) => 
              q.unit_price < min.unit_price ? q : min
            );
            bestSupplierId = bestQuotation.supplier;
          }
        }

        if (bestQuotation && bestSupplierId) {
          if (!supplierItemsMap.has(bestSupplierId)) {
            supplierItemsMap.set(bestSupplierId, []);
          }
          supplierItemsMap.get(bestSupplierId)!.push({ rfqItem, quotation: bestQuotation });
        }
      }

      // Distribute mold quotations to suppliers who have items
      for (const moldQuotation of moldQuotations) {
        if (supplierItemsMap.has(moldQuotation.supplier)) {
          if (!supplierMoldsMap.has(moldQuotation.supplier)) {
            supplierMoldsMap.set(moldQuotation.supplier, []);
          }
          supplierMoldsMap.get(moldQuotation.supplier)!.push(moldQuotation);
        }
      }
    }

    // Get supplier details
    const supplierIds = Array.from(supplierItemsMap.keys());
    const suppliers = await pb.collection('suppliers').getFullList({
      filter: supplierIds.map(id => `id = "${id}"`).join(' || '),
    });
    const supplierMap = new Map(suppliers.map(s => [s.id, s]));

    // Create purchase orders
    const generatedPOs: GeneratedPO[] = [];

    for (const [supplierId, items] of supplierItemsMap) {
      const supplier = supplierMap.get(supplierId);
      if (!supplier) continue;

      // Calculate total amount
      let totalAmount = 0;
      for (const { rfqItem, quotation } of items) {
        totalAmount += quotation.unit_price * rfqItem.quantity;
      }

      // Add mold costs
      const molds = supplierMoldsMap.get(supplierId) || [];
      for (const mold of molds) {
        totalAmount += mold.cost;
      }

      // Generate PO code
      const poCode = await codeGenerator.generate(CODE_PREFIXES.PURCHASE_ORDER, pb);

      // Get expected delivery date from quotations (use max lead time)
      let maxLeadTime = 0;
      for (const { quotation } of items) {
        if (quotation.lead_time_days && quotation.lead_time_days > maxLeadTime) {
          maxLeadTime = quotation.lead_time_days;
        }
      }

      const expectedDeliveryDate = maxLeadTime > 0
        ? new Date(Date.now() + maxLeadTime * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : undefined;

      // Create PO
      const po = await pb.collection('po').create({
        code: poCode,
        project: rfq.project || undefined,
        supplier: supplierId,
        rfq: rfqId,
        status: 'draft',
        currency: 'USD', // Default currency, can be updated
        total_amount: totalAmount,
        paid_amount: 0,
        expected_delivery_date: expectedDeliveryDate,
      });

      // Create PO items
      for (const { rfqItem, quotation } of items) {
        await pb.collection('purchase_order_items').create({
          purchase_order: po.id,
          product: rfqItem.product,
          quantity: rfqItem.quantity,
          unit_price: quotation.unit_price,
          amount: quotation.unit_price * rfqItem.quantity,
          received_quantity: 0,
        });
      }

      // Create PO mold items
      for (const mold of molds) {
        await pb.collection('purchase_order_mold_items').create({
          purchase_order: po.id,
          mold_type: mold.mold_type,
          cost: mold.cost,
          lead_time_days: mold.lead_time_days,
        });
      }

      generatedPOs.push({
        id: po.id,
        code: po.code,
        supplier_id: supplierId,
        supplier_name: supplier.name,
        total_amount: totalAmount,
        items_count: items.length,
      });
    }

    // Update RFQ status to completed if POs were generated
    if (generatedPOs.length > 0) {
      await pb.collection('rfqs').update(rfqId, {
        status: 'completed',
      });
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${generatedPOs.length} purchase order(s)`,
      orders: generatedPOs,
    });

  } catch (error: any) {
    console.error('Error generating purchase orders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate purchase orders' },
      { status: 500 }
    );
  }
}
