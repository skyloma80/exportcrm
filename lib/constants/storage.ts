/**
 * Storage Path Constants
 * 存储路径常量
 * 
 * This file defines the directory structure and path conventions
 * for storing business documents in S3/MinIO.
 */

// ============================================================================
// Root Types - 根目录类型
// ============================================================================

export const ROOT_TYPES = {
  CUSTOMERS: 'Customers',
  SUPPLIERS: 'Suppliers',
} as const;

export type RootType = typeof ROOT_TYPES[keyof typeof ROOT_TYPES];

// ============================================================================
// File Scopes - 文件作用域
// ============================================================================

export const FILE_SCOPES = {
  CUSTOMER: 'customer',
  PROJECT: 'project',
  PRODUCT: 'product',
  RFQ: 'rfq',
  QUOTATION: 'quotation',
  ORDER: 'order',
  PURCHASE_ORDER: 'purchase_order',
  SHIPMENT: 'shipment',
  SUPPLIER: 'supplier',
  GENERAL: 'general',
} as const;

export type FileScope = typeof FILE_SCOPES[keyof typeof FILE_SCOPES];

// ============================================================================
// Document Categories - 文档类别
// ============================================================================

export const DOCUMENT_CATEGORIES = {
  // Product documents
  PHOTO: 'photo',
  DRAWING: 'drawing',
  SPECIFICATION: 'specification',
  
  // Business documents
  QUOTATION: 'quotation',
  PI: 'pi',
  CI: 'ci',
  PO: 'po',
  CONTRACT: 'contract',
  PACKING_LIST: 'packing_list',
  
  // Payment documents
  DEPOSIT_RECEIPT: 'deposit_receipt',
  PROGRESS_RECEIPT: 'progress_receipt',
  FINAL_RECEIPT: 'final_receipt',
  PO_DEPOSIT_VOUCHER: 'po_deposit_voucher',
  PO_PROGRESS_VOUCHER: 'po_progress_voucher',
  PO_FINAL_VOUCHER: 'po_final_voucher',
  
  // Supplier documents
  CERTIFICATION: 'certification',
  
  // Shipping documents
  BL: 'bl',
  LOADING_PHOTO: 'loading_photo',
  
  // General
  GENERAL: 'general',
  ATTACHMENT: 'attachment',
} as const;

export type DocumentCategory = typeof DOCUMENT_CATEGORIES[keyof typeof DOCUMENT_CATEGORIES];

// ============================================================================
// Directory Names - 目录名称映射
// ============================================================================

export const DIRECTORY_NAMES: Record<string, string> = {
  // Scope directories
  products: 'products',
  rfqs: 'rfqs',
  quotations: 'quotations',
  orders: 'orders',
  pos: 'pos',
  shipments: 'shipments',
  general: 'general',
  
  // Category directories
  photo: 'photo',
  drawing: 'drawing',
  specification: 'specification',
  pi: 'pi',
  ci: 'ci',
  contract: 'contracts',
  packing_list: 'packing_lists',
  deposit_receipt: 'deposit_receipts',
  progress_receipt: 'progress_receipts',
  final_receipt: 'final_receipts',
  po_deposit_voucher: 'po_deposit_vouchers',
  po_progress_voucher: 'po_progress_vouchers',
  po_final_voucher: 'po_final_vouchers',
  certification: 'certifications',
  bl: 'bl',
  loading_photo: 'loading_photos',
  attachment: 'attachments',
};

// ============================================================================
// Path Templates - 路径模板
// ============================================================================

