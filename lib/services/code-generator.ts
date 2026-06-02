import PocketBase from 'pocketbase';
import { getPocketBase } from '../pocketbase/auth';

/**
 * Code Prefixes
 */
export const CODE_PREFIXES = {
  CUSTOMER: 'CUS',
  SUPPLIER: 'SUP',
  PROJECT: 'PRJ',
  PRODUCT: 'PRD',
  RFQ: 'RFQ',
  QUOTATION: 'QUO',
  ORDER: 'ORD',
  PURCHASE_ORDER: 'PO',
  PROFORMA_INVOICE: 'PI',
  COMMERCIAL_INVOICE: 'CI',
  SHIPMENT: 'SHP',
  MOLD: 'MLD',
  SERVICE_PROVIDER: 'SP',
  TASK: 'TSK',
} as const;

export type CodePrefix = typeof CODE_PREFIXES[keyof typeof CODE_PREFIXES];

/**
 * Collection name mapping
 */
const COLLECTION_MAP: Record<string, string> = {
  CUS: 'customers',
  SUP: 'suppliers',
  PRJ: 'projects',
  PRD: 'products',
  RFQ: 'rfqs',
  QUO: 'quotations',
  ORD: 'so',
  PO: 'po',
  PI: 'proforma_invoices',
  CI: 'commercial_invoices',
  SHP: 'shipments',
  MLD: 'molds',
  SP: 'service_providers',
  TSK: 'tasks',
};

/**
 * Code format patterns for each type
 * Format: {PREFIX}{pattern}-{sequence}
 */
const CODE_PATTERNS: Record<string, { pattern: string; seqDigits: number; useYear: boolean; useMonth: boolean }> = {
  // Order (SO): A{YY}{MM}-XXX, e.g., A2604-001
  ORD: { pattern: 'A', seqDigits: 3, useYear: false, useMonth: true },
  // PO: PO-A{YY}{MM}-XXX, e.g., PO-A2603-001
  PO: { pattern: 'PO-A', seqDigits: 3, useYear: false, useMonth: true },
  // Others: PREFIX-{YYYY}-XXXX
  CUS: { pattern: 'CUS-', seqDigits: 4, useYear: true, useMonth: false },
  SUP: { pattern: 'SUP-', seqDigits: 4, useYear: true, useMonth: false },
  PRJ: { pattern: 'PRJ-', seqDigits: 4, useYear: true, useMonth: false },
  PRD: { pattern: 'PRD-', seqDigits: 4, useYear: true, useMonth: false },
  RFQ: { pattern: 'RFQ-', seqDigits: 4, useYear: true, useMonth: false },
  QUO: { pattern: 'QUO-', seqDigits: 4, useYear: true, useMonth: false },
  PI: { pattern: 'PI-', seqDigits: 4, useYear: true, useMonth: false },
  CI: { pattern: 'CI-', seqDigits: 4, useYear: true, useMonth: false },
  SHP: { pattern: 'SHP-', seqDigits: 4, useYear: true, useMonth: false },
  MLD: { pattern: 'MLD-', seqDigits: 4, useYear: true, useMonth: false },
  SP: { pattern: 'SP-', seqDigits: 4, useYear: true, useMonth: false },
  TSK: { pattern: 'TSK-', seqDigits: 4, useYear: true, useMonth: false },
};

/**
 * Format a code based on type
 */
function formatCodeByType(prefix: string, sequence: number, year?: number, month?: number): string {
  const config = CODE_PATTERNS[prefix];
  if (!config) return `${prefix}-${sequence}`;

  const seqStr = sequence.toString().padStart(config.seqDigits, '0');

  if (prefix === 'ORD') {
    // Order format: A{YY}{MM}-XXX
    const yearSuffix = year ? year.toString().slice(-2) : new Date().getFullYear().toString().slice(-2);
    const monthValue = month || new Date().getMonth() + 1;
    const monthStr = monthValue.toString().padStart(2, '0');
    return `A${yearSuffix}${monthStr}-${seqStr}`;
  } else if (prefix === 'PO') {
    // PO format: PO-A{YY}{MM}-XXX
    const yearSuffix = year ? year.toString().slice(-2) : new Date().getFullYear().toString().slice(-2);
    const monthValue = month || new Date().getMonth() + 1;
    const monthStr = monthValue.toString().padStart(2, '0');
    return `PO-A${yearSuffix}${monthStr}-${seqStr}`;
  } else {
    // Default format: PREFIX-{YYYY}-XXXX
    const yearStr = year || new Date().getFullYear();
    return `${config.pattern}${yearStr}-${seqStr}`;
  }
}

