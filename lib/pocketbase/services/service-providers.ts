/**
 * Service Provider Service
 * 服务商服务
 * 
 * Manages freight forwarders, customs brokers, shipping lines, etc.
 */

import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';
import { codeGenerator, CODE_PREFIXES } from '@/lib/services/code-generator';

// ============================================================================
// Types
// ============================================================================

export type ServiceProviderType = 
  | 'freight_forwarder'  // 货代
  | 'customs_broker'     // 报关行
  | 'shipping_line'      // 船公司
  | 'trucking'           // 拖车
  | 'warehouse'          // 仓库
  | 'inspection'         // 验货
  | 'insurance'          // 保险
  | 'other';             // 其他

export interface ServiceProvider extends RecordModel {
  code: string;
  name: string;
  name_cn?: string;
  type: ServiceProviderType;
  country?: string;
  city?: string;
  address?: string;
  address_cn?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_wechat?: string;
  services?: string[];
  rating?: number;
  is_active: boolean;
  remarks?: string;
}

export interface ServiceProviderCreateInput {
  name: string;
  name_cn?: string;
  type: ServiceProviderType;
  country?: string;
  city?: string;
  address?: string;
  address_cn?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_wechat?: string;
  services?: string[];
  rating?: number;
  is_active?: boolean;
  remarks?: string;
}

export interface ServiceProviderUpdateInput extends Partial<ServiceProviderCreateInput> {}

// ============================================================================
// Service Provider Service
// ============================================================================

class ServiceProviderService extends BaseCollectionService<ServiceProvider> {
  constructor() {
    super('service_providers');
  }

  /**
   * Generate a new service provider code
   */
  async generateCode(): Promise<string> {
    return codeGenerator.generate(CODE_PREFIXES.SERVICE_PROVIDER);
  }

  /**
   * Get service provider by code
   */
  async getByCode(code: string): Promise<ServiceProvider | null> {
    return this.getFirstListItem(`code = "${code}"`);
  }

  /**
   * Search service providers by name
   */
  async search(query: string, options?: { page?: number; perPage?: number }): Promise<{
    items: ServiceProvider[];
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
   * Create service provider with auto-generated code
   */
  async createServiceProvider(data: ServiceProviderCreateInput): Promise<ServiceProvider> {
    const code = await this.generateCode();
    return this.create({
      ...data,
      code,
      is_active: data.is_active ?? true,
    });
  }

  /**
   * Update service provider
   */
  async updateServiceProvider(id: string, data: ServiceProviderUpdateInput): Promise<ServiceProvider> {
    return this.update(id, data);
  }

  /**
   * Get service providers by type
   */
  async getByType(type: ServiceProviderType): Promise<ServiceProvider[]> {
    return this.getFullList({
      filter: `type = "${type}" && is_active = true`,
    });
  }

  /**
   * Get active service providers
   */
  async getActive(): Promise<ServiceProvider[]> {
    return this.getFullList({
      filter: 'is_active = true',
    });
  }

  /**
   * Get freight forwarders
   */
  async getFreightForwarders(): Promise<ServiceProvider[]> {
    return this.getByType('freight_forwarder');
  }

  /**
   * Get customs brokers
   */
  async getCustomsBrokers(): Promise<ServiceProvider[]> {
    return this.getByType('customs_broker');
  }

  /**
   * Get shipping lines
   */
  async getShippingLines(): Promise<ServiceProvider[]> {
    return this.getByType('shipping_line');
  }

  /**
   * Get display name based on locale
   */
  getDisplayName(provider: ServiceProvider, locale: string = 'en'): string {
    if (locale === 'zh' && provider.name_cn) {
      return provider.name_cn;
    }
    return provider.name;
  }

  /**
   * Toggle active status
   */
  async toggleActive(id: string): Promise<ServiceProvider> {
    const provider = await this.getOne(id);
    if (!provider) throw new Error('Service provider not found');
    return this.update(id, { is_active: !provider.is_active });
  }
}

// ============================================================================
// Export
// ============================================================================

export const serviceProviderService = new ServiceProviderService();
export default serviceProviderService;
