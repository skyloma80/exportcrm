import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';
import { getPocketBase } from "@/lib/pocketbase/auth";

export interface Unit extends RecordModel {
  code: string;
  name: string;
  name_cn?: string;
  category: 'quantity' | 'weight' | 'length' | 'volume' | 'area';
  sort_order?: number;
  is_active: boolean;
}

export interface UnitCreateInput {
  code: string;
  name: string;
  name_cn?: string;
  category: 'quantity' | 'weight' | 'length' | 'volume' | 'area';
  sort_order?: number;
  is_active?: boolean;
}

export interface UnitUpdateInput {
  code?: string;
  name?: string;
  name_cn?: string;
  category?: 'quantity' | 'weight' | 'length' | 'volume' | 'area';
  sort_order?: number;
  is_active?: boolean;
}

class UnitService extends BaseCollectionService<Unit> {
  constructor() {
    super("units");
  }

  async getAllActive(category?: 'quantity' | 'weight' | 'length' | 'volume' | 'area'): Promise<Unit[]> {
    let filter = 'is_active = true';
    
    if (category) {
      filter += ` && category = "${category}"`;
    }
    
    return this.getFullList({ filter, sort: 'sort_order,name' });
  }

  async getByCode(code: string): Promise<Unit | null> {
    return this.getFirstListItem(`code = "${code}" && is_active = true`);
  }

  async create(data: UnitCreateInput): Promise<Unit> {
    // Ensure is_active defaults to true
    const unitData = {
      ...data,
      is_active: data.is_active !== undefined ? data.is_active : true,
    };
    
    return super.create(unitData);
  }
}

export const unitService = new UnitService();