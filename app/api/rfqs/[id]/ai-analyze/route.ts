/**
 * API Route: AI Analyze RFQ Quotations
 * 
 * POST /api/rfqs/[id]/ai-analyze
 * 
 * Uses AI to analyze supplier quotations and recommend the best procurement strategy.
 * Returns analysis including:
 * - Best supplier for each item
 * - Overall recommendation (single vs mixed supplier)
 * - Cost comparison and savings analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';

interface QuotationData {
  supplier_id: string;
  supplier_name: string;
  rfq_item_id: string;
  product_name: string;
  product_code: string;
  quantity: number;
  unit_price: number;
  moq?: number;
  lead_time_days?: number;
  total_amount: number;
}

interface MoldQuotationData {
  supplier_id: string;
  supplier_name: string;
  mold_type: string;
  cost: number;
  lead_time_days?: number;
}

interface AIAnalysisResult {
  summary: string;
  recommendation: 'single' | 'mixed';
  recommended_supplier_id?: string;
  recommended_supplier_name?: string;
  item_recommendations: Array<{
    rfq_item_id: string;
    product_name: string;
    best_supplier_id: string;
    best_supplier_name: string;
    unit_price: number;
    reason: string;
  }>;
  cost_analysis: {
    single_supplier_total?: number;
    mixed_supplier_total: number;
    potential_savings?: number;
    savings_percentage?: number;
  };
  risk_assessment: string;
  additional_notes: string;
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

    // Get RFQ with details
    const rfq = await pb.collection('rfqs').getOne(rfqId, {
      expand: 'project,project.customer',
    });

    if (!rfq) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    // Get RFQ items with product details
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

    // Get RFQ suppliers with details
    const rfqSuppliers = await pb.collection('rfq_suppliers').getFullList({
      filter: `rfq = "${rfqId}"`,
      expand: 'supplier',
    });

    // Get mold quotations
    const moldQuotations = await pb.collection('rfq_mold_quotations').getFullList({
      filter: `rfq = "${rfqId}"`,
    });

    // Build quotation data for AI analysis
    const quotationData: QuotationData[] = [];
    const supplierMap = new Map<string, string>();

    for (const supplier of rfqSuppliers) {
      if (supplier.expand?.supplier) {
        supplierMap.set(supplier.supplier, supplier.expand.supplier.name);
      }
    }

    for (const quotation of quotations) {
      const rfqItem = rfqItems.find(item => item.id === quotation.rfq_item);
      if (rfqItem) {
        quotationData.push({
          supplier_id: quotation.supplier,
          supplier_name: supplierMap.get(quotation.supplier) || 'Unknown',
          rfq_item_id: quotation.rfq_item,
          product_name: rfqItem.expand?.product?.name || 'Unknown',
          product_code: rfqItem.expand?.product?.code || '',
          quantity: rfqItem.quantity,
          unit_price: quotation.unit_price,
          moq: quotation.moq,
          lead_time_days: quotation.lead_time_days,
          total_amount: quotation.unit_price * rfqItem.quantity,
        });
      }
    }

    // Build mold quotation data
    const moldData: MoldQuotationData[] = moldQuotations.map(mold => ({
      supplier_id: mold.supplier,
      supplier_name: supplierMap.get(mold.supplier) || 'Unknown',
      mold_type: mold.mold_type,
      cost: mold.cost,
      lead_time_days: mold.lead_time_days,
    }));

    // Call AI for analysis
    const aiResult = await analyzeWithAI(quotationData, moldData, rfqItems);

    return NextResponse.json({
      success: true,
      analysis: aiResult,
      quotation_count: quotations.length,
      supplier_count: rfqSuppliers.length,
      item_count: rfqItems.length,
    });

  } catch (error: any) {
    console.error('Error analyzing RFQ:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze RFQ' },
      { status: 500 }
    );
  }
}

async function analyzeWithAI(
  quotationData: QuotationData[],
  moldData: MoldQuotationData[],
  rfqItems: any[]
): Promise<AIAnalysisResult> {
  const apiKey = process.env.AI_API_KEY;
  const baseURL = process.env.AI_BASE_URL || 'https://api.deepseek.com/v1';
  const model = process.env.AI_MODEL || 'deepseek-chat';

  if (!apiKey) {
    // Return a basic analysis without AI if no API key
    return generateBasicAnalysis(quotationData, moldData, rfqItems);
  }

  const systemPrompt = `You are an expert procurement analyst for an export trading company. 
Your task is to analyze supplier quotations and recommend the best procurement strategy.

Consider the following factors:
1. Unit price - lower is better
2. MOQ (Minimum Order Quantity) - should match or be lower than required quantity
3. Lead time - shorter is generally better
4. Supplier consolidation - fewer suppliers can reduce logistics complexity
5. Total cost optimization

Respond in JSON format with the following structure:
{
  "summary": "Brief summary of the analysis in Chinese",
  "recommendation": "single" or "mixed",
  "recommended_supplier_id": "supplier ID if single supplier recommended",
  "recommended_supplier_name": "supplier name if single supplier recommended",
  "item_recommendations": [
    {
      "rfq_item_id": "item ID",
      "product_name": "product name",
      "best_supplier_id": "supplier ID",
      "best_supplier_name": "supplier name",
      "unit_price": number,
      "reason": "reason for recommendation in Chinese"
    }
  ],
  "cost_analysis": {
    "single_supplier_total": number or null,
    "mixed_supplier_total": number,
    "potential_savings": number or null,
    "savings_percentage": number or null
  },
  "risk_assessment": "Risk assessment in Chinese",
  "additional_notes": "Additional notes in Chinese"
}`;

  const userPrompt = `Please analyze the following supplier quotations for an RFQ:

## Product Quotations
${JSON.stringify(quotationData, null, 2)}

## Mold Quotations (if any)
${JSON.stringify(moldData, null, 2)}

## Required Items
${rfqItems.map(item => `- ${item.expand?.product?.name || 'Unknown'}: ${item.quantity} units`).join('\n')}

Please provide your analysis and recommendations.`;

  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', await response.text());
      return generateBasicAnalysis(quotationData, moldData, rfqItems);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;

    if (!content) {
      return generateBasicAnalysis(quotationData, moldData, rfqItems);
    }

    // Parse JSON from response
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanContent);

    return parsed as AIAnalysisResult;
  } catch (error) {
    console.error('AI analysis error:', error);
    return generateBasicAnalysis(quotationData, moldData, rfqItems);
  }
}

function generateBasicAnalysis(
  quotationData: QuotationData[],
  moldData: MoldQuotationData[],
  rfqItems: any[]
): AIAnalysisResult {
  // Group quotations by item
  const itemQuotations = new Map<string, QuotationData[]>();
  for (const q of quotationData) {
    if (!itemQuotations.has(q.rfq_item_id)) {
      itemQuotations.set(q.rfq_item_id, []);
    }
    itemQuotations.get(q.rfq_item_id)!.push(q);
  }

  // Find best supplier for each item (lowest price)
  const itemRecommendations: AIAnalysisResult['item_recommendations'] = [];
  let mixedTotal = 0;

  for (const [itemId, quotes] of itemQuotations) {
    const bestQuote = quotes.reduce((min, q) => 
      q.unit_price < min.unit_price ? q : min
    );
    
    itemRecommendations.push({
      rfq_item_id: itemId,
      product_name: bestQuote.product_name,
      best_supplier_id: bestQuote.supplier_id,
      best_supplier_name: bestQuote.supplier_name,
      unit_price: bestQuote.unit_price,
      reason: `最低单价 $${bestQuote.unit_price.toFixed(2)}`,
    });

    mixedTotal += bestQuote.total_amount;
  }

  // Add mold costs to mixed total
  const lowestMoldCosts = new Map<string, number>();
  for (const mold of moldData) {
    const current = lowestMoldCosts.get(mold.mold_type) || Infinity;
    if (mold.cost < current) {
      lowestMoldCosts.set(mold.mold_type, mold.cost);
    }
  }
  for (const cost of lowestMoldCosts.values()) {
    mixedTotal += cost;
  }

  // Calculate single supplier totals
  const supplierTotals = new Map<string, number>();
  for (const q of quotationData) {
    const current = supplierTotals.get(q.supplier_id) || 0;
    supplierTotals.set(q.supplier_id, current + q.total_amount);
  }

  // Add mold costs per supplier
  for (const mold of moldData) {
    const current = supplierTotals.get(mold.supplier_id) || 0;
    supplierTotals.set(mold.supplier_id, current + mold.cost);
  }

  // Find best single supplier
  let bestSingleSupplier: { id: string; name: string; total: number } | null = null;
  for (const [supplierId, total] of supplierTotals) {
    // Check if this supplier has quotes for all items
    const supplierQuotes = quotationData.filter(q => q.supplier_id === supplierId);
    const coveredItems = new Set(supplierQuotes.map(q => q.rfq_item_id));
    
    if (coveredItems.size === rfqItems.length) {
      if (!bestSingleSupplier || total < bestSingleSupplier.total) {
        const supplierName = quotationData.find(q => q.supplier_id === supplierId)?.supplier_name || 'Unknown';
        bestSingleSupplier = { id: supplierId, name: supplierName, total };
      }
    }
  }

  const recommendation = bestSingleSupplier && bestSingleSupplier.total <= mixedTotal * 1.05
    ? 'single' as const
    : 'mixed' as const;

  const savings = bestSingleSupplier 
    ? bestSingleSupplier.total - mixedTotal 
    : null;

  return {
    summary: recommendation === 'single'
      ? `建议从单一供应商 ${bestSingleSupplier?.name} 采购，总成本 $${bestSingleSupplier?.total.toFixed(2)}`
      : `建议混合采购，选择每个产品的最优供应商，预计总成本 $${mixedTotal.toFixed(2)}`,
    recommendation,
    recommended_supplier_id: recommendation === 'single' ? bestSingleSupplier?.id : undefined,
    recommended_supplier_name: recommendation === 'single' ? bestSingleSupplier?.name : undefined,
    item_recommendations: itemRecommendations,
    cost_analysis: {
      single_supplier_total: bestSingleSupplier?.total,
      mixed_supplier_total: mixedTotal,
      potential_savings: savings && savings > 0 ? savings : undefined,
      savings_percentage: savings && bestSingleSupplier 
        ? (savings / bestSingleSupplier.total) * 100 
        : undefined,
    },
    risk_assessment: recommendation === 'single'
      ? '单一供应商采购风险较低，便于管理和沟通，但可能错过更优价格。'
      : '混合采购可获得最优价格，但需要管理多个供应商，物流协调复杂度增加。',
    additional_notes: '此分析基于当前报价数据，建议在做出最终决定前考虑供应商信誉、历史合作情况等因素。',
  };
}
