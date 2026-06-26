import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';

export interface PortOfDestination extends RecordModel {
  code: string;
  name: string;
  name_cn?: string;
  sort_order?: number;
  is_active?: boolean;
}

class PortOfDestinationService extends BaseCollectionService<PortOfDestination> {
  constructor() {
    super('ports_of_destination', { sort: 'sort_order,name' });
  }

  async getAll(): Promise<PortOfDestination[]> {
    return this.getFullList({ sort: 'sort_order,name' });
  }

  async getActive(): Promise<PortOfDestination[]> {
    return this.getFullList({ filter: 'is_active = true', sort: 'sort_order,name' });
  }
}

export const portsOfDestinationService = new PortOfDestinationService();
export default portsOfDestinationService;
