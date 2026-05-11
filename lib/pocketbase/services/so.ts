import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';
import { getPocketBase } from '../client';
import { generateOrderCode } from '@/lib/services/code-generator';

export type SOStatus = 'draft' | 'confirmed' | 'in_production' | 'ready_to_ship' | 'shipped' | 'delivered' | 'completed' | 'cancelled';

export interface SOItem {
  id: string;
  part_number: string;
  product_name: string;
  description_en?: string;
  description_cn?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
  cost_price?: number;
}

export interface SOCreateInput {
  code?: string;
  customer_id?: string;
  customer_name: string;
  customer_address?: string;
  customer_tax_id?: string;
  customer_po?: string;
  vendor_code?: string;
  currency: string;
  incoterm?: string;
  port_of_loading?: string;
  port_of_destination?: string;
  payment_terms?: string;
  bank_info?: string;
  country_of_origin?: string;
  country_of_destination?: string;
  mode_of_shipment?: string;
  shipping_marks?: string;
  expected_delivery_date?: string;
  estimated_shipping_date?: string;
  remarks?: string;
  project_id?: string;
  project?: string;
  customer?: string;
  total_amount: number;
  paid_amount?: number;
  status: SOStatus;
  items: SOItem[];
}

export interface FlatSO extends SOCreateInput, RecordModel {}

export class SOService extends BaseCollectionService<FlatSO> {
  constructor() {
    super('so', { sort: '-code' });
  }

  async getSOByCode(code: string): Promise<FlatSO | null> {
    const pb = getPocketBase();
    try {
      return await pb.collection('so').getFirstListItem(`code="${code}"`);
    } catch (e) {
      return null;
    }
  }

  async create(data: Partial<FlatSO>): Promise<FlatSO> {
    const pb = getPocketBase();
    
    if (!data.code) {
      data.code = await generateOrderCode(pb);
    }
    
    return pb.collection('so').create<FlatSO>(data);
  }
}

export const soService = new SOService();
