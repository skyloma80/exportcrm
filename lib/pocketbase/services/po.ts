import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';
import { getPocketBase } from '../client';

export type POStatus = 'draft' | 'sent' | 'confirmed' | 'in_production' | 'shipped' | 'delivered' | 'completed' | 'cancelled';

export interface POItem {
  id?: string; // Client-side tracking ID
  part_number?: string;
  product_name?: string;
  product_code?: string;
  description_en?: string;
  description_cn?: string;
  unit?: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface POCreateInput {
  code: string;
  supplier_id?: string;
  supplier_name: string;
  currency: string;
  expected_delivery_date?: string;
  remarks?: string;
  total_amount?: number;
  status: POStatus;
  items: POItem[];
}

export interface FlatPO extends POCreateInput, RecordModel {}

export class POService extends BaseCollectionService<FlatPO> {
  constructor() {
    super('po');
  }

  async getPOByCode(code: string): Promise<FlatPO | null> {
    const pb = getPocketBase();
    try {
      return await pb.collection('po').getFirstListItem(`code="${code}"`);
    } catch (e) {
      return null;
    }
  }

  // Generate a new sequential PO code (e.g., PO-20231015-01)
  async generateNextPOCode(): Promise<string> {
    const pb = getPocketBase();
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PO-${datePrefix}-`;
    
    try {
      const records = await pb.collection('po').getList(1, 1, {
        filter: `code ~ "^${prefix}"`,
        sort: '-code',
      });
      
      if (records.items.length > 0) {
        const lastCode = records.items[0].code;
        const lastNum = parseInt(lastCode.split('-').pop() || '0', 10);
        return `${prefix}${String(lastNum + 1).padStart(2, '0')}`;
      }
    } catch (e) {
      console.error("Error generating PO code", e);
    }
    
    return `${prefix}01`;
  }
}

export const poService = new POService();
export default poService;