/**
 * Build filter for finding max sequence
 */
function buildFilter(prefix: string, year?: number, month?: number): string {
  const currentYear = year || new Date().getFullYear();
  const currentMonth = month || new Date().getMonth() + 1;
  const config = CODE_PATTERNS[prefix];

  if (prefix === 'ORD') {
    const yearSuffix = currentYear.toString().slice(-2);
    const monthStr = currentMonth.toString().padStart(2, '0');
    return `code >= "A${yearSuffix}${monthStr}-000" && code < "A${yearSuffix}${monthStr}-999"`;
  } else if (prefix === 'PO') {
    const yearSuffix = currentYear.toString().slice(-2);
    const monthStr = currentMonth.toString().padStart(2, '0');
    return `code >= "PO-A${yearSuffix}${monthStr}-000" && code < "PO-A${yearSuffix}${monthStr}-999"`;
  } else {
    // Use range filter instead of regex for better compatibility
    const pattern = config?.pattern || prefix;
    const yearStr = currentYear.toString();
    const startCode = `${pattern}${yearStr}-0000`;
    const endCode = `${pattern}${yearStr}-9999`;
    return `code >= "${startCode}" && code <= "${endCode}"`;
  }
}

/**
 * Extract sequence number from code
 */
function extractSequence(code: string, prefix: string, year?: number, month?: number): number {
  const currentYear = year || new Date().getFullYear();
  const currentMonth = month || new Date().getMonth() + 1;
  const config = CODE_PATTERNS[prefix];

  if (prefix === 'ORD') {
    const yearSuffix = currentYear.toString().slice(-2);
    const monthStr = currentMonth.toString().padStart(2, '0');
    const match = code.match(new RegExp(`^A${yearSuffix}${monthStr}-(\\d{3})$`));
    return match ? parseInt(match[1], 10) : 0;
  } else if (prefix === 'PO') {
    const yearSuffix = currentYear.toString().slice(-2);
    const monthStr = currentMonth.toString().padStart(2, '0');
    const match = code.match(new RegExp(`^PO-A${yearSuffix}${monthStr}-(\\d{3})$`));
    return match ? parseInt(match[1], 10) : 0;
  } else {
    const yearStr = currentYear.toString();
    const pattern = `^${config?.pattern || prefix}${yearStr}-(\\d{${config?.seqDigits || 4}})$`;
    const match = code.match(new RegExp(pattern));
    return match ? parseInt(match[1], 10) : 0;
  }
}

/**
 * Generic code generator - queries the collection to find max sequence
 */
async function generateCodeByPrefix(prefix: string, pbInstance?: PocketBase): Promise<string> {
  const pb = pbInstance || getPocketBase();
  const collectionName = COLLECTION_MAP[prefix];

  if (!collectionName) {
    throw new Error(`Unknown prefix: ${prefix}`);
  }

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const filter = buildFilter(prefix, currentYear, currentMonth);

  console.log(`[CodeGenerator] Generating code for prefix: ${prefix}, collection: ${collectionName}`);
  console.log(`[CodeGenerator] Filter: ${filter}`);

  try {
    const records = await pb.collection(collectionName).getFullList({
      filter,
      sort: '-code',
    });

    console.log(`[CodeGenerator] Found ${records.length} records matching filter`);
    for (const record of records) {
      console.log(`[CodeGenerator] Existing code: ${record.code}`);
    }

    let maxSequence = 0;
    for (const record of records) {
      const seq = extractSequence(record.code, prefix, currentYear, currentMonth);
      console.log(`[CodeGenerator] Code: ${record.code}, extracted sequence: ${seq}`);
      if (seq > maxSequence) {
        maxSequence = seq;
      }
    }

    const newSequence = maxSequence + 1;
    // Check if newSequence exceeds the maximum allowed value for the given number of sequence digits
    const currentConfig = CODE_PATTERNS[prefix];
    const maxAllowedSequence = Math.pow(10, currentConfig.seqDigits) - 1;
    if (newSequence > maxAllowedSequence) {
      throw new Error(`Failed to generate code for prefix ${prefix}: exceeded maximum sequence value ${maxAllowedSequence} for year ${currentYear}.`);
    }
    console.log(`[CodeGenerator] Max sequence: ${maxSequence}, new sequence: ${newSequence}`);
    const newCode = formatCodeByType(prefix, newSequence, currentYear, currentMonth);
    console.log(`[CodeGenerator] Generated code: ${newCode}`);
    return newCode;
  } catch (error) {
    console.error(`Error generating code for ${prefix}:`, error);
    throw new Error(`Failed to generate code for ${prefix}`);
  }
}

