/**
 * RFQ Service
 * 询价单服务
 * 
 * Provides CRUD operations and business logic for RFQ management.
 */

import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';
import { codeGenerator, CODE_PREFIXES } from '@/lib/services/code-generator';

// ============================================================================
// Types
// ============================================================================

export type RFQStatus = 'draft' | 'sent' | 'received' | 'completed' | 'cancelled';
export type RFQSupplierStatus = 'pending' | 'sent' | 'received' | 'selected' | 'rejected';
export type MoldType = 'die_casting' | 'stamping' | 'injection' | 'cnc_fixture' | 'forging' | 'extrusion';

export interface RFQAttachment {
  name: string;
  path: string;
  type?: string;
  size?: number;
}

export interface RFQ extends RecordModel {
  code: string;
  project: string;
  status: RFQStatus;
  deadline?: string;
  remarks?: string;
  attachments?: RFQAttachment[];
}

export interface RFQItem extends RecordModel {
  rfq: string;
  product: string;
  quantity: number;
  target_price?: number;
  remarks?: string;
}

export interface RFQSupplier extends RecordModel {
  rfq: string;
  supplier: string;
  status: RFQSupplierStatus;
  sent_at?: string;
  received_at?: string;
}

export interface RFQQuotation extends RecordModel {
  rfq: string;
  rfq_item: string;
  supplier: string;
  unit_price: number;
  moq?: number;
  lead_time_days?: number;
  valid_until?: string;
  remarks?: string;
}

export interface RFQMoldQuotation extends RecordModel {
  rfq: string;
  supplier: string;
  mold_type: MoldType;
  cost: number;
  lead_time_days?: number;
  lifespan?: number;
}

export interface RFQWithExpand extends RFQ {
  expand?: {
    project?: {
      id: string;
      code: string;
      name: string;
      name_cn?: string;
      customer: string;
      description?: string;
      description_cn?: string;
      expand?: {
        customer?: {
          id: string;
          code: string;
          name: string;
          name_cn?: string;
        };
      };
    };
    rfq_items_via_rfq?: RFQItemWithExpand[];
    rfq_suppliers_via_rfq?: RFQSupplierWithExpand[];
  };
}

export interface RFQItemWithExpand extends RFQItem {
  expand?: {
    product?: {
      id: string;
      code: string;
      name: string;
      name_cn?: string;
      unit: string;
    };
  };
}

export interface RFQSupplierWithExpand extends RFQSupplier {
  expand?: {
    supplier?: {
      id: string;
      code: string;
      name: string;
      name_cn?: string;
    };
  };
}

export interface RFQCreateInput {
  project: string;
  status?: RFQStatus;
  deadline?: string;
  remarks?: string;
  attachments?: RFQAttachment[];
}

export interface RFQUpdateInput extends Partial<Omit<RFQCreateInput, 'project'>> {}

export interface RFQItemCreateInput {
  rfq: string;
  product: string;
  quantity: number;
  target_price?: number;
  remarks?: string;
}

export interface RFQSupplierCreateInput {
  rfq: string;
  supplier: string;
  status?: RFQSupplierStatus;
}

export interface RFQQuotationCreateInput {
  rfq: string;
  rfq_item: string;
  supplier: string;
  unit_price: number;
  moq?: number;
  lead_time_days?: number;
  valid_until?: string;
  remarks?: string;
}

export interface RFQMoldQuotationCreateInput {
  rfq: string;
  supplier: string;
  mold_type: MoldType;
  cost: number;
  lead_time_days?: number;
  lifespan?: number;
}

// ============================================================================
// RFQ Service
// ============================================================================

class RFQService extends BaseCollectionService<RFQ> {
  constructor() {
    super('rfqs');
  }

  /**
   * Generate a new RFQ code
   */
  async generateCode(): Promise<string> {
    return codeGenerator.generate(CODE_PREFIXES.RFQ);
  }

  /**
   * Get RFQ by code
   */
  async getByCode(code: string): Promise<RFQ | null> {
    return this.getFirstListItem(`code = "${code}"`);
  }

