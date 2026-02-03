/**
 * Sourcing Plan Recommendation Service
 * 采购计划智能推荐服务
 * 
 * Generates optimal supplier selection recommendations based on:
 * - Price (highest weight)
 * - Supplier consolidation (reduce logistics costs)
 * - Lead time
 */

import { SupplierSelection } from '@/lib/types/supplier-selection';

// ============================================================================
// Types
// ============================================================================

export interface QuotationData {
  rfqQuotationId: string;
  rfqItemId: string;
  productId: string;
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  quantity: number;
  leadTimeDays: number;
  moq?: number;
}

export interface RecommendationReason {
  type: 'lowest_price' | 'shortest_lead_time' | 'supplier_consolidation';
  description: string;
  impact: number; // Savings amount or days saved
}

export interface RecommendationResult {
  selections: SupplierSelection[];
  totalCost: number;
  maxLeadTimeDays: number;
  supplierCount: number;
  reasons: RecommendationReason[];
}

// ============================================================================
// Recommendation Algorithm
// ============================================================================

/**
 * Generate optimal supplier selection recommendation
 * 
 * Algorithm:
 * 1. For each product, find the lowest price quotation
 * 2. Calculate total cost with lowest prices
 * 3. Check if consolidating to fewer suppliers saves enough to justify higher prices
 * 4. Return the optimal selection with reasons
 */
export function generateRecommendation(
  quotations: QuotationData[],
  consolidationThreshold: number = 0.05 // 5% price increase acceptable for consolidation
): RecommendationResult {
  if (quotations.length === 0) {
    return {
      selections: [],
      totalCost: 0,
      maxLeadTimeDays: 0,
      supplierCount: 0,
      reasons: [],
    };
  }

  // Group quotations by product
  const productQuotations = new Map<string, QuotationData[]>();
  for (const q of quotations) {
    const existing = productQuotations.get(q.productId) || [];
    existing.push(q);
    productQuotations.set(q.productId, existing);
  }

  // Strategy 1: Lowest price for each product
  const lowestPriceSelections = selectLowestPrices(productQuotations);
  const lowestPriceCost = calculateTotalCost(lowestPriceSelections);
  const lowestPriceSuppliers = countSuppliers(lowestPriceSelections);

  // Strategy 2: Try to consolidate suppliers
  const consolidatedSelections = selectWithConsolidation(
    productQuotations,
    lowestPriceCost,
    consolidationThreshold
  );
  const consolidatedCost = calculateTotalCost(consolidatedSelections);
  const consolidatedSuppliers = countSuppliers(consolidatedSelections);

  // Choose the better strategy
  const costIncrease = (consolidatedCost - lowestPriceCost) / lowestPriceCost;
  const supplierReduction = lowestPriceSuppliers - consolidatedSuppliers;

  // Use consolidated if it reduces suppliers and cost increase is acceptable
  const useConsolidated = 
    supplierReduction > 0 && 
    costIncrease <= consolidationThreshold &&
    consolidatedSuppliers < lowestPriceSuppliers;

  const finalSelections = useConsolidated ? consolidatedSelections : lowestPriceSelections;
  const finalCost = useConsolidated ? consolidatedCost : lowestPriceCost;
  const finalSupplierCount = useConsolidated ? consolidatedSuppliers : lowestPriceSuppliers;

  // Generate reasons
  const reasons: RecommendationReason[] = [];

  if (useConsolidated) {
    reasons.push({
      type: 'supplier_consolidation',
      description: `减少 ${supplierReduction} 家供应商，降低物流成本`,
      impact: supplierReduction,
    });
    if (costIncrease > 0) {
      reasons.push({
        type: 'lowest_price',
        description: `总价增加 ${(costIncrease * 100).toFixed(1)}%，但物流成本更低`,
        impact: consolidatedCost - lowestPriceCost,
      });
    }
  } else {
    reasons.push({
      type: 'lowest_price',
      description: '选择每个产品的最低报价',
      impact: lowestPriceCost,
    });
  }

  // Check lead time
  const maxLeadTime = Math.max(...finalSelections.map(s => s.leadTimeDays || 0));
  const minPossibleLeadTime = Math.max(
    ...Array.from(productQuotations.values()).map(qs => 
      Math.min(...qs.map(q => q.leadTimeDays || 0))
    )
  );

  if (maxLeadTime === minPossibleLeadTime) {
    reasons.push({
      type: 'shortest_lead_time',
      description: `最短交期 ${maxLeadTime} 天`,
      impact: maxLeadTime,
    });
  }

  return {
    selections: finalSelections,
    totalCost: finalCost,
    maxLeadTimeDays: maxLeadTime,
    supplierCount: finalSupplierCount,
    reasons,
  };
}


/**
 * Select lowest price for each product
 */
