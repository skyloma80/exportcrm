/**
 * Quotation Service
 * 报价单服务
 * 
 * Provides CRUD operations and business logic for quotation management.
 */

import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';
import { codeGenerator, CODE_PREFIXES } from '@/lib/services/code-generator';
import {
  calculateSellingPrice,
  calculateQuotationTotal,
  type QuotationItemInput,
} from '@/lib/services/quotation-calculator';
import { exchangeRateService } from '@/lib/services/exchange-rate';

// ============================================================================
// Types
// ============================================================================

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'revised';
export type MoldType = 'die_casting' | 'stamping' | 'injection' | 'cnc_fixture' | 'forging' | 'extrusion';
export type MoldOwnership = 'customer' | 'supplier' | 'shared';
export type MoldChargeMethod = 'one_time' | 'amortized' | 'first_order_free';

export interface Quotation extends RecordModel {
  code: string;
  project: string;
  customer: string;
  version: number;
  status: QuotationStatus;
  incoterm: string;
  port_of_loading?: string;
  port_of_destination?: string;
  payment_terms?: string;
  validity_days: string;
  global_profit_margin?: number;
  currency: string;
  exchange_rate?: number;
  total_amount: number;
  sent_at?: string;
  packaging_details?: string;  // 包装信息 (Requirements: 1.1)
  delivery_time?: string;      // 交付时间 (Requirements: 1.2)
  remarks?: string;            // 备注
  cost_breakdown?: Record<string, number>;  // 费用分解
  total_weight?: number;       // 总重量 (kg)
  total_volume?: number;       // 总体积 (m³)
}

export interface QuotationItem extends RecordModel {
  quotation: string;
  product: string;
  quantity: number;
  cost_price: number;
  profit_margin: number;
  unit_price: number;
  amount: number;
  remarks?: string;
}

export interface QuotationWithExpand extends Quotation {
  expand?: {
    project?: {
      id: string;
      code: string;
      name: string;
      name_cn?: string;
      customer: string;
    };
    customer?: {
      id: string;
      code: string;
      name: string;
      name_cn?: string;
      preferred_currency?: string;
    };
    quotation_items_via_quotation?: QuotationItemWithExpand[];
  };
}

export interface QuotationItemWithExpand extends QuotationItem {
  expand?: {
    product?: {
      id: string;
      code: string;
      part_number?: string;
      name: string;
      name_cn?: string;
      description?: string;
      description_cn?: string;
      unit: string;
      pcs_per_carton?: number;
      carton_dimensions?: { length: number; width: number; height: number };
      carton_gross_weight?: number;
    };
  };
}

export interface QuotationCreateInput {
  project: string;
  customer: string;
  incoterm: string;
  port_of_loading?: string;
  port_of_destination?: string;
  payment_terms?: string;
  validity_days?: string;
  global_profit_margin?: number;
  currency: string;
  exchange_rate?: number;
  packaging_details?: string;  // 包装信息
  delivery_time?: string;      // 交付时间
  remarks?: string;            // 备注
  total_weight?: number;       // 总重量 (kg)
  total_volume?: number;       // 总体积 (m³)
  cost_breakdown?: Record<string, number>;  // 费用分解
}

export interface QuotationUpdateInput extends Partial<Omit<QuotationCreateInput, 'project' | 'customer'>> {
  status?: QuotationStatus;
}

export interface QuotationItemCreateInput {
  quotation: string;
  product: string;
  quantity: number;
  cost_price: number;
  profit_margin: number;
  remarks?: string;
}

// ============================================================================
// Quotation Service
// ============================================================================

class QuotationService extends BaseCollectionService<Quotation> {
  constructor() {
    super('quotations');
  }

  /**
   * Generate a new quotation code
   */
  async generateCode(): Promise<string> {
    return codeGenerator.generate(CODE_PREFIXES.QUOTATION);
  }

