import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';

export interface PortOfLoading extends RecordModel {
  code: string;
  name: string;
  name_cn?: string;
  sort_order?: number;
  is_active?: boolean;
}

class PortOfLoadingService extends BaseCollectionService<PortOfLoading> {
  constructor() {
    super('ports_of_loading', { sort: 'sort_order,name' });
  }

  async getAll(): Promise<PortOfLoading[]> {
    return this.getFullList({ sort: 'sort_order,name' });
  }

  async getActive(): Promise<PortOfLoading[]> {
    return this.getFullList({ filter: 'is_active = true', sort: 'sort_order,name' });
  }
}

export const portsOfLoadingService = new PortOfLoadingService();
export default portsOfLoadingService;
