/**
 * Sourcing Plan Calculation Utilities
 * 采购计划计算工具函数
 */

import { SupplierSelection } from '@/lib/types/supplier-selection';

// ============================================================================
// Types
// ============================================================================

export interface SupplierGroup {
  supplierId: string;
  supplierName?: string;
  items: SupplierSelection[];
  subtotal: number;
  maxLeadTimeDays: number;
  itemCount: number;
}

export interface SourcingPlanSummary {
  totalCost: number;
  supplierCount: number;
  maxLeadTimeDays: number;
  itemCount: number;
}

// ============================================================================
// Calculation Functions
// ============================================================================

/**
 * Calculate subtotal for a supplier's items
 * Property 4: 供应商小计计算
 */
export function calculateSupplierSubtotal(items: Array<{ quantity: number; unitPrice: number }>): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

/**
 * Calculate total cost from multiple sourcing plans
 * Property 6: 汇总计算正确性
 */
export function calculateTotalCost(plans: Array<{ total_amount: number }>): number {
  return plans.reduce((sum, plan) => sum + plan.total_amount, 0);
}

/**
 * Calculate total cost from selections
 */
export function calculateSelectionsTotalCost(selections: SupplierSelection[]): number {
  return selections.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0);
}

/**
 * Calculate max lead time from items
 * Property 7: 最长交期计算
 */
export function calculateMaxLeadTime(items: Array<{ lead_time_days?: number } | { leadTimeDays?: number }>): number {
  if (items.length === 0) return 0;
  
  return Math.max(
    ...items.map(item => {
      // Handle both naming conventions
      const leadTime = 'lead_time_days' in item 
        ? item.lead_time_days 
        : (item as { leadTimeDays?: number }).leadTimeDays;
      return leadTime || 0;
    })
  );
}

/**
 * Group selections by supplier
 */
export function groupBySupplier(
  selections: SupplierSelection[],
  supplierNames?: Map<string, string>
): SupplierGroup[] {
  const groups = new Map<string, SupplierSelection[]>();

  for (const selection of selections) {
    const existing = groups.get(selection.supplierId) || [];
    existing.push(selection);
    groups.set(selection.supplierId, existing);
  }

  const result: SupplierGroup[] = [];

  for (const [supplierId, items] of groups) {
    result.push({
      supplierId,
      supplierName: supplierNames?.get(supplierId),
      items,
      subtotal: calculateSupplierSubtotal(items.map(i => ({ quantity: i.quantity, unitPrice: i.unitPrice }))),
      maxLeadTimeDays: calculateMaxLeadTime(items),
      itemCount: items.length,
    });
  }

  // Sort by subtotal descending
  result.sort((a, b) => b.subtotal - a.subtotal);

  return result;
}

/**
 * Calculate summary from selections
 */
export function calculateSummaryFromSelections(selections: SupplierSelection[]): SourcingPlanSummary {
  const groups = groupBySupplier(selections);

  return {
    totalCost: calculateSelectionsTotalCost(selections),
    supplierCount: groups.length,
    maxLeadTimeDays: calculateMaxLeadTime(selections),
    itemCount: selections.length,
  };
}

/**
 * Count unique suppliers in selections
 */
export function countSuppliers(selections: SupplierSelection[]): number {
  return new Set(selections.map(s => s.supplierId)).size;
}

/**
 * Format currency amount
 */
export function formatAmount(amount: number, currency: string = 'CNY'): string {
  const symbols: Record<string, string> = {
    CNY: '¥',
    USD: '$',
    EUR: '€',
  };
  const symbol = symbols[currency] || currency;
  return `${symbol}${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format lead time in days
 */
export function formatLeadTime(days: number): string {
  return `${days} 天`;
}

/**
 * Validate selections - ensure all products have a supplier selected
 */
export function validateSelections(
  selections: SupplierSelection[],
  requiredProductIds: string[]
): { valid: boolean; missingProducts: string[] } {
  const selectedProductIds = new Set(selections.map(s => s.productId));
  const missingProducts = requiredProductIds.filter(id => !selectedProductIds.has(id));

  return {
    valid: missingProducts.length === 0,
    missingProducts,
  };
}

export default {
  calculateSupplierSubtotal,
  calculateTotalCost,
  calculateSelectionsTotalCost,
  calculateMaxLeadTime,
  groupBySupplier,
  calculateSummaryFromSelections,
  countSuppliers,
  formatAmount,
  formatLeadTime,
  validateSelections,
};