  /**
   * Get quotation by code
   */
  async getByCode(code: string): Promise<Quotation | null> {
    return this.getFirstListItem(`code = "${code}"`);
  }

  /**
   * Get quotation with full details
   */
  async getWithDetails(id: string): Promise<QuotationWithExpand | null> {
    try {
      const quotation = await this.pb.collection('quotations').getOne<QuotationWithExpand>(id, {
        expand: 'project,customer,quotation_items_via_quotation,quotation_items_via_quotation.product',
      });
      return quotation;
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  /**
   * Get quotations by project
   */
  async getByProject(projectId: string): Promise<Quotation[]> {
    return this.getFullList({
      filter: `project = "${projectId}"`,
      sort: '-id',
    });
  }

  /**
   * Get quotations by customer
   */
  async getByCustomer(customerId: string): Promise<Quotation[]> {
    return this.getFullList({
      filter: `customer = "${customerId}"`,
      sort: '-id',
    });
  }

  /**
   * Get quotations by status
   */
  async getByStatus(status: QuotationStatus): Promise<Quotation[]> {
    return this.getFullList({
      filter: `status = "${status}"`,
      sort: '-id',
    });
  }

  /**
   * Get latest version for a project
   */
  async getLatestVersion(projectId: string): Promise<number> {
    const quotations = await this.getFullList({
      filter: `project = "${projectId}"`,
      sort: '-version',
    });
    return quotations.length > 0 ? quotations[0].version : 0;
  }

  /**
   * Create quotation with auto-generated code
   */
  async createQuotation(data: QuotationCreateInput): Promise<Quotation> {
    const code = await this.generateCode();
    const latestVersion = await this.getLatestVersion(data.project);

    // Use 0.01 as default to avoid PocketBase validation error for required field
    return this.create({
      ...data,
      code,
      version: latestVersion + 1,
      status: 'draft' as QuotationStatus,
      validity_days: data.validity_days || '30 days',
      total_amount: 0.01,
    });
  }

  /**
   * Update quotation status
   */
  async updateStatus(id: string, status: QuotationStatus): Promise<Quotation> {
    const updates: Partial<Quotation> = { status };

    if (status === 'sent') {
      updates.sent_at = new Date().toISOString();
    }

    return this.update(id, updates);
  }

  /**
   * Mark quotation as sent
   */
  async markAsSent(id: string): Promise<Quotation> {
    return this.updateStatus(id, 'sent');
  }

  /**
   * Mark quotation as accepted
   */
  async markAsAccepted(id: string): Promise<Quotation> {
    return this.updateStatus(id, 'accepted');
  }

  /**
   * Mark quotation as rejected
   */
  async markAsRejected(id: string): Promise<Quotation> {
    return this.updateStatus(id, 'rejected');
  }

  /**
   * Create a new version (revision) of a quotation
   */
  async createRevision(originalId: string): Promise<Quotation> {
    const original = await this.getWithDetails(originalId);
    if (!original) throw new Error('Original quotation not found');

    // Mark original as revised
    await this.updateStatus(originalId, 'revised');

    // Create new quotation
    const newQuotation = await this.createQuotation({
      project: original.project,
      customer: original.customer,
      incoterm: original.incoterm,
      port_of_loading: original.port_of_loading,
      port_of_destination: original.port_of_destination,
      payment_terms: original.payment_terms,
      validity_days: original.validity_days,
      global_profit_margin: original.global_profit_margin,
      currency: original.currency,
      exchange_rate: original.exchange_rate,
    });

    // Copy items
    const items = original.expand?.quotation_items_via_quotation || [];
    for (const item of items) {
      await quotationItemService.createItem({
        quotation: newQuotation.id,
        product: item.product,
        quantity: item.quantity,
        cost_price: item.cost_price,
        profit_margin: item.profit_margin,
        remarks: item.remarks,
      });
    }

    // Recalculate total
    await this.recalculateTotal(newQuotation.id);

    return this.getOne(newQuotation.id) as Promise<Quotation>;
  }

  /**
   * Recalculate quotation total
   */
  async recalculateTotal(id: string): Promise<Quotation> {
    // 获取报价单以获取 cost_breakdown
    const quotation = await this.getOne(id);
    if (!quotation) throw new Error('Quotation not found');

    const items = await quotationItemService.getByQuotation(id);

    const itemInputs: QuotationItemInput[] = items.map(item => ({
      product_id: item.product,
      product_name: '',
      quantity: item.quantity,
      cost_price: item.cost_price,
      profit_margin: item.profit_margin,
    }));

    const result = calculateQuotationTotal(
      itemInputs,


    );

    return this.update(id, {
      subtotal: result.items_subtotal || 0,
      total_amount: Math.max(result.items_subtotal || 0, 0.01),
    });
  }

  /**
   * Apply global profit margin to all items
   * 应用全局利润率到所有明细项（使用报价单的汇率）
   */
  async applyGlobalMargin(id: string, margin: number): Promise<Quotation> {
    // 获取报价单以获取汇率
    const quotation = await this.getOne(id);
    if (!quotation) throw new Error('Quotation not found');

    const exchangeRate = quotation.exchange_rate || 1;
    const items = await quotationItemService.getByQuotation(id);

    for (const item of items) {
      const unit_price = calculateSellingPrice(item.cost_price, margin, exchangeRate);
      const amount = unit_price * item.quantity;

      await quotationItemService.update(item.id, {
        profit_margin: margin,
        unit_price,
        amount,
      });
    }

    await this.update(id, { global_profit_margin: margin });
    return this.recalculateTotal(id);
  }

  /**
   * Check if quotation can be converted to order
   */
  canConvertToOrder(quotation: Quotation): boolean {
    return quotation.status === 'accepted';
  }
}

// ============================================================================
// Quotation Item Service
// ============================================================================

class QuotationItemService extends BaseCollectionService<QuotationItem> {
  constructor() {
    super('quotation_items', { sort: 'created' });
  }

  /**
   * Get items for a quotation
   */
  async getByQuotation(quotationId: string): Promise<QuotationItemWithExpand[]> {
    return this.pb.collection('quotation_items').getFullList<QuotationItemWithExpand>({
      filter: `quotation = "${quotationId}"`,
      expand: 'product',
    });
  }

  /**
   * Create quotation item with calculated prices
   * 创建报价单明细项（需要传入汇率或从报价单获取）
   * 
   * @param data - 明细项数据
   * @param exchangeRate - 汇率（可选，如果不传则从报价单获取）
   */
  async createItem(data: QuotationItemCreateInput, exchangeRate?: number): Promise<QuotationItem> {
    // 如果没有传入汇率，从报价单获取
    let rate = exchangeRate;
    if (rate === undefined || rate <= 0) {
      const quotation = await this.pb.collection('quotations').getOne(data.quotation);
      rate = quotation.exchange_rate;

      // 如果报价单也没有汇率，尝试获取实时汇率
      if (!rate || rate <= 0) {
        if (quotation.currency && quotation.currency !== 'CNY') {
          rate = await exchangeRateService.getRate('CNY', quotation.currency);
        } else {
          rate = 1;
        }
      }
    }

    const unit_price = calculateSellingPrice(data.cost_price, data.profit_margin, rate);
    const amount = unit_price * data.quantity;

    return this.create({
      ...data,
      unit_price,
      amount,
    });
  }

  /**
   * Update quotation item and recalculate prices
   * 更新报价单明细项（需要传入汇率或从报价单获取）
   * 
   * @param id - 明细项ID
   * @param data - 更新数据
   * @param exchangeRate - 汇率（可选，如果不传则从报价单获取）
   */
  async updateItem(id: string, data: Partial<QuotationItemCreateInput>, exchangeRate?: number): Promise<QuotationItem> {
    const existing = await this.getOne(id);
    if (!existing) throw new Error('Quotation item not found');

    // 如果没有传入汇率，从报价单获取
    let rate = exchangeRate;
    if (rate === undefined || rate <= 0) {
      const quotation = await this.pb.collection('quotations').getOne(existing.quotation);
      rate = quotation.exchange_rate;

      // 如果报价单也没有汇率，尝试获取实时汇率
      if (!rate || rate <= 0) {
        if (quotation.currency && quotation.currency !== 'CNY') {
          rate = await exchangeRateService.getRate('CNY', quotation.currency);
        } else {
          rate = 1;
        }
      }
    }

    const cost_price = data.cost_price ?? existing.cost_price;
    const profit_margin = data.profit_margin ?? existing.profit_margin;
    const quantity = data.quantity ?? existing.quantity;

    const unit_price = calculateSellingPrice(cost_price, profit_margin, rate);
    const amount = unit_price * quantity;

    return this.update(id, {
      ...data,
      unit_price,
      amount,
    });
  }

  /**
   * Bulk create quotation items
   */
  async bulkCreate(items: QuotationItemCreateInput[]): Promise<QuotationItem[]> {
    return Promise.all(items.map(item => this.createItem(item)));
  }
}

// ============================================================================
// Quotation Creation with Items (Transaction-like)
// ============================================================================

export interface QuotationWithItemsInput {
  // 基础信息
  project: string;
  customer: string;
  incoterm: string;
  port_of_loading?: string;
  port_of_destination?: string;
  payment_terms?: string;
  validity_days?: number;
  global_profit_margin?: number;
  currency: string;
  exchange_rate?: number;
  notes?: string;
  total_weight?: number;
  total_volume?: number;
  cost_breakdown?: Record<string, number>;
  delivery_time?: string;
  remarks?: string;

  // 产品明细
  items: Array<{
    product: string;
    quantity: number;
    cost_price: number;
    profit_margin: number;
    unit_price: number;
    amount: number;
    remarks?: string;
  }>;
}

/**
 * Create quotation with items in a transaction-like manner
 * 以事务方式创建报价单、明细和模具费用
 * **Validates: Requirements 5.1, 5.2**
 */
export async function createQuotationWithItems(
  input: QuotationWithItemsInput
): Promise<QuotationWithExpand> {
  // 1. 创建报价单
  const quotation = await quotationService.createQuotation({
    project: input.project,
    customer: input.customer,
    incoterm: input.incoterm,
    port_of_loading: input.port_of_loading,
    port_of_destination: input.port_of_destination,
    payment_terms: input.payment_terms,
    validity_days: input.validity_days,
    global_profit_margin: input.global_profit_margin,
    currency: input.currency,
    exchange_rate: input.exchange_rate,
    delivery_time: input.delivery_time,
    remarks: input.remarks,
    // 添加缺失的字段
    total_weight: input.total_weight,
    total_volume: input.total_volume,
    cost_breakdown: input.cost_breakdown,
  });

  try {
    // 2. 创建产品明细
    for (const item of input.items) {
      await quotationItemService.create({
        quotation: quotation.id,
        product: item.product,
        quantity: item.quantity,
        cost_price: item.cost_price,
        profit_margin: item.profit_margin,
        unit_price: item.unit_price,
        amount: item.amount,
        remarks: item.remarks,
      });
    }

    // 3. 重新计算总计
    await quotationService.recalculateTotal(quotation.id);

    // 4. 返回完整的报价单数据
    const result = await quotationService.getWithDetails(quotation.id);
    if (!result) {
      throw new Error('Failed to retrieve created quotation');
    }
    return result;
  } catch (error) {
    // 如果创建明细失败，尝试删除已创建的报价单
    try {
      await quotationService.delete(quotation.id);
    } catch (deleteError) {
      console.error('Failed to rollback quotation:', deleteError);
    }
    throw error;
  }
}

// ============================================================================
// Export Services
// ============================================================================

export const quotationService = new QuotationService();
export const quotationItemService = new QuotationItemService();

export default quotationService;