function selectLowestPrices(
  productQuotations: Map<string, QuotationData[]>
): SupplierSelection[] {
  const selections: SupplierSelection[] = [];

  for (const [productId, quotations] of productQuotations) {
    if (quotations.length === 0) continue;

    // Find lowest price quotation
    const lowest = quotations.reduce((min, q) => 
      q.unitPrice < min.unitPrice ? q : min
    );

    selections.push({
      productId,
      supplierId: lowest.supplierId,
      rfqQuotationId: lowest.rfqQuotationId,
      rfqItemId: lowest.rfqItemId,
      quantity: lowest.quantity,
      unitPrice: lowest.unitPrice,
      leadTimeDays: lowest.leadTimeDays,
    });
  }

  return selections;
}

/**
 * Select with supplier consolidation strategy
 * Try to use fewer suppliers while keeping cost increase within threshold
 */
function selectWithConsolidation(
  productQuotations: Map<string, QuotationData[]>,
  baselineCost: number,
  threshold: number
): SupplierSelection[] {
  // Get all unique suppliers
  const allSuppliers = new Set<string>();
  for (const quotations of productQuotations.values()) {
    for (const q of quotations) {
      allSuppliers.add(q.supplierId);
    }
  }

  // Calculate coverage and cost for each supplier
  const supplierScores: Array<{
    supplierId: string;
    coverage: number; // Number of products this supplier can provide
    totalCost: number; // Total cost if using this supplier for all covered products
    products: Map<string, QuotationData>;
  }> = [];

  for (const supplierId of allSuppliers) {
    const products = new Map<string, QuotationData>();
    let totalCost = 0;

    for (const [productId, quotations] of productQuotations) {
      const supplierQuote = quotations.find(q => q.supplierId === supplierId);
      if (supplierQuote) {
        products.set(productId, supplierQuote);
        totalCost += supplierQuote.unitPrice * supplierQuote.quantity;
      }
    }

    supplierScores.push({
      supplierId,
      coverage: products.size,
      totalCost,
      products,
    });
  }

  // Sort by coverage (descending), then by cost (ascending)
  supplierScores.sort((a, b) => {
    if (b.coverage !== a.coverage) return b.coverage - a.coverage;
    return a.totalCost - b.totalCost;
  });

  // Greedy selection: pick suppliers that cover the most uncovered products
  const selections: SupplierSelection[] = [];
  const coveredProducts = new Set<string>();
  const maxAllowedCost = baselineCost * (1 + threshold);

  for (const supplier of supplierScores) {
    // Check if this supplier covers any uncovered products
    const uncoveredByThisSupplier: QuotationData[] = [];
    for (const [productId, quote] of supplier.products) {
      if (!coveredProducts.has(productId)) {
        uncoveredByThisSupplier.push(quote);
      }
    }

    if (uncoveredByThisSupplier.length === 0) continue;

    // Add selections for uncovered products
    for (const quote of uncoveredByThisSupplier) {
      selections.push({
        productId: quote.productId,
        supplierId: quote.supplierId,
        rfqQuotationId: quote.rfqQuotationId,
        rfqItemId: quote.rfqItemId,
        quantity: quote.quantity,
        unitPrice: quote.unitPrice,
        leadTimeDays: quote.leadTimeDays,
      });
      coveredProducts.add(quote.productId);
    }

    // Check if we've covered all products
    if (coveredProducts.size === productQuotations.size) {
      break;
    }
  }

  // If consolidated cost exceeds threshold, fall back to lowest prices
  const consolidatedCost = calculateTotalCost(selections);
  if (consolidatedCost > maxAllowedCost) {
    return selectLowestPrices(productQuotations);
  }

  return selections;
}

/**
 * Calculate total cost of selections
 */
function calculateTotalCost(selections: SupplierSelection[]): number {
  return selections.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0);
}

/**
 * Count unique suppliers in selections
 */
function countSuppliers(selections: SupplierSelection[]): number {
  return new Set(selections.map(s => s.supplierId)).size;
}

/**
 * Compare two selection strategies
 */
export function compareSelections(
  current: SupplierSelection[],
  recommended: SupplierSelection[]
): {
  costDifference: number;
  leadTimeDifference: number;
  supplierCountDifference: number;
} {
  const currentCost = calculateTotalCost(current);
  const recommendedCost = calculateTotalCost(recommended);

  const currentMaxLeadTime = Math.max(...current.map(s => s.leadTimeDays || 0), 0);
  const recommendedMaxLeadTime = Math.max(...recommended.map(s => s.leadTimeDays || 0), 0);

  const currentSuppliers = countSuppliers(current);
  const recommendedSuppliers = countSuppliers(recommended);

  return {
    costDifference: currentCost - recommendedCost,
    leadTimeDifference: currentMaxLeadTime - recommendedMaxLeadTime,
    supplierCountDifference: currentSuppliers - recommendedSuppliers,
  };
}

export default generateRecommendation;
