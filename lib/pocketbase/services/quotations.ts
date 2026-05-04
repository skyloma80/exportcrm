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
  validity_days: number;
  global_profit_margin?: number;
  currency: string;
  exchange_rate?: number;
  total_amount: number;
  sent_at?: string;
  packaging_details?: string;
  delivery_time?: string;
  remarks?: string;
  cost_breakdown?: Record<string, number>;
  total_weight?: number;
  total_volume?: number;
  items?: QuotationItemJSON[];
}

export interface QuotationItemJSON {
  id: string;
  product_id: string;
  product_name: string;
  part_number?: string;
  description_en?: string;
  description_cn?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
  cost_price: number;
  profit_margin: number;
  remarks?: string;
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
  validity_days?: number;
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
        expand: 'project,customer',
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
      validity_days: data.validity_days || 30,
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

    // Copy items from original
    const items = original.items || [];

    // Create new quotation
    const newQuotation = await this.create({
      code: await this.generateCode(),
      version: original.version + 1,
      project: original.project,
      customer: original.customer,
      incoterm: original.incoterm,
      port_of_loading: original.port_of_loading,
      port_of_destination: original.port_of_destination,
      payment_terms: original.payment_terms,
      validity_days: original.validity_days || 30,
      global_profit_margin: original.global_profit_margin,
      currency: original.currency,
      exchange_rate: original.exchange_rate,
      status: 'draft',
      total_amount: 0.01,
      items: items,
    });

    // Recalculate total
    await this.recalculateTotal(newQuotation.id);

    return this.getOne(newQuotation.id) as Promise<Quotation>;
  }

  /**
   * Recalculate quotation total from JSONB items
   */
  async recalculateTotal(id: string): Promise<Quotation> {
    const quotation = await this.getOne(id);
    if (!quotation) throw new Error('Quotation not found');

    const items = quotation.items || [];
    const itemsSubtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);

    return this.update(id, {
      total_amount: Math.max(itemsSubtotal, 0.01),
    });
  }

  /**
   * Apply global profit margin to all items
   */
  async applyGlobalMargin(id: string, margin: number): Promise<Quotation> {
    const quotation = await this.getOne(id);
    if (!quotation) throw new Error('Quotation not found');

    const exchangeRate = quotation.exchange_rate || 1;
    const items = (quotation.items || []).map(item => {
      const unit_price = calculateSellingPrice(item.cost_price, margin, exchangeRate);
      const amount = unit_price * item.quantity;
      return {
        ...item,
        profit_margin: margin,
        unit_price,
        amount,
      };
    });

    await this.update(id, {
      global_profit_margin: margin,
      items,
    });
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

  // 产品明细 (JSONB format)
  items: Array<{
    id?: string;
    product_id?: string;
    product?: string; // compatibility alias
    product_name?: string;
    part_number?: string;
    description_en?: string;
    description_cn?: string;
    quantity: number;
    unit?: string;
    unit_price: number;
    amount: number;
    cost_price?: number;
    profit_margin: number;
    remarks?: string;
  }>;
}

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Create quotation with items stored in JSONB
 */
export async function createQuotationWithItems(
  input: QuotationWithItemsInput
): Promise<QuotationWithExpand> {
  // Generate IDs and format items
  const items: QuotationItemJSON[] = input.items.map(item => ({
    id: item.id || generateId(),
    product_id: item.product_id || (item as any).product || '',
    product_name: item.product_name || '',
    part_number: item.part_number || undefined,
    description_en: item.description_en || '',
    description_cn: item.description_cn || '',
    quantity: item.quantity,
    unit: item.unit || 'PCS',
    unit_price: item.unit_price,
    amount: item.amount,
    cost_price: item.cost_price || 0,
    profit_margin: item.profit_margin,
    remarks: item.remarks,
  }));

  // Calculate total
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  // 1. Create quotation with items in JSONB
  const quotation = await quotationService.create({
    code: await quotationService.generateCode(),
    version: await quotationService.getLatestVersion(input.project) + 1,
    project: input.project,
    customer: input.customer,
    incoterm: input.incoterm,
    port_of_loading: input.port_of_loading,
    port_of_destination: input.port_of_destination,
    payment_terms: input.payment_terms,
    validity_days: input.validity_days || 30,
    global_profit_margin: input.global_profit_margin,
    currency: input.currency,
    exchange_rate: input.exchange_rate,
    delivery_time: input.delivery_time,
    remarks: input.remarks,
    total_weight: input.total_weight,
    total_volume: input.total_volume,
    cost_breakdown: input.cost_breakdown,
    status: 'draft',
    total_amount: Math.max(totalAmount, 0.01),
    items: items,
  });

  // 2. Return the created quotation
  const result = await quotationService.getWithDetails(quotation.id);
  if (!result) {
    throw new Error('Failed to retrieve created quotation');
  }
  return result;
}

// ============================================================================
// Export Services
// ============================================================================

export const quotationService = new QuotationService();
export default quotationService;
