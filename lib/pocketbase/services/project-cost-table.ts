/**
 * Project Cost Table Service
 * 项目采购成本表服务
 * 
 * 聚合项目下所有 RFQ 的报价数据，管理成本表的创建和更新。
 * 使用独立的 project_cost_tables 和 project_cost_table_items 表
 */

import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';
import { rfqService, rfqQuotationService } from './rfqs';
import { productProjectService } from './projects';

// ============================================================================
// Types
// ============================================================================

export type CostTableStatus = 'confirmed';

export interface CostTable extends RecordModel {
  code: string;
  project: string;
  status: CostTableStatus;
  currency: string;
  total_amount: number;
}

export interface CostTableItem extends RecordModel {
  cost_table: string;
  product: string;
  supplier: string;
  rfq_quotation: string | null;
  quantity: number;
  unit_price: number;
  amount: number;
  lead_time_days: number | null;
}

export interface CostTableWithExpand extends CostTable {
  expand?: {
    project?: {
      id: string;
      code: string;
      name: string;
      name_cn?: string;
    };
  };
}

export interface CostTableItemWithExpand extends CostTableItem {
  expand?: {
    product?: {
      id: string;
      code: string;
      name: string;
      name_cn?: string;
      unit: string;
    };
    supplier?: {
      id: string;
      code: string;
      name: string;
      name_cn?: string;
    };
    rfq_quotation?: {
      id: string;
      unit_price: number;
      lead_time_days?: number;
    };
  };
}


// ============================================================================
// Aggregated Data Types
// ============================================================================

/** 产品信息（去重后） */
export interface AggregatedProduct {
  id: string;
  code: string;
  name: string;
  nameCn?: string;
  unit: string;
  quantity: number;
}

/** 供应商信息（去重后） */
export interface AggregatedSupplier {
  id: string;
  code: string;
  name: string;
  nameCn?: string;
}

/** 供应商报价信息 */
export interface AggregatedQuotation {
  id: string;
  rfqId: string;
  rfqCode: string;
  rfqItemId: string;
  productId: string;
  supplierId: string;
  unitPrice: number;
  moq?: number;
  leadTimeDays?: number;
  validUntil?: string;
  remarks?: string;
}

/** 聚合后的报价数据 */
export interface AggregatedQuotationData {
  products: AggregatedProduct[];
  suppliers: AggregatedSupplier[];
  quotations: AggregatedQuotation[];
}

/** 供应商选择 */
export interface CostTableSelection {
  productId: string;
  supplierId: string | null;
  rfqQuotationId: string | null;
  quantity: number;
  unitPrice: number;
  leadTimeDays: number | null;
}

/** 完成度检查结果 */
export interface CompletionCheckResult {
  complete: boolean;
  missingProducts: Array<{
    id: string;
    name: string;
    nameCn?: string;
  }>;
  totalProducts: number;
  selectedProducts: number;
}


// ============================================================================
// Cost Table Service
// ============================================================================

class ProjectCostTableService extends BaseCollectionService<CostTable> {
  constructor() {
    super('project_cost_tables');
  }

  /**
   * Generate a new cost table code (CT-YYYY-NNNNN)
   */
  async generateCode(): Promise<string> {
    const currentYear = new Date().getFullYear();
    
    const existingTables = await this.pb.collection('project_cost_tables').getList<CostTable>(1, 1, {
      filter: `code ~ "CT-${currentYear}"`,
      sort: '-code',
    });

    let nextSequence = 1;
    if (existingTables.items.length > 0) {
      const lastCode = existingTables.items[0].code;
      const match = lastCode.match(/CT-\d{4}-(\d{4})/);  // Fixed: expecting 4 digits instead of 5
      if (match) {
        nextSequence = parseInt(match[1], 10) + 1;
      }
    }

    return `CT-${currentYear}-${nextSequence.toString().padStart(4, '0')}`;
  }