  /**
   * Get RFQ with full details
   */
  async getWithDetails(id: string): Promise<RFQWithExpand | null> {
    try {
      const rfq = await this.pb.collection('rfqs').getOne<RFQWithExpand>(id, {
        expand: 'project,project.customer,rfq_items_via_rfq,rfq_items_via_rfq.product,rfq_suppliers_via_rfq,rfq_suppliers_via_rfq.supplier',
      });
      return rfq;
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  /**
   * Get all RFQs with project and customer expand
   * @param filter Optional filter string
   */
  async getAllWithExpand(filter?: string): Promise<RFQWithExpand[]> {
    return this.pb.collection('rfqs').getFullList<RFQWithExpand>({
      sort: '-id',
      expand: 'project,project.customer',
      ...(filter && { filter }),
    });
  }

  /**
   * Get RFQs by project
   */
  async getByProject(projectId: string): Promise<RFQ[]> {
    return this.getFullList({
      filter: `project = "${projectId}"`,
      sort: '-id',
    });
  }

  /**
   * Get RFQs by status
   */
  async getByStatus(status: RFQStatus): Promise<RFQ[]> {
    return this.getFullList({
      filter: `status = "${status}"`,
      sort: '-id',
    });
  }

  /**
   * Create RFQ with auto-generated code
   */
  async createRFQ(data: RFQCreateInput): Promise<RFQ> {
    const code = await this.generateCode();
    const payload: any = {
      project: data.project,
      code,
      status: data.status || 'draft',
    };
    
    // Only include optional fields if they have values
    if (data.deadline) {
      payload.deadline = data.deadline;
    }
    if (data.remarks) {
      payload.remarks = data.remarks;
    }
    if (data.attachments) {
      payload.attachments = data.attachments;
    }
    
    console.log('Creating RFQ with payload:', payload);
    return this.create(payload);
  }

  /**
   * Update RFQ status
   */
  async updateStatus(id: string, status: RFQStatus): Promise<RFQ> {
    return this.update(id, { status });
  }

  /**
   * Mark RFQ as sent
   */
  async markAsSent(id: string): Promise<RFQ> {
    return this.updateStatus(id, 'sent');
  }

  /**
   * Mark RFQ as completed
   */
  async markAsCompleted(id: string): Promise<RFQ> {
    return this.updateStatus(id, 'completed');
  }

  /**
   * Add attachment to RFQ
   */
  async addAttachment(id: string, attachment: RFQAttachment): Promise<RFQ> {
    const rfq = await this.getOne(id);
    if (!rfq) throw new Error('RFQ not found');
    
    const attachments = rfq.attachments || [];
    attachments.push(attachment);
    
    return this.update(id, { attachments });
  }

  /**
   * Remove attachment from RFQ
   */
  async removeAttachment(id: string, attachmentPath: string): Promise<RFQ> {
    const rfq = await this.getOne(id);
    if (!rfq) throw new Error('RFQ not found');
    
    const attachments = (rfq.attachments || []).filter(a => a.path !== attachmentPath);
    
    return this.update(id, { attachments });
  }

  /**
   * Get quotation comparison for an RFQ
   */
  async getQuotationComparison(rfqId: string): Promise<{
    items: Array<{
      product: { id: string; name: string; name_cn?: string };
      quantity: number;
      quotations: Array<{
        supplier: { id: string; name: string; name_cn?: string };
        unit_price: number;
        moq?: number;
        lead_time_days?: number;
      }>;
      lowestPrice?: number;
      lowestPriceSupplier?: string;
    }>;
    moldQuotations: Array<{
      supplier: { id: string; name: string; name_cn?: string };
      mold_type: MoldType;
      cost: number;
      lead_time_days?: number;
    }>;
  }> {
    const rfq = await this.getWithDetails(rfqId);
    if (!rfq) throw new Error('RFQ not found');

    const items = rfq.expand?.rfq_items_via_rfq || [];
    const quotations = await rfqQuotationService.getByRFQ(rfqId);
    const moldQuotations = await rfqMoldQuotationService.getByRFQ(rfqId);

    const comparison = items.map(item => {
      const itemQuotations = quotations.filter(q => q.rfq_item === item.id);
      const lowestQuotation = itemQuotations.reduce((min, q) => 
        !min || q.unit_price < min.unit_price ? q : min, 
        null as RFQQuotation | null
      );

      return {
        product: {
          id: item.expand?.product?.id || item.product,
          name: item.expand?.product?.name || '',
          name_cn: item.expand?.product?.name_cn,
        },
        quantity: item.quantity,
        quotations: itemQuotations.map(q => ({
          supplier: { id: q.supplier, name: '', name_cn: undefined },
          unit_price: q.unit_price,
          moq: q.moq,
          lead_time_days: q.lead_time_days,
        })),
        lowestPrice: lowestQuotation?.unit_price,
        lowestPriceSupplier: lowestQuotation?.supplier,
      };
    });

    return {
      items: comparison,
      moldQuotations: moldQuotations.map(mq => ({
        supplier: { id: mq.supplier, name: '', name_cn: undefined },
        mold_type: mq.mold_type,
        cost: mq.cost,
        lead_time_days: mq.lead_time_days,
      })),
    };
  }
}

// ============================================================================
// RFQ Item Service
// ============================================================================

class RFQItemService extends BaseCollectionService<RFQItem> {
  constructor() {
    super('rfq_items', { sort: 'created' });
  }

  /**
   * Get items for an RFQ
   */
  async getByRFQ(rfqId: string): Promise<RFQItemWithExpand[]> {
    return this.pb.collection('rfq_items').getFullList<RFQItemWithExpand>({
      filter: `rfq = "${rfqId}"`,
      expand: 'product',
    });
  }

  /**
   * Create RFQ item
   */
  async createItem(data: RFQItemCreateInput): Promise<RFQItem> {
    return this.create(data);
  }

  /**
   * Bulk create RFQ items
   */
  async bulkCreate(items: RFQItemCreateInput[]): Promise<RFQItem[]> {
    return Promise.all(items.map(item => this.create(item)));
  }
}

// ============================================================================
// RFQ Supplier Service
// ============================================================================

class RFQSupplierService extends BaseCollectionService<RFQSupplier> {
  constructor() {
    super('rfq_suppliers', { sort: 'created' });
  }

  /**
   * Get suppliers for an RFQ
   */
  async getByRFQ(rfqId: string): Promise<RFQSupplierWithExpand[]> {
    return this.pb.collection('rfq_suppliers').getFullList<RFQSupplierWithExpand>({
      filter: `rfq = "${rfqId}"`,
      expand: 'supplier',
    });
  }

  /**
   * Add supplier to RFQ
   */
  async addSupplier(data: RFQSupplierCreateInput): Promise<RFQSupplier> {
    return this.create({
      ...data,
      status: data.status || 'pending',
    });
  }

  /**
   * Update supplier status
   */
  async updateStatus(id: string, status: RFQSupplierStatus): Promise<RFQSupplier> {
    const updates: Partial<RFQSupplier> = { status };
    
    if (status === 'sent') {
      updates.sent_at = new Date().toISOString();
    } else if (status === 'received') {
      updates.received_at = new Date().toISOString();
    }
    
    return this.update(id, updates);
  }

  /**
   * Mark supplier as sent
   */
  async markAsSent(id: string): Promise<RFQSupplier> {
    return this.updateStatus(id, 'sent');
  }

  /**
   * Mark supplier as received
   */
  async markAsReceived(id: string): Promise<RFQSupplier> {
    return this.updateStatus(id, 'received');
  }

  /**
   * Select supplier
   */
  async selectSupplier(id: string): Promise<RFQSupplier> {
    return this.updateStatus(id, 'selected');
  }
}

// ============================================================================
// RFQ Quotation Service
// ============================================================================

class RFQQuotationService extends BaseCollectionService<RFQQuotation> {
  constructor() {
    super('rfq_quotations', { sort: 'created' });
  }

  /**
   * Get quotations for an RFQ
   */
  async getByRFQ(rfqId: string): Promise<RFQQuotation[]> {
    return this.getFullList({
      filter: `rfq = "${rfqId}"`,
    });
  }

  /**
   * Get quotations by supplier
   */
  async getBySupplier(rfqId: string, supplierId: string): Promise<RFQQuotation[]> {
    return this.getFullList({
      filter: `rfq = "${rfqId}" && supplier = "${supplierId}"`,
    });
  }

  /**
   * Get quotations for an item
   */
  async getByItem(rfqItemId: string): Promise<RFQQuotation[]> {
    return this.getFullList({
      filter: `rfq_item = "${rfqItemId}"`,
    });
  }

  /**
   * Create quotation
   */
  async createQuotation(data: RFQQuotationCreateInput): Promise<RFQQuotation> {
    return this.create(data);
  }

  /**
   * Bulk create quotations
   */
  async bulkCreate(quotations: RFQQuotationCreateInput[]): Promise<RFQQuotation[]> {
    return Promise.all(quotations.map(q => this.create(q)));
  }

  /**
   * Find lowest price quotation for an item
   */
  async findLowestPrice(rfqItemId: string): Promise<RFQQuotation | null> {
    const quotations = await this.getByItem(rfqItemId);
    if (quotations.length === 0) return null;
    
    return quotations.reduce((min, q) => 
      q.unit_price < min.unit_price ? q : min
    );
  }
}

// ============================================================================
// RFQ Mold Quotation Service
// ============================================================================

class RFQMoldQuotationService extends BaseCollectionService<RFQMoldQuotation> {
  constructor() {
    super('rfq_mold_quotations', { sort: 'created' });
  }

  /**
   * Get mold quotations for an RFQ
   */
  async getByRFQ(rfqId: string): Promise<RFQMoldQuotation[]> {
    return this.getFullList({
      filter: `rfq = "${rfqId}"`,
    });
  }

  /**
   * Get mold quotations by supplier
   */
  async getBySupplier(rfqId: string, supplierId: string): Promise<RFQMoldQuotation[]> {
    return this.getFullList({
      filter: `rfq = "${rfqId}" && supplier = "${supplierId}"`,
    });
  }

  /**
   * Create mold quotation
   */
  async createMoldQuotation(data: RFQMoldQuotationCreateInput): Promise<RFQMoldQuotation> {
    return this.create(data);
  }
}

// ============================================================================
// Export Services
// ============================================================================

export const rfqService = new RFQService();
export const rfqItemService = new RFQItemService();
export const rfqSupplierService = new RFQSupplierService();
export const rfqQuotationService = new RFQQuotationService();
export const rfqMoldQuotationService = new RFQMoldQuotationService();

export default rfqService;
