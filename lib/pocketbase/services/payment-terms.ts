import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';

export interface PaymentTerm extends RecordModel {
  code: string;
  name: string;
  name_cn?: string;
  sort_order?: number;
  is_active?: boolean;
}

class PaymentTermService extends BaseCollectionService<PaymentTerm> {
  constructor() {
    super('payment_terms', { sort: 'sort_order,code' });
  }

  async getAll(): Promise<PaymentTerm[]> {
    return this.getFullList({ sort: 'sort_order,code' });
  }

  async getActive(): Promise<PaymentTerm[]> {
    return this.getFullList({ filter: 'is_active = true', sort: 'sort_order,code' });
  }
}

export const paymentTermService = new PaymentTermService();
export default paymentTermService;
