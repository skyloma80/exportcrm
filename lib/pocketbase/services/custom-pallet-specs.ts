import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';

export interface CustomPalletSpec extends RecordModel {
  name: string;           // 托盘名称，如"中国标准托盘"
  dimensions: string;     // 尺寸规格，格式：长x宽x高，如"1200×1200×150"
  is_active: boolean;
  created_by?: string;
}

export interface CustomPalletSpecCreateInput {
  name: string;
  dimensions: string;
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

  async create(data: CustomPalletSpecCreateInput): Promise<CustomPalletSpec> {
    const specData = {
      ...data,
      is_active: data.is_active !== undefined ? data.is_active : true,
    };
    
    return super.create(specData);
  }

  // 解析尺寸字符串，格式：1200×1200×150 或 1200*1200*150
  parseDimensions(dimensions: string): { length: number; width: number; height: number } | null {
    try {
      const parts = dimensions.split(/[×x*]/).map(s => parseInt(s.trim()));
      if (parts.length === 3 && parts.every(p => !isNaN(p) && p > 0)) {
        return {
          length: parts[0],
          width: parts[1],
          height: parts[2]
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  // 转换为 PalletSpec 格式，用于计算
  toPalletSpec(spec: CustomPalletSpec) {
    const parsed = this.parseDimensions(spec.dimensions);
    if (!parsed) return null;
    
    return {
      code: `CUSTOM_${spec.id}`,
      name: spec.name,
      name_cn: spec.name,
      length: parsed.length,
      width: parsed.width,
      height: parsed.height,
      maxLoad: 1500, // 默认载重
      isCustom: true,
      id: spec.id
    };
  }
}

export const customPalletSpecService = new CustomPalletSpecService();

