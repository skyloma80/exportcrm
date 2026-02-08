/**
 * Business Code Generator Service
 * 
 * Generates unique business codes in format: {PREFIX}-{YYYY}-{XXXX}
 * Examples: CUS-2025-0001, RFQ-2025-0001 
 */

import PocketBase from 'pocketbase';

// Lazy initialization of PocketBase client to avoid issues during testing
let _pb: PocketBase | null = null;

function getPb() {
  if (!_pb) {
    const { getPocketBase } = require('@/lib/pocketbase/auth');
    _pb = getPocketBase();
  }
  return _pb!;
}

/**
 * Set the PocketBase instance to use for code generation
 * This allows API routes to pass in a server-side authenticated instance
 */
export function setCodeGeneratorPb(pb: PocketBase) {
  _pb = pb;
}

/**
 * Reset the PocketBase instance (useful for testing or switching contexts)
 */
export function resetCodeGeneratorPb() {
  _pb = null;
}

// Valid prefixes for different entity types
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

// Code format regex pattern (4 digits)
const CODE_PATTERN = /^([A-Z]+)-(\d{4})-(\d{3,4})$/;

export interface ParsedCode {
  prefix: string;
  year: number;
  sequence: number;
  isValid: boolean;
}

export interface CodeSequence {
  id: string;
  prefix: string;
  year: number;
  current_sequence: number;
}

/**
 * Validates if a code matches the expected format
 */
export function validateCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}

/**
 * Parses a business code into its components
 */
export function parseCode(code: string): ParsedCode {
  const match = code.match(CODE_PATTERN);
  
  if (!match) {
    return {
      prefix: '',
      year: 0,
      sequence: 0,
      isValid: false,
    };
  }

  return {
    prefix: match[1],
    year: parseInt(match[2], 10),
    sequence: parseInt(match[3], 10),
    isValid: true,
  };
}

/**
 * Formats a code from its components
 * Standard format: {PREFIX}-{YYYY}-{XXXX} (4 digits for sequence)
 */
export function formatCode(prefix: string, year: number, sequence: number): string {
  const paddedSequence = sequence.toString().padStart(4, '0');
  return `${prefix}-${year}-${paddedSequence}`;
}

/**
 * Formats an order code in compact format: A{YY}{MM}{XXX}
 * Example: A2601001 (A + 26 for 2026 + 01 for January + 001 sequence)
 */
export function formatOrderCode(year: number, sequence: number, month?: number): string {
  const yearSuffix = year.toString().slice(-2);
  const monthValue = month !== undefined ? month : new Date().getMonth() + 1; // Use current month if not specified
  const paddedMonth = monthValue.toString().padStart(2, '0');
  const paddedSequence = sequence.toString().padStart(3, '0');
  return `A${yearSuffix}${paddedMonth}${paddedSequence}`;
}

/**
 * Generates a new unique business code for the given prefix
 * Queries existing records to find the highest sequence number for the current year
 * @param prefix - The code prefix (e.g., 'QUO', 'ORD')
 * @param pbInstance - Optional PocketBase instance (for server-side use)
 */