  /**
   * Get cost table by project (unique per project)
   */
  async getByProject(projectId: string): Promise<CostTableWithExpand | null> {
    try {
      const result = await this.pb.collection('project_cost_tables').getFirstListItem<CostTableWithExpand>(
        `project = "${projectId}"`,
        { expand: 'project' }
      );
      return result;
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  /**
   * Check if project already has a cost table
   */
  async existsForProject(projectId: string): Promise<boolean> {
    const existing = await this.getByProject(projectId);
    return existing !== null;
  }


  /**
   * Aggregate quotations from all RFQs in a project
   */
  async aggregateQuotations(projectId: string): Promise<AggregatedQuotationData> {
    const rfqs = await rfqService.getByProject(projectId);
    
    if (rfqs.length === 0) {
      // No RFQs — get products directly from project's products_projects
      const projectProducts = await this.pb.collection('products_projects').getFullList({
        filter: `project = "${projectId}"`,
        expand: 'product',
      });
      const products: AggregatedProduct[] = projectProducts
        .map((pp: any) => {
          const product = pp.expand?.product;
          if (!product) return null;
          return {
            id: product.id,
            code: product.code,
            name: product.name,
            nameCn: product.name_cn,
            unit: product.unit,
            quantity: 0,
          };
        })
        .filter(Boolean) as AggregatedProduct[];
      return { products, suppliers: [], quotations: [] };
    }

    const productsMap = new Map<string, AggregatedProduct>();
    const suppliersMap = new Map<string, AggregatedSupplier>();
    const quotations: AggregatedQuotation[] = [];

    for (const rfq of rfqs) {
      const rfqWithDetails = await rfqService.getWithDetails(rfq.id);
      if (!rfqWithDetails) continue;

      const rfqItems = rfqWithDetails.expand?.rfq_items_via_rfq || [];
      const rfqSuppliers = rfqWithDetails.expand?.rfq_suppliers_via_rfq || [];

      for (const item of rfqItems) {
        const product = item.expand?.product;
        if (!product) continue;

        const existing = productsMap.get(product.id);
        if (!existing || item.quantity > existing.quantity) {
          productsMap.set(product.id, {
            id: product.id,
            code: product.code,
            name: product.name,
            nameCn: product.name_cn,
            unit: product.unit,
            quantity: item.quantity,
          });
        }
      }

      for (const rfqSupplier of rfqSuppliers) {
        const supplier = rfqSupplier.expand?.supplier;
        if (!supplier) continue;

        if (!suppliersMap.has(supplier.id)) {
          suppliersMap.set(supplier.id, {
            id: supplier.id,
            code: supplier.code,
            name: supplier.name,
            nameCn: supplier.name_cn,
          });
        }
      }

      const rfqQuotations = await rfqQuotationService.getByRFQ(rfq.id);
      const rfqItemToProduct = new Map(
        rfqItems.map(item => [item.id, item.expand?.product?.id || item.product])
      );

      for (const q of rfqQuotations) {
        const productId = rfqItemToProduct.get(q.rfq_item);
        if (!productId) continue;

        quotations.push({
          id: q.id,
          rfqId: rfq.id,
          rfqCode: rfq.code,
          rfqItemId: q.rfq_item,
          productId,
          supplierId: q.supplier,
          unitPrice: q.unit_price,
          moq: q.moq,
          leadTimeDays: q.lead_time_days,
          validUntil: q.valid_until,
          remarks: q.remarks,
        });
      }
    }
    
    return {
      products: Array.from(productsMap.values()),
      suppliers: Array.from(suppliersMap.values()),
      quotations,
    };
  }


  /**
   * Save selections to cost table
   */
  async saveSelections(
    projectId: string,
    selections: CostTableSelection[],
    currency: string = 'CNY'
  ): Promise<CostTable> {
    let costTable = await this.getByProject(projectId);

    // 只计算有供应商选择的项目
    const validSelections = selections.filter(s => s.supplierId);
    const totalAmount = validSelections.reduce(
      (sum, s) => sum + s.quantity * s.unitPrice,
      0
    );

    if (costTable) {
      costTable = await this.pb.collection('project_cost_tables').update<CostTable>(costTable.id, {
        total_amount: totalAmount,
        currency,
      });

      await costTableItemService.deleteByCostTable(costTable.id);
    } else {
      const code = await this.generateCode();
      costTable = await this.pb.collection('project_cost_tables').create<CostTable>({
        code,
        project: projectId,
        status: 'confirmed',
        currency,
        total_amount: totalAmount,
      });
    }

    // 只保存有供应商选择的明细
    for (const selection of validSelections) {
      await this.pb.collection('project_cost_table_items').create<CostTableItem>({
        cost_table: costTable.id,
        product: selection.productId,
        supplier: selection.supplierId,
        rfq_quotation: selection.rfqQuotationId || null,
        quantity: selection.quantity,
        unit_price: selection.unitPrice,
        amount: selection.quantity * selection.unitPrice,
        lead_time_days: selection.leadTimeDays || 0,
      });
    }

    return costTable;
  }

  /**
   * Get cost table with items
   */
  async getWithItems(projectId: string): Promise<{
    costTable: CostTableWithExpand | null;
    items: CostTableItemWithExpand[];
  }> {
    const costTable = await this.getByProject(projectId);
    if (!costTable) {
      return { costTable: null, items: [] };
    }

    const items = await costTableItemService.getByCostTable(costTable.id);
    return { costTable, items };
  }


  /**
   * Check completion status
   */
  async checkCompletion(projectId: string): Promise<CompletionCheckResult> {
    const aggregated = await this.aggregateQuotations(projectId);
    const allProducts = aggregated.products;

    const { items } = await this.getWithItems(projectId);

    const selectedProductIds = new Set(
      items.filter(item => item.supplier).map(item => item.product)
    );

    const missingProducts = allProducts.filter(p => !selectedProductIds.has(p.id));

    return {
      complete: missingProducts.length === 0 && allProducts.length > 0,
      missingProducts: missingProducts.map(p => ({
        id: p.id,
        name: p.name,
        nameCn: p.nameCn,
      })),
      totalProducts: allProducts.length,
      selectedProducts: selectedProductIds.size,
    };
  }

  /**
   * Confirm cost table (deprecated - now auto-confirmed on save)
   * @deprecated Cost tables are now automatically confirmed when saved
   */
  async confirm(projectId: string): Promise<CostTable> {
    const costTable = await this.getByProject(projectId);
    if (!costTable) {
      throw new Error('Cost table not found');
    }
    // Already confirmed on save, just return it
    return costTable;
  }

  /**
   * Create purchase orders from confirmed cost table
   * Groups items by supplier and creates one PO per supplier
   */
  async createPurchaseOrders(projectId: string): Promise<CreatePurchaseOrdersResult> {
    const { codeGenerator, CODE_PREFIXES } = await import('@/lib/services/code-generator');
    
    // 1. Get cost table and validate status
    const costTable = await this.getByProject(projectId);
    if (!costTable) {
      throw new Error('Cost table not found');
    }
    if (costTable.status !== 'confirmed') {
      throw new Error('Cost table must be confirmed before creating purchase orders');
    }

    // 2. Get cost table items
    const items = await costTableItemService.getByCostTable(costTable.id);
    if (items.length === 0) {
      throw new Error('Cost table has no items');
    }

    // 3. Group items by supplier
    const supplierGroups = new Map<string, CostTableItemWithExpand[]>();
    for (const item of items) {
      if (!item.supplier) continue;
      const group = supplierGroups.get(item.supplier) || [];
      group.push(item);
      supplierGroups.set(item.supplier, group);
    }

    if (supplierGroups.size === 0) {
      throw new Error('No items with supplier selection');
    }

    // 4. Create purchase orders for each supplier
    const createdOrders: PurchaseOrder[] = [];
    let totalAmount = 0;

    for (const [supplierId, supplierItems] of supplierGroups) {
      // Calculate total for this supplier
      const supplierTotal = supplierItems.reduce(
        (sum, item) => sum + item.amount,
        0
      );
      totalAmount += supplierTotal;

      // Calculate max lead time for expected delivery date
      const maxLeadTime = Math.max(
        ...supplierItems.map(item => item.lead_time_days || 0),
        0
      );
      const expectedDeliveryDate = new Date();
      expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + maxLeadTime);

      // Generate PO code
      const code = await codeGenerator.generate(CODE_PREFIXES.PURCHASE_ORDER, this.pb);

      // Create purchase order
      const po = await this.pb.collection('purchase_orders').create<PurchaseOrder>({
        code,
        type: 'order',
        project: projectId,
        supplier: supplierId,
        status: 'draft',
        currency: costTable.currency,
        total_amount: supplierTotal,
        expected_delivery_date: expectedDeliveryDate.toISOString().split('T')[0],
        cost_table: costTable.id,
      });

      // Create purchase order items
      for (const item of supplierItems) {
        await this.pb.collection('purchase_order_items').create<PurchaseOrderItem>({
          purchase_order: po.id,
          product: item.product,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          lead_time_days: item.lead_time_days || 0,
          rfq_quotation: item.rfq_quotation || undefined,
        });
      }

      createdOrders.push(po);
    }

    return {
      orders: createdOrders,
      totalAmount,
      supplierCount: supplierGroups.size,
    };
  }

  /**
   * Check if purchase orders already exist for this cost table
   */
  async hasPurchaseOrders(projectId: string): Promise<boolean> {
    const costTable = await this.getByProject(projectId);
    if (!costTable) return false;

    const existingOrders = await this.pb.collection('purchase_orders').getList(1, 1, {
      filter: `cost_table = "${costTable.id}"`,
    });

    return existingOrders.totalItems > 0;
  }

  /**
   * Get purchase orders created from this cost table
   */
  async getPurchaseOrders(projectId: string): Promise<PurchaseOrder[]> {
    const costTable = await this.getByProject(projectId);
    if (!costTable) return [];

    return this.pb.collection('purchase_orders').getFullList<PurchaseOrder>({
      filter: `cost_table = "${costTable.id}"`,
      sort: '-id',
    });
  }
}


// ============================================================================
// Purchase Order Types (for createPurchaseOrders)
// ============================================================================

export interface PurchaseOrder {
  id: string;
  code: string;
  type: 'plan' | 'order';
  project: string;
  supplier: string;
  status: string;
  currency: string;
  total_amount: number;
  expected_delivery_date?: string;
  cost_table?: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order: string;
  product: string;
  quantity: number;
  unit_price: number;
  amount: number;
  lead_time_days?: number;
  rfq_quotation?: string;
}

export interface CreatePurchaseOrdersResult {
  orders: PurchaseOrder[];
  totalAmount: number;
  supplierCount: number;
}

// ============================================================================
// Cost Table Item Service
// ============================================================================

class CostTableItemService extends BaseCollectionService<CostTableItem> {
  constructor() {
    super('project_cost_table_items', { sort: 'created' });
  }

  /**
   * Get items for a cost table
   */
  async getByCostTable(costTableId: string): Promise<CostTableItemWithExpand[]> {
    return this.pb.collection('project_cost_table_items').getFullList<CostTableItemWithExpand>({
      filter: `cost_table = "${costTableId}"`,
      expand: 'product,supplier,rfq_quotation',
    });
  }

  /**
   * Delete all items for a cost table
   */
  async deleteByCostTable(costTableId: string): Promise<void> {
    const items = await this.getByCostTable(costTableId);
    await Promise.all(items.map(item => this.delete(item.id)));
  }
}

// ============================================================================
// Export Services
// ============================================================================

export const projectCostTableService = new ProjectCostTableService();
export const costTableItemService = new CostTableItemService();

export default projectCostTableService;
