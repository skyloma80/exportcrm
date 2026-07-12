/**
 * Storage Path Service
 * 存储路径服务
 * 
 * Generates and parses storage paths for business documents.
 */

import {
  ROOT_TYPES,
  FILE_SCOPES,
  DOCUMENT_CATEGORIES,
  DIRECTORY_NAMES,
  type PathOptions,
  type ParsedPath,
  type Breadcrumb,
  type FileScope,
  type DocumentCategory,
} from '@/lib/constants/storage';

/**
 * Sanitize a path segment by removing invalid characters
 */
export function sanitizePathSegment(segment: string): string {
  // Replace invalid characters with underscores
  // Keep Chinese characters, alphanumeric, spaces, hyphens, and underscores
  return segment
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate a storage path based on the provided options
 */
export function generatePath(options: PathOptions): string {
  const {
    rootType,
    customerName,
    supplierName,
    projectName,
    productName,
    scope,
    category,
    refCode,
    fileName,
  } = options;

  const parts: string[] = [];

  // Root directory
  if (rootType === 'customers') {
    parts.push(ROOT_TYPES.CUSTOMERS);
    
    if (customerName) {
      parts.push(sanitizePathSegment(customerName));
      
      if (projectName) {
        parts.push(sanitizePathSegment(projectName));
        
        // Add scope-specific directories
        switch (scope) {
          case FILE_SCOPES.PRODUCT:
            parts.push(DIRECTORY_NAMES.products);
            if (productName) {
              parts.push(sanitizePathSegment(productName));
            }
            break;
          case FILE_SCOPES.QUOTATION:
            parts.push(DIRECTORY_NAMES.quotations);
            break;
          case FILE_SCOPES.ORDER:
            parts.push(DIRECTORY_NAMES.orders);
            if (refCode) {
              parts.push(sanitizePathSegment(refCode));
            }
            break;
          case FILE_SCOPES.PURCHASE_ORDER:
            parts.push(DIRECTORY_NAMES.pos);
            if (refCode) {
              parts.push(sanitizePathSegment(refCode));
            }
            break;
          case FILE_SCOPES.SHIPMENT:
            parts.push(DIRECTORY_NAMES.shipments);
            if (refCode) {
              parts.push(sanitizePathSegment(refCode));
            }
            break;
          case FILE_SCOPES.GENERAL:
            parts.push(DIRECTORY_NAMES.general);
            break;
        }
      } else if (scope === FILE_SCOPES.GENERAL || scope === FILE_SCOPES.CUSTOMER) {
        parts.push('General');
      }
    }
  } else if (rootType === 'suppliers') {
    parts.push(ROOT_TYPES.SUPPLIERS);
    
    if (supplierName) {
      parts.push(sanitizePathSegment(supplierName));
      
      // Add category directory for suppliers
      if (category) {
        const categoryDir = DIRECTORY_NAMES[category] || category;
        parts.push(categoryDir);
      } else if (scope === FILE_SCOPES.GENERAL) {
        parts.push(DIRECTORY_NAMES.general);
      }
    }
  }

  // Add category directory (for customer paths)
  if (rootType === 'customers' && category && scope !== FILE_SCOPES.GENERAL) {
    const categoryDir = DIRECTORY_NAMES[category] || category;
    parts.push(categoryDir);
  }

  // Add filename if provided
  if (fileName) {
    parts.push(sanitizePathSegment(fileName));
  }

  return parts.join('/');
}

/**
 * Parse a storage path into its components
 */
export function parsePath(path: string): ParsedPath {
  const result: ParsedPath = {
    rootType: null,
    isValid: false,
  };

  if (!path || typeof path !== 'string') {
    return result;
  }

  const parts = path.split('/').filter(p => p.length > 0);
  
  if (parts.length === 0) {
    return result;
  }

  // Determine root type
  const root = parts[0];
  if (root === ROOT_TYPES.CUSTOMERS) {
    result.rootType = 'customers';
    result.isValid = true;
    
    if (parts.length > 1) {
      result.customerName = parts[1];
    }
    
    if (parts.length > 2) {
      // Check if it's "General" or a project name
      if (parts[2] === 'General') {
        result.directoryType = 'general';
      } else {
        result.projectName = parts[2];
        
        if (parts.length > 3) {
          result.directoryType = parts[3];
          
          if (parts.length > 4) {
            // Could be entity code or category
            const segment = parts[4];
            if (isEntityCode(segment)) {
              result.entityCode = segment;
              if (parts.length > 5) {
                result.category = parts[5];
              }
            } else {
              result.category = segment;
            }
          }
        }
      }
    }
    
    // Get filename (last part if it has an extension)
    const lastPart = parts[parts.length - 1];
    if (hasFileExtension(lastPart)) {
      result.fileName = lastPart;
    }
    
  } else if (root === ROOT_TYPES.SUPPLIERS) {
    result.rootType = 'suppliers';
    result.isValid = true;
    
    if (parts.length > 1) {
      result.supplierName = parts[1];
    }
    
    if (parts.length > 2) {
      result.directoryType = parts[2];
    }
    
    // Get filename
    const lastPart = parts[parts.length - 1];
    if (hasFileExtension(lastPart)) {
      result.fileName = lastPart;
    }
  }

  return result;
}

/**
 * Generate breadcrumbs from a storage path
 */
export function getBreadcrumbs(path: string): Breadcrumb[] {
  const breadcrumbs: Breadcrumb[] = [];
  const parts = path.split('/').filter(p => p.length > 0);
  
  if (parts.length === 0) {
    return breadcrumbs;
  }

  let currentPath = '';
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    
    let type: Breadcrumb['type'] = 'directory';
    
    if (i === 0) {
      type = 'root';
    } else if (i === 1) {
      type = parts[0] === ROOT_TYPES.CUSTOMERS ? 'customer' : 'supplier';
    } else if (i === 2 && parts[0] === ROOT_TYPES.CUSTOMERS && part !== 'General') {
      type = 'project';
    } else if (isEntityCode(part)) {
      type = 'entity';
    } else if (hasFileExtension(part)) {
      type = 'file';
    }
    
    breadcrumbs.push({
      label: part,
      path: currentPath,
      type,
    });
  }

  return breadcrumbs;
}

