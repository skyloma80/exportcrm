/**
 * Bank Account Service
 * 银行账户服务
 * 
 * 银行账户作为模板存储，content 字段是纯文本
 */

import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';

// ============================================================================
// Types
// ============================================================================

export interface BankAccount extends RecordModel {
  name: string;           // 账户名称
  content: string;        // 银行信息内容（向后兼容，纯文本）
  lines?: string[];       // 银行信息明细（JSON 列表）
  is_default: boolean;    // 是否默认
}

export interface BankAccountCreateInput {
  name: string;
  content: string;
  is_default?: boolean;
}

export interface BankAccountUpdateInput extends Partial<BankAccountCreateInput> { }

// ============================================================================
// Bank Account Service
// ============================================================================

class BankAccountService extends BaseCollectionService<BankAccount> {
  constructor() {
    super('bank_accounts');
  }

  /**
   * Override getFullList to not use sort (collection may not have created field)
   */
  async getFullList(options?: { filter?: string }): Promise<BankAccount[]> {
    return this.pb.collection(this.collectionName).getFullList<BankAccount>({
      filter: options?.filter,
    });
  }

  /**
   * Override getFirstListItem to not use sort
   */
  async getFirstListItem(filter: string): Promise<BankAccount | null> {
    try {
      return await this.pb.collection(this.collectionName).getFirstListItem<BankAccount>(filter);
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  /**
   * Get all bank accounts
   */
  async getAll(): Promise<BankAccount[]> {
    return this.getFullList();
  }

  /**
   * Get default bank account
   */
  async getDefault(): Promise<BankAccount | null> {
    const defaultAccount = await this.getFirstListItem('is_default = true');
    if (defaultAccount) return defaultAccount;

    // Fallback: get the first available account
    const all = await this.pb.collection(this.collectionName).getList<BankAccount>(1, 1);
    return all.items.length > 0 ? all.items[0] : null;
  }

  /**
   * Create bank account
   */
  async createAccount(data: BankAccountCreateInput): Promise<BankAccount> {
    // If this is set as default, unset other defaults
    if (data.is_default) {
      await this.unsetAllDefaults();
    }

    return this.create({
      ...data,
      is_default: data.is_default ?? false,
    });
  }

  /**
   * Update bank account
   */
  async updateAccount(id: string, data: BankAccountUpdateInput): Promise<BankAccount> {
    // If setting as default, unset other defaults first
    if (data.is_default) {
      await this.unsetAllDefaults();
    }

    return this.update(id, data);
  }

  /**
   * Set account as default
   */
  async setAsDefault(id: string): Promise<BankAccount> {
    await this.unsetAllDefaults();
    return this.update(id, { is_default: true });
  }

  /**
   * Unset all default accounts
   */
  private async unsetAllDefaults(): Promise<void> {
    const defaults = await this.getFullList({
      filter: 'is_default = true',
    });

    await Promise.all(
      defaults.map(account => this.update(account.id, { is_default: false }))
    );
  }
}

// ============================================================================
// Export Service
// ============================================================================

export const bankAccountService = new BankAccountService();
export default bankAccountService;
