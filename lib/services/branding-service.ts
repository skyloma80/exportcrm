/**
 * Branding Service
 * 文档品牌配置服务
 * 
 * Manages company branding configuration for PDF documents and email templates.
 * Supports bilingual content (English for customer documents, Chinese for supplier documents).
 */

import { documentBrandingService } from '@/lib/pocketbase/services/document-branding';
import {
  BrandingConfig,
  DocumentBranding,
  DocumentType,
  DEFAULT_BRANDING_CONFIG,
} from '@/lib/branding/types';

// ============================================================================
// Branding Service
// ============================================================================

class BrandingService {
  private cache: BrandingConfig | null = null;

  /**
   * Get full branding configuration
   */
  async getBrandingConfig(): Promise<BrandingConfig> {
    if (this.cache) {
      return this.cache;
    }

    try {
      const record = await documentBrandingService.getFirst();
      if (record) {
        const config: BrandingConfig = {
          company_name: record.company_name || DEFAULT_BRANDING_CONFIG.company_name,
          company_name_cn: record.company_name_cn || DEFAULT_BRANDING_CONFIG.company_name_cn,
          website_url: record.website_url || DEFAULT_BRANDING_CONFIG.website_url,
          vat: record.vat,
          logo_base64: record.logo_base64 || DEFAULT_BRANDING_CONFIG.logo_base64,
          stamp_base64: record.stamp_base64 || DEFAULT_BRANDING_CONFIG.stamp_base64,
          signature_base64: record.signature_base64 || DEFAULT_BRANDING_CONFIG.signature_base64,
          logo_url: record.logo_url,
          logo_path: record.logo_path || DEFAULT_BRANDING_CONFIG.logo_path,
          stamp_path: record.stamp_path || DEFAULT_BRANDING_CONFIG.stamp_path,
          primary_office: record.primary_office || DEFAULT_BRANDING_CONFIG.primary_office,
          secondary_office: record.secondary_office || DEFAULT_BRANDING_CONFIG.secondary_office,
          default_signer: record.default_signer || DEFAULT_BRANDING_CONFIG.default_signer,
        };
        const mergedConfig = this.mergeWithDefaults(config);
        this.cache = mergedConfig;
        return mergedConfig;
      }
      return DEFAULT_BRANDING_CONFIG;
    } catch (error) {
      console.error('[BrandingService] Failed to get branding config:', error);
      return DEFAULT_BRANDING_CONFIG;
    }
  }

  /**
   * Get branding for specific document type (customer or supplier)
   * Customer documents use English, Supplier documents use Chinese
   * @param type - 'customer' for English, 'supplier' for Chinese
   * @param options - Additional options
   * @param options.baseUrl - Base URL for converting legacy paths to absolute URLs (fallback only)
   */
  async getDocumentBranding(
    type: DocumentType,
    options?: { baseUrl?: string; embedImages?: boolean }
  ): Promise<DocumentBranding> {
    const config = await this.getBrandingConfig();
    const isEnglish = type === 'customer';

    // Use base64 images directly, fallback to legacy paths if not available
    // But skip SVG files as react-pdf doesn't support them
    let logoBase64 = config.logo_base64 || '';
    let stampBase64 = config.stamp_base64 || '';
    let signatureBase64 = config.signature_base64 || '';
    
    // Legacy fallback: convert paths to absolute URLs if base64 not available
    // Skip SVG files as react-pdf doesn't support them
    let logoPath = config.logo_path;
    let stampPath = config.stamp_path;
    
    // Filter out SVG paths - react-pdf doesn't support SVG
    if (logoPath?.toLowerCase().endsWith('.svg')) {
      logoPath = undefined;
    }
    if (stampPath?.toLowerCase().endsWith('.svg')) {
      stampPath = undefined;
    }
    
    if (options?.baseUrl) {
      const baseUrl = options.baseUrl.replace(/\/$/, '');
      if (!logoBase64 && logoPath && logoPath.startsWith('/')) {
        logoPath = `${baseUrl}${logoPath}`;
      }
      if (!stampBase64 && stampPath && stampPath.startsWith('/')) {
        stampPath = `${baseUrl}${stampPath}`;
      }
    }
 
    return {
      // 使用 primary_office 的名称作为公司名称（设置页面配置的是这个）
      companyName: isEnglish 
        ? (config.primary_office.name || config.company_name) 
        : (config.primary_office.name_cn || config.company_name_cn),
      logoBase64,
      logoUrl: config.logo_url, // 邮件使用的公开 URL
      stampBase64,
      signatureBase64,
      websiteUrl: config.website_url,
      vat: config.vat,
      primaryOffice: {
        name: isEnglish ? config.primary_office.name : config.primary_office.name_cn,
        address: isEnglish ? config.primary_office.address : config.primary_office.address_cn,
        phone: config.primary_office.phone,
        email: config.primary_office.email,
      },
      secondaryOffice: {
        name: isEnglish ? config.secondary_office.name : config.secondary_office.name_cn,
        address: isEnglish ? config.secondary_office.address : config.secondary_office.address_cn,
        phone: config.secondary_office.phone,
        email: config.secondary_office.email,
      },
      signer: {
        name: isEnglish ? config.default_signer.name : config.default_signer.name_cn,
        title: isEnglish ? config.default_signer.title : config.default_signer.title_cn,
      },
      // Legacy fields for backward compatibility
      // Only use path if no base64 available, and skip SVG files
      logoPath: !logoBase64 ? logoPath : undefined,
      stampPath: !stampBase64 ? stampPath : undefined,
    };
  }

