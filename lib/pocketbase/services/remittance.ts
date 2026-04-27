/**
 * Remittance Service
 * 汇款指令模板服务
 */

import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';

// ============================================================================
// Types
// ============================================================================

export interface Remittance extends RecordModel {
  name: string;              // 模板名称
  items: string[];           // 汇款信息项列表（每项格式：label: value）
  is_default: boolean;       // 是否默认
}

export interface RemittanceCreateInput {
  name: string;
  items: string[];
  is_default?: boolean;
}

export interface RemittanceUpdateInput extends Partial<RemittanceCreateInput> { }

// ============================================================================
// Remittance Service
// ============================================================================

class RemittanceService extends BaseCollectionService<Remittance> {
  constructor() {
    super('remittance');
  }

  async getFullList(options?: { filter?: string }): Promise<Remittance[]> {
    return this.pb.collection(this.collectionName).getFullList<Remittance>({
      filter: options?.filter,
    });
  }

  async getFirstListItem(filter: string): Promise<Remittance | null> {
    try {
      return await this.pb.collection(this.collectionName).getFirstListItem<Remittance>(filter);
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  async getAll(): Promise<Remittance[]> {
    return this.getFullList();
  }

  async getDefault(): Promise<Remittance | null> {
    const defaultItem = await this.getFirstListItem('is_default = true');
    if (defaultItem) return defaultItem;

    const all = await this.pb.collection(this.collectionName).getList<Remittance>(1, 1);
    return all.items.length > 0 ? all.items[0] : null;
  }

  async createItem(data: RemittanceCreateInput): Promise<Remittance> {
    if (data.is_default) {
      await this.unsetAllDefaults();
    }

    return this.create({
      ...data,
      is_default: data.is_default ?? false,
    });
  }

  async updateItem(id: string, data: RemittanceUpdateInput): Promise<Remittance> {
    if (data.is_default) {
      await this.unsetAllDefaults();
    }

    return this.update(id, data);
  }

  async setAsDefault(id: string): Promise<Remittance> {
    await this.unsetAllDefaults();
    return this.update(id, { is_default: true });
  }

  private async unsetAllDefaults(): Promise<void> {
    const defaults = await this.getFullList({
      filter: 'is_default = true',
    });

    await Promise.all(
      defaults.map(item => this.update(item.id, { is_default: false }))
    );
  }
}

// ============================================================================
// Export Service
// ============================================================================

export const remittanceService = new RemittanceService();
export default remittanceService;