/**
 * Branding Configuration Types
 * 文档品牌配置类型定义
 */

// ============================================================================
// Office Information
// ============================================================================

export interface OfficeInfo {
  name: string;           // English name
  name_cn: string;        // Chinese name
  address: string;        // Full English address
  address_cn: string;     // Full Chinese address
  phone?: string;
  email?: string;
}

// ============================================================================
// Signer Information
// ============================================================================

export interface SignerInfo {
  name: string;           // English name
  name_cn: string;        // Chinese name
  title: string;          // e.g., "VP of Business Development"
  title_cn: string;       // e.g., "业务发展副总裁"
}

// ============================================================================
// Branding Configuration
// ============================================================================

export interface BrandingConfig {
  // Company Identity
  company_name: string;           // English name
  company_name_cn: string;        // Chinese name
  website_url: string;
  vat?: string;                   // VAT Number
  
  // Images stored as base64 data URIs (for PDF generation)
  logo_base64: string;            // Company logo (base64 data URI)
  stamp_base64: string;           // Company stamp image (base64 data URI)
  signature_base64: string;       // Signer signature image (base64 data URI)
  
  // External URLs for email (email clients don't support base64)
  logo_url?: string;              // Public URL for logo (used in emails)
  
  // Legacy paths (for backward compatibility, will be migrated)
  logo_path?: string;
  stamp_path?: string;
  
  // Primary Office (Headquarters - Chongqing)
  primary_office: OfficeInfo;
  
  // Secondary Office (Branch - Barcelona)
  secondary_office: OfficeInfo;
  
  // Signer Information
  default_signer: SignerInfo;
}

// ============================================================================
// Document Branding (Language-specific)
// ============================================================================

export interface DocumentBranding {
  companyName: string;
  logoBase64: string;             // Logo as base64 data URI
  logoUrl?: string;               // Public URL for logo (used in emails)
  stampBase64: string;            // Stamp as base64 data URI
  signatureBase64: string;        // Signature as base64 data URI
  websiteUrl: string;
  vat?: string;                   // VAT Number
  primaryOffice: {
    name: string;
    address: string;
    phone?: string;
    email?: string;
  };
  secondaryOffice: {
    name: string;
    address: string;
    phone?: string;
    email?: string;
  };
  signer: {
    name: string;
    title: string;
  };
  // Legacy fields for backward compatibility
  logoPath?: string;
  stampPath?: string;
}

// ============================================================================
// Document Type
// ============================================================================

export type DocumentType = 'customer' | 'supplier';

// ============================================================================
// Default Branding Config
// ============================================================================

export const DEFAULT_BRANDING_CONFIG: BrandingConfig = {
  company_name: 'ALUSTARS INTERNATIONAL CO., LTD',
  company_name_cn: '重庆星铝国际贸易有限公司',
  website_url: 'www.alustars.com',
  logo_base64: '',                // Will be uploaded by user
  stamp_base64: '',               // Will be uploaded by user
  signature_base64: '',           // Will be uploaded by user
  logo_path: '/logo-alustars-naranja.png',         // Legacy fallback
  stamp_path: '/stamp-alustars.png', // Legacy fallback
  primary_office: {
    name: 'Chongqing Alustars International Co.,Ltd.',
    name_cn: '重庆星铝国际贸易有限公司',
    address: 'No.194,Jiarui Avenue,Beibei District, 400707 Chongqing, China',
    address_cn: '重庆市北碚区蔡家岗镇嘉瑞大道194号14-1',
    phone: '+86 15923354664',
    email: 'z.zela@alustars.com',
  },
  secondary_office: {
    name: 'ALUSTARS INTERNATIONAL CO., LTD.',
    name_cn: '',
    address: 'Valencia 264 Principal, 08007 Barcelona, Spain',
    address_cn: '西班牙巴塞罗那 Valencia 264 Principal, 08007',
    phone: '(+34) 607630594',
    email: 'c.feliu@alustars.com',
  },
  default_signer: {
    name: 'Carlos Feliu',
    name_cn: 'Carlos Feliu',
    title: 'VP of Business Development',
    title_cn: '副总裁',
  },
};
