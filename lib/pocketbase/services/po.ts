import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';
import { getPocketBase } from '../client';
import { generatePOCode } from '@/lib/services/code-generator';

export type POStatus = 'draft' | 'sent' | 'confirmed' | 'in_production' | 'shipped' | 'delivered' | 'completed' | 'cancelled';

export interface POItem {
  id?: string;
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
  code?: string;
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

  async create(data: Partial<FlatPO>): Promise<FlatPO> {
    const pb = getPocketBase();
    
    if (!data.code) {
      data.code = await generatePOCode(pb);
    }
    
    return pb.collection('po').create<FlatPO>(data);
  }
}

export const poService = new POService();
export default poService;