/**
 * Check if a string looks like an entity code (e.g., O-2025-00001)
 */
function isEntityCode(str: string): boolean {
  return /^[A-Z]+-\d{4}-\d{5}$/.test(str);
}

/**
 * Check if a string has a file extension
 */
function hasFileExtension(str: string): boolean {
  return /\.[a-zA-Z0-9]+$/.test(str);
}

/**
 * Get the parent path
 */
export function getParentPath(path: string): string {
  const parts = path.split('/').filter(p => p.length > 0);
  if (parts.length <= 1) {
    return '';
  }
  return parts.slice(0, -1).join('/');
}

/**
 * Join path segments
 */
export function joinPath(...segments: string[]): string {
  return segments
    .filter(s => s && s.length > 0)
    .map(s => s.replace(/^\/+|\/+$/g, ''))
    .join('/');
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const match = filename.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Generate a unique filename with timestamp
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const ext = getFileExtension(originalName);
  const baseName = originalName.replace(/\.[^.]+$/, '');
  const sanitized = sanitizePathSegment(baseName);
  return ext ? `${timestamp}_${sanitized}.${ext}` : `${timestamp}_${sanitized}`;
}

// Export the storage path service
export const storagePath = {
  generate: generatePath,
  parse: parsePath,
  getBreadcrumbs,
  getParentPath,
  joinPath,
  sanitize: sanitizePathSegment,
  getFileExtension,
  generateUniqueFilename,
};

export default storagePath;