export async function generateCode(prefix: CodePrefix | string, pbInstance?: PocketBase): Promise<string> {
  const currentYear = new Date().getFullYear();
  const pb = pbInstance || getPb();

  try {
    // Find all records for the current year with this prefix
    // Format is {PREFIX}-{YYYY}-{XXXX}, so we look for codes starting with prefix and year
    const yearPattern = `${prefix}-${currentYear}`;

    // Get all records that match the current year and prefix pattern, sorted by code descending
    // Need to determine the appropriate collection based on prefix
    let collectionName: string;
    switch (prefix) {
      case CODE_PREFIXES.CUSTOMER:
        collectionName = 'customers';
        break;
      case CODE_PREFIXES.SUPPLIER:
        collectionName = 'suppliers';
        break;
      case CODE_PREFIXES.PROJECT:
        collectionName = 'projects';
        break;
      case CODE_PREFIXES.PRODUCT:
        collectionName = 'products';
        break;
      case CODE_PREFIXES.RFQ:
        collectionName = 'rfqs';
        break;
      case CODE_PREFIXES.QUOTATION:
        collectionName = 'quotations';
        break;
      case CODE_PREFIXES.ORDER:
        collectionName = 'orders'; // We'll handle orders separately
        break;
      case CODE_PREFIXES.PURCHASE_ORDER:
        collectionName = 'purchase_orders';
        break;
      case CODE_PREFIXES.PROFORMA_INVOICE:
        collectionName = 'proforma_invoices';
        break;
      case CODE_PREFIXES.COMMERCIAL_INVOICE:
        collectionName = 'commercial_invoices';
        break;
      case CODE_PREFIXES.SHIPMENT:
        collectionName = 'shipments';
        break;
      case CODE_PREFIXES.MOLD:
        collectionName = 'molds';
        break;
      case CODE_PREFIXES.SERVICE_PROVIDER:
        collectionName = 'service_providers';
        break;
      case CODE_PREFIXES.TASK:
        collectionName = 'tasks';
        break;
      default:
        collectionName = 'unknown'; // Fallback, though this shouldn't happen
        break;
    }

    // For orders, we use the specialized function
    if (prefix === CODE_PREFIXES.ORDER) {
      return await generateOrderCode(pbInstance);
    }

    let newSequence: number = 1;

    if (collectionName !== 'unknown' && collectionName !== 'orders') {
      const records = await pb.collection(collectionName).getList(1, 1, {
        filter: `code ~ "^${yearPattern}"`,
        sort: '-code',
      });

      if (records.items.length > 0) {
        // Extract sequence number from the highest existing code
        const highestCode = records.items[0].code;
        const match = highestCode.match(new RegExp(`^${yearPattern}-(\\d{3,4})$`)); // 3-4 digits for sequence

        if (match) {
          const currentSeq = parseInt(match[1], 10);
          newSequence = currentSeq + 1;
        } else {
          // If the pattern doesn't match, start with 1
          newSequence = 1;
        }
      }
    } else {
      // Fallback to the original sequence-based approach for unsupported collections
      const existingSequences = await pb.collection('code_sequences').getList<CodeSequence>(1, 1, {
        filter: `prefix = "${prefix}" && year = ${currentYear}`,
      });

      if (existingSequences.items.length > 0) {
        // Update existing sequence
        const existing = existingSequences.items[0];
        newSequence = existing.current_sequence + 1;

        await pb.collection('code_sequences').update(existing.id, {
          current_sequence: newSequence,
        });
      } else {
        // Create new sequence for this prefix and year
        newSequence = 1;

        await pb.collection('code_sequences').create({
          prefix,
          year: currentYear,
          current_sequence: newSequence,
        });
      }
    }

    return formatCode(prefix, currentYear, newSequence);
  } catch (error) {
    console.error('Error generating code:', error);
    throw new Error(`Failed to generate code for prefix: ${prefix}`);
  }
}

/**
 * Generates a new unique order code in compact format: A{YY}{MM}{XXX}
 * Queries existing orders to find the highest sequence number for the current year and month
 * @param pbInstance - Optional PocketBase instance (for server-side use)
 */
export async function generateOrderCode(pbInstance?: PocketBase): Promise<string> {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // Month is 0-indexed, so add 1
  const yearSuffix = currentYear.toString().slice(-2);
  const monthSuffix = currentMonth.toString().padStart(2, '0');
  const pb = pbInstance || getPb();

  try {
    // Find all orders for the current year and month
    // Format is A{YY}{MM}{XXX}, so we look for codes starting with A + year + month
    const yearMonthPattern = `A${yearSuffix}${monthSuffix}`;

    // Get all orders that match the current year and month pattern to find the max sequence
    const orders = await pb.collection('orders').getFullList({
      filter: `code >= "A${yearSuffix}${monthSuffix}000" && code < "A${yearSuffix}${monthSuffix}999"`,
      sort: '-code',
    });

    let newSequence: number = 1;

    if (orders.length > 0) {
      // Find the highest sequence number among all matching orders
      let maxSequence = 0;
      for (const order of orders) {
        const match = order.code.match(new RegExp(`^A${yearSuffix}${monthSuffix}(\\d{3})$`));
        if (match) {
          const seq = parseInt(match[1], 10);
          if (seq > maxSequence) {
            maxSequence = seq;
          }
        }
      }
      newSequence = maxSequence + 1;
    }

    return formatOrderCode(currentYear, newSequence, currentMonth);
  } catch (error) {
    console.error('Error generating order code:', error);
    throw new Error('Failed to generate order code');
  }
}

/**
 * Gets the next sequence number without incrementing (for preview)
 */
export async function getNextSequence(prefix: CodePrefix): Promise<string> {
  const currentYear = new Date().getFullYear();
  const pb = getPb();
  
  try {
    const existingSequences = await pb.collection('code_sequences').getList<CodeSequence>(1, 1, {
      filter: `prefix = "${prefix}" && year = ${currentYear}`,
    });

    const nextSequence = existingSequences.items.length > 0
      ? existingSequences.items[0].current_sequence + 1
      : 1;

    return formatCode(prefix, currentYear, nextSequence);
  } catch (error) {
    console.error('Error getting next sequence:', error);
    return formatCode(prefix, currentYear, 1);
  }
}

/**
 * Checks if a code already exists in the specified collection
 */
export async function isCodeUnique(collection: string, code: string): Promise<boolean> {
  const pb = getPb();
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

// Export the code generator service
export const codeGenerator = {
  generate: generateCode,
  generateOrderCode,
  validate: validateCode,
  parse: parseCode,
  format: formatCode,
  formatOrderCode,
  getNextSequence,
  isCodeUnique,
  PREFIXES: CODE_PREFIXES,
};

// Alias for backward compatibility
export const PREFIXES = CODE_PREFIXES;

export default codeGenerator;