// ============================================================================
// Specialized generators for each type
// ============================================================================

/**
 * Generates a new unique order code (SO): A{YY}{MM}-XXX
 */
export async function generateOrderCode(pbInstance?: PocketBase): Promise<string> {
  return generateCodeByPrefix('ORD', pbInstance);
}

/**
 * Generates a new unique PO code: PO-{YYYY}-XXX
 */
export async function generatePOCode(pbInstance?: PocketBase): Promise<string> {
  return generateCodeByPrefix('PO', pbInstance);
}

/**
 * Generates a new unique customer code: CUS-{YYYY}-XXXX
 */
export async function generateCustomerCode(pbInstance?: PocketBase): Promise<string> {
  return generateCodeByPrefix('CUS', pbInstance);
}

/**
 * Generates a new unique supplier code: SUP-{YYYY}-XXXX
 */
export async function generateSupplierCode(pbInstance?: PocketBase): Promise<string> {
  return generateCodeByPrefix('SUP', pbInstance);
}

/**
 * Generates a new unique project code: PRJ-{YYYY}-XXXX
 */
export async function generateProjectCode(pbInstance?: PocketBase): Promise<string> {
  return generateCodeByPrefix('PRJ', pbInstance);
}

/**
 * Generates a new unique product code: PRD-{YYYY}-XXXX
 */
export async function generateProductCode(pbInstance?: PocketBase): Promise<string> {
  return generateCodeByPrefix('PRD', pbInstance);
}

/**
 * Generates a new unique RFQ code: RFQ-{YYYY}-XXXX
 */
export async function generateRFQCode(pbInstance?: PocketBase): Promise<string> {
  return generateCodeByPrefix('RFQ', pbInstance);
}

/**
 * Generates a new unique quotation code: QUO-{YYYY}-XXXX
 */
export async function generateQuotationCode(pbInstance?: PocketBase): Promise<string> {
  return generateCodeByPrefix('QUO', pbInstance);
}

/**
 * Generates a new unique shipment code: SHP-{YYYY}-XXXX
 */
export async function generateShipmentCode(pbInstance?: PocketBase): Promise<string> {
  return generateCodeByPrefix('SHP', pbInstance);
}

/**
 * Generates a new unique task code: TSK-{YYYY}-XXXX
 */
export async function generateTaskCode(pbInstance?: PocketBase): Promise<string> {
  return generateCodeByPrefix('TSK', pbInstance);
}

/**
 * Main generate function - routes to appropriate generator
 */
export async function generateCode(prefix: CodePrefix | string, pbInstance?: PocketBase): Promise<string> {
  // Map prefix to generator
  const prefixMap: Record<string, () => Promise<string>> = {
    ORD: () => generateOrderCode(pbInstance),
    PO: () => generatePOCode(pbInstance),
    CUS: () => generateCustomerCode(pbInstance),
    SUP: () => generateSupplierCode(pbInstance),
    PRJ: () => generateProjectCode(pbInstance),
    PRD: () => generateProductCode(pbInstance),
    RFQ: () => generateRFQCode(pbInstance),
    QUO: () => generateQuotationCode(pbInstance),
    SHP: () => generateShipmentCode(pbInstance),
    TSK: () => generateTaskCode(pbInstance),
  };

  const generator = prefixMap[prefix];
  if (generator) {
    return generator();
  }

  // Fallback to generic generator
  return generateCodeByPrefix(prefix, pbInstance);
}

