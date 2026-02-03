/**
 * Supplier Service
 * 供应商服务
 * 
 * Provides CRUD operations and business logic for supplier management.
 */

import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';
import { codeGenerator, CODE_PREFIXES } from '@/lib/services/code-generator';

// ============================================================================
// Types
// ============================================================================

export interface Supplier extends RecordModel {
  code: string;
  name: string;
  name_cn?: string;
  country: string;
  type: 'manufacturer' | 'trader' | 'agent';
  rating?: number;
  address?: string;
  address_cn?: string;
  capabilities?: string[];
  certifications?: string[];
  remarks?: string;
}

export interface SupplierContact extends RecordModel {
  supplier: string;
  name: string;
  position?: string;
  email?: string;
  phone?: string;
  wechat?: string;
  is_primary?: boolean;
}

export interface SupplierBankAccount extends RecordModel {
  supplier: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  swift_code?: string;
  currency?: string;
  is_default?: boolean;
}

export interface SupplierWithRelations extends Supplier {
  expand?: {
    supplier_contacts_via_supplier?: SupplierContact[];
    supplier_bank_accounts_via_supplier?: SupplierBankAccount[];
  };
}

export interface SupplierCreateInput {
  name: string;
  name_cn?: string;
  country: string;
  type: 'manufacturer' | 'trader' | 'agent';
  rating?: number;
  address?: string;
  address_cn?: string;
  capabilities?: string[];
  certifications?: string[];
  remarks?: string;
}

export interface SupplierUpdateInput extends Partial<SupplierCreateInput> {}


// ============================================================================
// Supplier Service
// ============================================================================

class SupplierService extends BaseCollectionService<Supplier> {
  constructor() {
    super('suppliers');
  }

  /**
   * Generate a new supplier code
   */
  async generateCode(): Promise<string> {
    return codeGenerator.generate(CODE_PREFIXES.SUPPLIER);
  }

  /**
   * Get supplier by code
   */
  async getByCode(code: string): Promise<Supplier | null> {
    return this.getFirstListItem(`code = "${code}"`);
  }

  /**
   * Search suppliers by name (supports both English and Chinese)
   */
  async search(query: string, options?: { page?: number; perPage?: number }): Promise<{
    items: Supplier[];
    totalItems: number;
    totalPages: number;
  }> {
    const escapedQuery = query.replace(/"/g, '\\"');
    const filter = `name ~ "${escapedQuery}" || name_cn ~ "${escapedQuery}"`;
    
    const result = await this.getList({
      filter,
      page: options?.page || 1,
      perPage: options?.perPage || 50,
    });

    return {
      items: result.items,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  }

  /**
   * Get supplier with contacts and bank accounts
   */
  async getWithRelations(id: string): Promise<SupplierWithRelations | null> {
    try {
      const supplier = await this.pb.collection('suppliers').getOne<SupplierWithRelations>(id, {
        expand: 'supplier_contacts_via_supplier,supplier_bank_accounts_via_supplier',
      });
      return supplier;
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  /**
   * Create supplier with auto-generated code
   */
  async createSupplier(data: SupplierCreateInput): Promise<Supplier> {
    const code = await this.generateCode();
    return this.create({
      ...data,
      code,
    });
  }

  /**
   * Update supplier
   */
  async updateSupplier(id: string, data: SupplierUpdateInput): Promise<Supplier> {
    return this.update(id, data);
  }

  /**
   * Get suppliers by country
   */
  async getByCountry(country: string): Promise<Supplier[]> {
    return this.getFullList({
      filter: `country = "${country}"`,
    });
  }

  /**
   * Get suppliers by type
   */
  async getByType(type: 'manufacturer' | 'trader' | 'agent'): Promise<Supplier[]> {
    return this.getFullList({
      filter: `type = "${type}"`,
    });
  }

  /**
   * Get suppliers by rating
   */
  async getByRating(minRating: number): Promise<Supplier[]> {
    return this.getFullList({
      filter: `rating >= ${minRating}`,
      sort: '-rating',
    });
  }

  /**
   * Get display name based on locale
   */
  getDisplayName(supplier: Supplier, locale: string = 'en'): string {
    if (locale === 'zh' && supplier.name_cn) {
      return supplier.name_cn;
    }
    return supplier.name;
  }

  /**
   * Get display address based on locale
   */
  getDisplayAddress(supplier: Supplier, locale: string = 'en'): string | undefined {
    if (locale === 'zh' && supplier.address_cn) {
      return supplier.address_cn;
    }
    return supplier.address;
  }
}


// ============================================================================
// Supplier Contact Service
// ============================================================================

class SupplierContactService extends BaseCollectionService<SupplierContact> {
  constructor() {
    super('supplier_contacts');
  }

  /**
   * Get contacts for a supplier
   */
  async getBySupplier(supplierId: string): Promise<SupplierContact[]> {
    return this.getFullList({
      filter: `supplier = "${supplierId}"`,
    });
  }

  /**
   * Get primary contact for a supplier
   */
  async getPrimaryContact(supplierId: string): Promise<SupplierContact | null> {
    return this.getFirstListItem(`supplier = "${supplierId}" && is_primary = true`);
  }

  /**
   * Set contact as primary (and unset others)
   */
  async setPrimaryContact(contactId: string, supplierId: string): Promise<void> {
    const contacts = await this.getBySupplier(supplierId);
    await Promise.all(
      contacts
        .filter(c => c.is_primary && c.id !== contactId)
        .map(c => this.update(c.id, { is_primary: false }))
    );
    await this.update(contactId, { is_primary: true });
  }

  /**
   * Create contact for a supplier
   */
  async createContact(supplierId: string, data: Omit<SupplierContact, 'id' | 'supplier' | 'created' | 'updated' | 'collectionId' | 'collectionName'>): Promise<SupplierContact> {
    return this.create({
      ...data,
      supplier: supplierId,
    });
  }
}

// ============================================================================
// Supplier Bank Account Service
// ============================================================================

class SupplierBankAccountService extends BaseCollectionService<SupplierBankAccount> {
  constructor() {
    super('supplier_bank_accounts');
  }

  /**
   * Get bank accounts for a supplier
   */
  async getBySupplier(supplierId: string): Promise<SupplierBankAccount[]> {
    return this.getFullList({
      filter: `supplier = "${supplierId}"`,
    });
  }

  /**
   * Get default bank account for a supplier
   */
  async getDefaultAccount(supplierId: string): Promise<SupplierBankAccount | null> {
    return this.getFirstListItem(`supplier = "${supplierId}" && is_default = true`);
  }

  /**
   * Set bank account as default (and unset others)
   */
  async setDefaultAccount(accountId: string, supplierId: string): Promise<void> {
    const accounts = await this.getBySupplier(supplierId);
    await Promise.all(
      accounts
        .filter(a => a.is_default && a.id !== accountId)
        .map(a => this.update(a.id, { is_default: false }))
    );
    await this.update(accountId, { is_default: true });
  }

  /**
   * Create bank account for a supplier
   */
  async createAccount(supplierId: string, data: Omit<SupplierBankAccount, 'id' | 'supplier' | 'created' | 'updated' | 'collectionId' | 'collectionName'>): Promise<SupplierBankAccount> {
    return this.create({
      ...data,
      supplier: supplierId,
    });
  }
}

// ============================================================================
// Export Services
// ============================================================================

export const supplierService = new SupplierService();
export const supplierContactService = new SupplierContactService();
export const supplierBankAccountService = new SupplierBankAccountService();

export default supplierService;
