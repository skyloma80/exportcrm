/**
 * Supplier Selection Types
 * 供应商选择类型定义
 * 
 * Shared types for supplier selection functionality
 * used by Cost Table and other features.
 */

export interface SupplierSelection {
  productId: string;
  supplierId: string;
  rfqQuotationId: string;
  rfqItemId: string;
  quantity: number;
  unitPrice: number;
  leadTimeDays: number;
}
