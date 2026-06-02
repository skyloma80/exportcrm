/**
 * Customer Service
 * 客户服务
 * 
 * Provides CRUD operations and business logic for customer management.
 */

import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';
import { codeGenerator, CODE_PREFIXES } from '@/lib/services/code-generator';

// ============================================================================
// Types
// ============================================================================

export interface Customer extends RecordModel {
  code: string;
  name: string;
  name_cn?: string;
  country: string;
  type: 'direct' | 'agent' | 'distributor';
  rating?: number;
  preferred_currency?: string;
  address?: string;
  address_cn?: string;
  website?: string;
  remarks?: string;
  tax_id?: string;
  supplier_id?: string;
}

export interface CustomerContact extends RecordModel {
  customer: string;
  name: string;
  position?: string;
  email?: string;
  phone?: string;
  wechat?: string;
  is_primary?: boolean;
}

export interface CustomerWithContacts extends Customer {
  expand?: {
    customer_contacts_via_customer?: CustomerContact[];
  };
}

export interface CustomerCreateInput {
  name: string;
  name_cn?: string;
  country: string;
  type: 'direct' | 'agent' | 'distributor';
  rating?: number;
  preferred_currency?: string;
  address?: string;
  address_cn?: string;
  website?: string;
  remarks?: string;
  tax_id?: string;
  supplier_id?: string;
}

export interface CustomerUpdateInput extends Partial<CustomerCreateInput> {}

// ============================================================================
// Customer Service
// ============================================================================

class CustomerService extends BaseCollectionService<Customer> {
  constructor() {
    super('customers');
  }

  /**
   * Generate a new customer code
   */
  async generateCode(): Promise<string> {
    return codeGenerator.generate(CODE_PREFIXES.CUSTOMER);
  }

  /**
   * Get customer by code
   */
  async getByCode(code: string): Promise<Customer | null> {
    return this.getFirstListItem(`code = "${code}"`);
  }

  /**
   * Search customers by name (supports both English and Chinese)
   */
  async search(query: string, options?: { page?: number; perPage?: number }): Promise<{
    items: Customer[];
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
   * Get customer with contacts
   */
  async getWithContacts(id: string): Promise<CustomerWithContacts | null> {
    try {
      const customer = await this.pb.collection('customers').getOne<CustomerWithContacts>(id, {
        expand: 'customer_contacts_via_customer',
      });
      return customer;
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  /**
   * Create customer with auto-generated code
   */
  async createCustomer(data: CustomerCreateInput): Promise<Customer> {
    const code = await this.generateCode();
    return this.create({
      ...data,
      code,
    });
  }

  /**
   * Update customer
   */
  async updateCustomer(id: string, data: CustomerUpdateInput): Promise<Customer> {
    return this.update(id, data);
  }

  /**
   * Get customers by country
   */
  async getByCountry(country: string): Promise<Customer[]> {
    return this.getFullList({
      filter: `country = "${country}"`,
    });
  }

  /**
   * Get customers by type
   */
  async getByType(type: 'direct' | 'agent' | 'distributor'): Promise<Customer[]> {
    return this.getFullList({
      filter: `type = "${type}"`,
    });
  }

  /**
   * Get customers by rating
   */
  async getByRating(minRating: number): Promise<Customer[]> {
    return this.getFullList({
      filter: `rating >= ${minRating}`,
      sort: '-rating',
    });
  }

  /**
   * Update customer's preferred currency
   */
  async updatePreferredCurrency(id: string, currency: string): Promise<Customer> {
    return this.update(id, { preferred_currency: currency });
  }

  /**
   * Check if customer code is unique
   */
  async isCodeUnique(code: string): Promise<boolean> {
    return !(await this.exists(`code = "${code}"`));
  }

  /**
   * Get display name based on locale
   */
  getDisplayName(customer: Customer, locale: string = 'en'): string {
    if (locale === 'zh' && customer.name_cn) {
      return customer.name_cn;
    }
    return customer.name;
  }

  /**
   * Get display address based on locale
   */
  getDisplayAddress(customer: Customer, locale: string = 'en'): string | undefined {
    if (locale === 'zh' && customer.address_cn) {
      return customer.address_cn;
    }
    return customer.address;
  }
}

// ============================================================================
// Customer Contact Service
// ============================================================================

class CustomerContactService extends BaseCollectionService<CustomerContact> {
  constructor() {
    super('customer_contacts');
  }

  /**
   * Get contacts for a customer
   */
  async getByCustomer(customerId: string): Promise<CustomerContact[]> {
    return this.getFullList({
      filter: `customer = "${customerId}"`,
    });
  }

  /**
   * Get primary contact for a customer
   */
  async getPrimaryContact(customerId: string): Promise<CustomerContact | null> {
    return this.getFirstListItem(`customer = "${customerId}" && is_primary = true`);
  }

  /**
   * Set contact as primary (and unset others)
   */
  async setPrimaryContact(contactId: string, customerId: string): Promise<void> {
    // First, unset all primary contacts for this customer
    const contacts = await this.getByCustomer(customerId);
    await Promise.all(
      contacts
        .filter(c => c.is_primary && c.id !== contactId)
        .map(c => this.update(c.id, { is_primary: false }))
    );
    
    // Then set the specified contact as primary
    await this.update(contactId, { is_primary: true });
  }

  /**
   * Create contact for a customer
   */
  async createContact(customerId: string, data: Omit<CustomerContact, 'id' | 'customer' | 'created' | 'updated' | 'collectionId' | 'collectionName'>): Promise<CustomerContact> {
    return this.create({
      ...data,
      customer: customerId,
    });
  }
}

// ============================================================================
// Export Services
// ============================================================================

export const customerService = new CustomerService();
export const customerContactService = new CustomerContactService();

export default customerService;
