/**
 * App Config Service
 * 系统配置服务
 */

import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';

// ============================================================================
// Types
// ============================================================================

export interface AppConfig extends RecordModel {
  key: string;
  value: any;
  category?: string;
  description?: string;
  description_cn?: string;
}

export type ConfigCategory = 'branding' | 'trade' | 'payment' | 'ports';

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_CONFIGS = {
  // Trade
  default_currency: { value: 'USD', category: 'trade' },
  default_incoterm: { value: 'FOB', category: 'trade' },
  incoterms: {
    value: ['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP'],
    category: 'trade',
  },

  // Ports
  ports_of_loading: {
    value: [
      { code: 'CNSHA', name: 'Shanghai', name_cn: '上海' },
      { code: 'CNNBO', name: 'Ningbo', name_cn: '宁波' },
      { code: 'CNSZX', name: 'Shenzhen', name_cn: '深圳' },
      { code: 'CNQIN', name: 'Qingdao', name_cn: '青岛' },
    ],
    category: 'ports',
  },
};

// ============================================================================
// App Config Service
// ============================================================================

class AppConfigService extends BaseCollectionService<AppConfig> {
  private cache: Map<string, any> = new Map();

  constructor() {
    super('app_config', { sort: 'key' });
  }

  /**
   * Get config value by key
   */
  async get<T = any>(key: string, defaultValue?: T): Promise<T> {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    try {
      const config = await this.getFirstListItem(`key = "${key}"`);
      if (config) {
        this.cache.set(key, config.value);
        return config.value as T;
      }
    } catch (e) {
      // Config not found
    }

    // Return default from DEFAULT_CONFIGS or provided default
    const defaultConfig = DEFAULT_CONFIGS[key as keyof typeof DEFAULT_CONFIGS];
    return (defaultConfig?.value ?? defaultValue) as T;
  }

  /**
   * Set config value
   */
  async set(key: string, value: any, category?: ConfigCategory): Promise<AppConfig> {
    const existing = await this.getFirstListItem(`key = "${key}"`);
    
    if (existing) {
      const updated = await this.update(existing.id, { value });
      this.cache.set(key, value);
      return updated;
    }

    const created = await this.create({
      key,
      value,
      category: category || DEFAULT_CONFIGS[key as keyof typeof DEFAULT_CONFIGS]?.category,
    });
    this.cache.set(key, value);
    return created;
  }

  /**
   * Get all configs by category
   */
  async getByCategory(category: ConfigCategory): Promise<AppConfig[]> {
    return this.getFullList({
      filter: `category = "${category}"`,
    });
  }

  /**
   * Get all configs
   */
  async getAll(): Promise<Record<string, any>> {
    const configs = await this.getFullList();
    const result: Record<string, any> = {};
    
    for (const config of configs) {
      result[config.key] = config.value;
    }
    
    // Merge with defaults
    for (const [key, def] of Object.entries(DEFAULT_CONFIGS)) {
      if (!(key in result)) {
        result[key] = def.value;
      }
    }
    
    return result;
  }

  /**
   * Initialize default configs
   */
  async initializeDefaults(): Promise<void> {
    for (const [key, config] of Object.entries(DEFAULT_CONFIGS)) {
      const existing = await this.getFirstListItem(`key = "${key}"`);
      if (!existing) {
        await this.create({
          key,
          value: config.value,
          category: config.category,
        });
      }
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// ============================================================================
// Export
// ============================================================================

export const appConfigService = new AppConfigService();
export default appConfigService;
