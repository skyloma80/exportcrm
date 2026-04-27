/**
 * Purchase Orders Service
 * 采购订单服务
 * 
 * Provides CRUD operations and business logic for Purchase Order management.
 */

import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';
import { codeGenerator, CODE_PREFIXES } from '@/lib/services/code-generator';

// ============================================================================
// Types
// ============================================================================

export type POStatus = 'draft' | 'sent' | 'confirmed' | 'in_production' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
export type PaymentType = 'deposit' | 'progress' | 'final';
export type MoldType = 'die_casting' | 'stamping' | 'injection' | 'cnc_fixture' | 'forging' | 'extrusion';

export interface PurchaseOrder extends RecordModel {
  code: string;
  project?: string;
  supplier: string;
  order?: string;
  rfq?: string;
  status: POStatus;
  currency: string;
  total_amount: number;
  paid_amount?: number;
  expected_delivery_date?: string;
}

export interface PurchaseOrderItem extends RecordModel {
  purchase_order: string;
  product: string;
  quantity: number;
  unit_price: number;
  amount: number;
  received_quantity?: number;
}

export interface PurchaseOrderMoldItem extends RecordModel {
  purchase_order: string;
  mold_type: MoldType;
  cost: number;
  lead_time_days?: number;
}

export interface PurchaseOrderPayment extends RecordModel {
  purchase_order: string;
  type: PaymentType;
  amount: number;
  currency: string;
  payment_method?: string;
  payment_date: string;
  bank_reference?: string;
  voucher_file?: string;
}

export interface PurchaseOrderWithExpand extends PurchaseOrder {
  expand?: {
    project?: {
      id: string;
      code: string;
      name: string;
      name_cn?: string;
      customer: string;
    };
    supplier?: {
      id: string;
      code: string;
      name: string;
      name_cn?: string;
    };
    order?: {
      id: string;
      code: string;
    };
    rfq?: {
      id: string;
      code: string;
    };
  };
}

export interface POCreateInput {
  project?: string;
  supplier: string;
  order?: string;
  rfq?: string;
  status?: POStatus;
  currency: string;
  total_amount: number;
  paid_amount?: number;
  expected_delivery_date?: string;
}

export interface POItemCreateInput {
  purchase_order: string;
  product: string;
  quantity: number;
  unit_price: number;
  amount: number;
  received_quantity?: number;
}

export interface POMoldItemCreateInput {
  purchase_order: string;
  mold_type: MoldType;
  cost: number;
  lead_time_days?: number;
}

// ============================================================================
// Purchase Order Service
// ============================================================================

class PurchaseOrderService extends BaseCollectionService<PurchaseOrder> {
  constructor() {
    super('purchase_orders');
  }

  /**
   * Generate a new PO code
   */
  async generateCode(): Promise<string> {
    return codeGenerator.generate(CODE_PREFIXES.PURCHASE_ORDER);
  }

  /**
   * Get PO by code
   */
  async getByCode(code: string): Promise<PurchaseOrder | null> {
    return this.getFirstListItem(`code = "${code}"`);
  }

  /**
   * Get PO with full details
   */
  async getWithDetails(id: string): Promise<PurchaseOrderWithExpand | null> {
    try {
      const po = await this.pb.collection('purchase_orders').getOne<PurchaseOrderWithExpand>(id, {
        expand: 'project,supplier,order,rfq',
      });
      return po;
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  /**
   * Get paginated POs with expand
   */
  async getListWithExpand(page: number = 1, perPage: number = 50, filter: string = ''): Promise<{ items: PurchaseOrderWithExpand[], totalItems: number }> {
    const result = await this.pb.collection('purchase_orders').getList<PurchaseOrderWithExpand>(page, perPage, {
      filter,
      sort: '-created',
      expand: 'supplier,project',
    });
    return {
      items: result.items,
      totalItems: result.totalItems,
    };
  }

  /**
   * Get POs by project
   */
  async getByProject(projectId: string): Promise<PurchaseOrder[]> {
    return this.getFullList({
      filter: `project = "${projectId}"`,
      sort: '-id',
    });
  }

  /**
   * Get POs by supplier
   */
  async getBySupplier(supplierId: string): Promise<PurchaseOrder[]> {
    return this.getFullList({
      filter: `supplier = "${supplierId}"`,
      sort: '-id',
    });
  }

  /**
   * Get POs by RFQ
   */
  async getByRFQ(rfqId: string): Promise<PurchaseOrder[]> {
    return this.getFullList({
      filter: `rfq = "${rfqId}"`,
      sort: '-id',
    });
  }

  /**
   * Get POs by status
   */
  async getByStatus(status: POStatus): Promise<PurchaseOrder[]> {
    return this.getFullList({
      filter: `status = "${status}"`,
      sort: '-id',
    });
  }

  /**
   * Create PO with auto-generated code
   */
  async createPO(data: POCreateInput): Promise<PurchaseOrder> {
    const code = await this.generateCode();
    return this.create({
      ...data,
      code,
      status: data.status || 'draft',
      paid_amount: data.paid_amount || 0,
    });
  }

  /**
   * Update PO status
   */
  async updateStatus(id: string, status: POStatus): Promise<PurchaseOrder> {
    return this.update(id, { status });
  }

  /**
   * Check if RFQ already has POs generated
   */
  async hasExistingPOs(rfqId: string): Promise<boolean> {
    const pos = await this.getByRFQ(rfqId);
    return pos.length > 0;
  }
}

// ============================================================================
// Purchase Order Item Service
// ============================================================================

class PurchaseOrderItemService extends BaseCollectionService<PurchaseOrderItem> {
  constructor() {
    super('purchase_order_items', { sort: 'created' });
  }

  /**
   * Get items for a PO with product expand
   */
  async getByPO(poId: string): Promise<PurchaseOrderItem[]> {
    return this.pb.collection('purchase_order_items').getFullList<PurchaseOrderItem>({
      filter: `purchase_order = "${poId}"`,
      expand: 'product',
    });
  }

  /**
   * Create PO item
   */
  async createItem(data: POItemCreateInput): Promise<PurchaseOrderItem> {
    return this.create(data);
  }

  /**
   * Bulk create PO items
   */
  async bulkCreate(items: POItemCreateInput[]): Promise<PurchaseOrderItem[]> {
    return Promise.all(items.map(item => this.create(item)));
  }
}

 

// ============================================================================
// Purchase Order Payment Service
// ============================================================================

class PurchaseOrderPaymentService extends BaseCollectionService<PurchaseOrderPayment> {
  constructor() {
    super('purchase_order_payments', { sort: '-payment_date' });
  }

  /**
   * Get payments for a PO
   */
  async getByPO(poId: string): Promise<PurchaseOrderPayment[]> {
    return this.getFullList({
      filter: `purchase_order = "${poId}"`,
    });
  }

  /**
   * Get total paid amount for a PO
   */
  async getTotalPaid(poId: string): Promise<number> {
    const payments = await this.getByPO(poId);
    return payments.reduce((sum, p) => sum + p.amount, 0);
  }
}

// ============================================================================
// Export Services
// ============================================================================

export const purchaseOrderService = new PurchaseOrderService();
export const purchaseOrderItemService = new PurchaseOrderItemService();
 export const purchaseOrderPaymentService = new PurchaseOrderPaymentService();

export default purchaseOrderService;