  /**
   * Update branding configuration
   */
  async updateBrandingConfig(config: Partial<BrandingConfig>): Promise<void> {
    try {
      // Get current config
      const currentConfig = await this.getBrandingConfig();
      
      // Merge with new values
      const updatedConfig: BrandingConfig = {
        ...currentConfig,
        ...config,
        primary_office: {
          ...currentConfig.primary_office,
          ...(config.primary_office || {}),
        },
        secondary_office: {
          ...currentConfig.secondary_office,
          ...(config.secondary_office || {}),
        },
        default_signer: {
          ...currentConfig.default_signer,
          ...(config.default_signer || {}),
        },
      };

      // Save to document_branding collection
      await documentBrandingService.save({
        company_name: updatedConfig.company_name,
        company_name_cn: updatedConfig.company_name_cn,
        website_url: updatedConfig.website_url,
        vat: updatedConfig.vat,
        logo_base64: updatedConfig.logo_base64,
        stamp_base64: updatedConfig.stamp_base64,
        signature_base64: updatedConfig.signature_base64,
        logo_url: updatedConfig.logo_url,
        logo_path: updatedConfig.logo_path,
        stamp_path: updatedConfig.stamp_path,
        primary_office: updatedConfig.primary_office,
        secondary_office: updatedConfig.secondary_office,
        default_signer: updatedConfig.default_signer,
      });

      this.cache = updatedConfig;
    } catch (error) {
      console.error('[BrandingService] Failed to update branding config:', error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * Merge config with defaults to ensure all fields exist
   * Only use defaults when value is undefined or null, not for empty strings
   */
  private mergeWithDefaults(config: Partial<BrandingConfig> | null): BrandingConfig {
    if (!config) {
      return DEFAULT_BRANDING_CONFIG;
    }

    // Helper to use default only when value is undefined/null
    const fallback = <T>(value: T | undefined | null, defaultValue: T): T => {
      return value !== undefined && value !== null ? value : defaultValue;
    };

    return {
      company_name: fallback(config.company_name, DEFAULT_BRANDING_CONFIG.company_name),
      company_name_cn: fallback(config.company_name_cn, DEFAULT_BRANDING_CONFIG.company_name_cn),
      website_url: fallback(config.website_url, DEFAULT_BRANDING_CONFIG.website_url),
      vat: config.vat,
      logo_base64: fallback(config.logo_base64, DEFAULT_BRANDING_CONFIG.logo_base64),
      stamp_base64: fallback(config.stamp_base64, DEFAULT_BRANDING_CONFIG.stamp_base64),
      signature_base64: fallback(config.signature_base64, DEFAULT_BRANDING_CONFIG.signature_base64),
      logo_url: config.logo_url,
      logo_path: fallback(config.logo_path, DEFAULT_BRANDING_CONFIG.logo_path),
      stamp_path: fallback(config.stamp_path, DEFAULT_BRANDING_CONFIG.stamp_path),
      primary_office: {
        name: fallback(config.primary_office?.name, DEFAULT_BRANDING_CONFIG.primary_office.name),
        name_cn: fallback(config.primary_office?.name_cn, DEFAULT_BRANDING_CONFIG.primary_office.name_cn),
        address: fallback(config.primary_office?.address, DEFAULT_BRANDING_CONFIG.primary_office.address),
        address_cn: fallback(config.primary_office?.address_cn, DEFAULT_BRANDING_CONFIG.primary_office.address_cn),
        phone: config.primary_office?.phone,
        email: config.primary_office?.email,
      },
      secondary_office: {
        name: fallback(config.secondary_office?.name, DEFAULT_BRANDING_CONFIG.secondary_office.name),
        name_cn: fallback(config.secondary_office?.name_cn, DEFAULT_BRANDING_CONFIG.secondary_office.name_cn),
        address: fallback(config.secondary_office?.address, DEFAULT_BRANDING_CONFIG.secondary_office.address),
        address_cn: fallback(config.secondary_office?.address_cn, DEFAULT_BRANDING_CONFIG.secondary_office.address_cn),
        phone: fallback(config.secondary_office?.phone, DEFAULT_BRANDING_CONFIG.secondary_office.phone),
        email: fallback(config.secondary_office?.email, DEFAULT_BRANDING_CONFIG.secondary_office.email),
      },
      default_signer: {
        name: fallback(config.default_signer?.name, DEFAULT_BRANDING_CONFIG.default_signer.name),
        name_cn: fallback(config.default_signer?.name_cn, DEFAULT_BRANDING_CONFIG.default_signer.name_cn),
        title: fallback(config.default_signer?.title, DEFAULT_BRANDING_CONFIG.default_signer.title),
        title_cn: fallback(config.default_signer?.title_cn, DEFAULT_BRANDING_CONFIG.default_signer.title_cn),
      },
    };
  }
}

// ============================================================================
// Export
// ============================================================================

export const brandingService = new BrandingService();
export default brandingService;
