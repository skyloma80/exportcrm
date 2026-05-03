import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';
import { getPocketBase } from "@/lib/pocketbase/auth";

export interface CustomPalletSpec extends RecordModel {
  code: string;
  name: string;
  name_cn: string;
  length: number;  // mm
  width: number;   // mm
  height: number;  // mm (pallet's own height)
  maxLoad: number; // kg
  is_active: boolean;
  created_by?: string;
}

export interface CustomPalletSpecCreateInput {
  code: string;
  name: string;
  name_cn: string;
  length: number;
  width: number;
  height: number;
  maxLoad?: number;
  is_active?: boolean;
}

export interface CustomPalletSpecUpdateInput {
  code?: string;
  name?: string;
  name_cn?: string;
  length?: number;
  width?: number;
  height?: number;
  maxLoad?: number;
  is_active?: boolean;
}

class CustomPalletSpecService extends BaseCollectionService<CustomPalletSpec> {
  constructor() {
    super("custom_pallet_specs");
  }

  async getAllActive(): Promise<CustomPalletSpec[]> {
    return this.getFullList({
      filter: 'is_active = true',
      sort: '-created,name'
    });
  }

  async getByCode(code: string): Promise<CustomPalletSpec | null> {
    return this.getFirstListItem(`code = "${code}" && is_active = true`);
  }

  async create(data: CustomPalletSpecCreateInput): Promise<CustomPalletSpec> {
    const specData = {
      ...data,
      maxLoad: data.maxLoad || 1500,
      is_active: data.is_active !== undefined ? data.is_active : true,
    };
    
    return super.create(specData);
  }

  async update(id: string, data: CustomPalletSpecUpdateInput): Promise<CustomPalletSpec> {
    return super.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return super.delete(id);
  }
}

export const customPalletSpecService = new CustomPalletSpecService();