/**
 * Customer-related file paths:
 * 
 * Customers/{customerName}/General/                           - Customer general files
 * Customers/{customerName}/{projectName}/                     - Project root
 * Customers/{customerName}/{projectName}/products/{productName}/photo/
 * Customers/{customerName}/{projectName}/products/{productName}/drawing/
 * Customers/{customerName}/{projectName}/products/{productName}/specification/
 * Customers/{customerName}/{projectName}/rfqs/{rfqCode}/quotations/
 * Customers/{customerName}/{projectName}/quotations/
 * Customers/{customerName}/{projectName}/orders/{orderCode}/pi/
 * Customers/{customerName}/{projectName}/orders/{orderCode}/contracts/
 * Customers/{customerName}/{projectName}/orders/{orderCode}/deposit_receipts/
 * Customers/{customerName}/{projectName}/orders/{orderCode}/progress_receipts/
 * Customers/{customerName}/{projectName}/orders/{orderCode}/final_receipts/
 * Customers/{customerName}/{projectName}/pos/{poCode}/
 * Customers/{customerName}/{projectName}/shipments/{shipmentCode}/
 * Customers/{customerName}/{projectName}/general/
 */

/**
 * Supplier-related file paths:
 * 
 * Suppliers/{supplierName}/contracts/
 * Suppliers/{supplierName}/certifications/
 * Suppliers/{supplierName}/quotations/
 * Suppliers/{supplierName}/general/
 */

// ============================================================================
// Breadcrumb Types - 面包屑类型
// ============================================================================

export interface Breadcrumb {
  label: string;
  path: string;
  type: 'root' | 'customer' | 'supplier' | 'project' | 'directory' | 'entity' | 'file';
}

// ============================================================================
// Path Options Interface - 路径选项接口
// ============================================================================

export interface PathOptions {
  rootType: 'customers' | 'suppliers';
  customerName?: string;
  supplierName?: string;
  projectName?: string;
  productName?: string;
  scope: FileScope;
  category?: DocumentCategory;
  refCode?: string;  // Reference code (e.g., order code, RFQ code)
  fileName?: string;
}

// ============================================================================
// Parsed Path Interface - 解析后的路径接口
// ============================================================================

export interface ParsedPath {
  rootType: 'customers' | 'suppliers' | null;
  customerName?: string;
  supplierName?: string;
  projectName?: string;
  directoryType?: string;
  entityCode?: string;
  category?: string;
  fileName?: string;
  isValid: boolean;
}

// ============================================================================
// File Type Mappings - 文件类型映射
// ============================================================================

export const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: 'file-text',
  doc: 'file-text',
  docx: 'file-text',
  xls: 'file-spreadsheet',
  xlsx: 'file-spreadsheet',
  ppt: 'file-presentation',
  pptx: 'file-presentation',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  svg: 'image',
  dwg: 'file-cad',
  dxf: 'file-cad',
  step: 'file-3d',
  stp: 'file-3d',
  iges: 'file-3d',
  igs: 'file-3d',
  stl: 'file-3d',
  zip: 'file-archive',
  rar: 'file-archive',
  '7z': 'file-archive',
};

// ============================================================================
// Allowed File Extensions - 允许的文件扩展名
// ============================================================================

export const ALLOWED_EXTENSIONS = {
  documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf'],
  images: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.tiff'],
  cad: ['.dwg', '.dxf', '.step', '.stp', '.iges', '.igs', '.stl', '.obj', '.3ds'],
  archives: ['.zip', '.rar', '.7z', '.tar', '.gz'],
};

export const ALL_ALLOWED_EXTENSIONS = [
  ...ALLOWED_EXTENSIONS.documents,
  ...ALLOWED_EXTENSIONS.images,
  ...ALLOWED_EXTENSIONS.cad,
  ...ALLOWED_EXTENSIONS.archives,
];

// ============================================================================
// Max File Size - 最大文件大小
// ============================================================================

export const MAX_FILE_SIZE = {
  default: 50 * 1024 * 1024, // 50MB
  image: 10 * 1024 * 1024,   // 10MB
  cad: 100 * 1024 * 1024,    // 100MB
  archive: 200 * 1024 * 1024, // 200MB
};

export default {
  ROOT_TYPES,
  FILE_SCOPES,
  DOCUMENT_CATEGORIES,
  DIRECTORY_NAMES,
  FILE_TYPE_ICONS,
  ALLOWED_EXTENSIONS,
  ALL_ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
};