/**
 * Validates if a code matches the expected format
 */
export function validateCode(code: string): boolean {
  // Order: A{YY}{MM}-XXX
  if (/^A\d{4}\d{3}$/.test(code)) return true;
  // PO: PO-A{YY}{MM}-XXX
  if (/^PO-A\d{4}\d{3}$/.test(code)) return true;
  // Others: PREFIX-{YYYY}-XXXX
  if (/^[A-Z]+-\d{4}-\d{4}$/.test(code)) return true;
  return false;
}

/**
 * Parses a business code into its components
 */
export interface ParsedCode {
  prefix: string;
  year: number;
  sequence: number;
  isValid: boolean;
}

export function parseCode(code: string): ParsedCode {
  // Try order format: A{YY}{MM}{XXX}
  let match = code.match(/^A(\d{2})(\d{2})(\d{3})$/);
  if (match) {
    return {
      prefix: 'ORD',
      year: 2000 + parseInt(match[1]),
      sequence: parseInt(match[3]),
      isValid: true,
    };
  }

  // Try PO format: PO-A{YY}{MM}-{XXX}
  match = code.match(/^PO-A(\d{2})(\d{2})-(\d{3})$/);
  if (match) {
    return {
      prefix: 'PO',
      year: 2000 + parseInt(match[1]),
      sequence: parseInt(match[3]),
      isValid: true,
    };
  }

  // Try standard format: PREFIX-{YYYY}-{XXXX}
  match = code.match(/^([A-Z]+)-(\d{4})-(\d{4})$/);
  if (match) {
    return {
      prefix: match[1],
      year: parseInt(match[2]),
      sequence: parseInt(match[3]),
      isValid: true,
    };
  }

  return {
    prefix: '',
    year: 0,
    sequence: 0,
    isValid: false,
  };
}

/**
 * Checks if a code already exists in the specified collection
 */
export async function isCodeUnique(collection: string, code: string): Promise<boolean> {
  const pb = getPocketBase();
  try {
    const result = await pb.collection(collection).getList(1, 1, {
      filter: `code = "${code}"`,
    });
    return result.items.length === 0;
  } catch (error) {
    console.error('Error checking code uniqueness:', error);
    return false;
  }
}

/**
 * Format a code in standard format: {PREFIX}-{YYYY}-{XXXX}
 * @deprecated Use generateCode instead
 */
export function formatCode(prefix: string, year: number, sequence: number): string {
  return formatCodeByType(prefix, sequence, year);
}

/**
 * Set PocketBase instance for code generator (server-side use)
 * @deprecated No longer needed, pass pbInstance directly to generate functions
 */
let customPb: PocketBase | null = null;

export function setCodeGeneratorPb(pb: PocketBase): void {
  customPb = pb;
}

function getActivePb(): PocketBase {
  return customPb || getPocketBase();
}

// Override generateCodeByPrefix to use customPb when set
const originalGenerateCodeByPrefix = generateCodeByPrefix;
async function generateCodeWithCustomPb(prefix: string, pbInstance?: PocketBase): Promise<string> {
  const pb = pbInstance || customPb || getPocketBase();
  return originalGenerateCodeByPrefix(prefix, pb);
}

// Export the code generator service
export const codeGenerator = {
  generate: generateCode,
  generateOrderCode,
  generatePOCode,
  generateCustomerCode,
  generateSupplierCode,
  generateProjectCode,
  generateProductCode,
  generateRFQCode,
  generateQuotationCode,
  generateShipmentCode,
  generateTaskCode,
  validateCode,
  parseCode,
  isCodeUnique,
  PREFIXES: CODE_PREFIXES,
};

// Alias for backward compatibility
export const PREFIXES = CODE_PREFIXES;

export default codeGenerator;