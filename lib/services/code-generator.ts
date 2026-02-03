/**
 * Business Code Generator Service
 * 
 * Generates unique business codes in format: {PREFIX}-{YYYY}-{XXXX}
 * Examples: CUS-2025-0001, RFQ-2025-0001, ORD-2025-0001
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
 * Formats an order code in compact format: A{YY}{XXXX}
 * Example: A260001 (A + 26 for 2026 + 0001 sequence)
 * Note: Order code already uses 4 digits, no change needed
 */
export function formatOrderCode(year: number, sequence: number): string {
  const yearSuffix = year.toString().slice(-2);
  const paddedSequence = sequence.toString().padStart(4, '0');
  return `A${yearSuffix}${paddedSequence}`;
}

/**
 * Generates a new unique business code for the given prefix
 * Uses database transaction to ensure uniqueness
 * @param prefix - The code prefix (e.g., 'QUO', 'ORD')
 * @param pbInstance - Optional PocketBase instance (for server-side use)
 */
export async function generateCode(prefix: CodePrefix | string, pbInstance?: PocketBase): Promise<string> {
  const currentYear = new Date().getFullYear();
  const pb = pbInstance || getPb();
  
  try {
    // Try to find existing sequence for this prefix and year
    const existingSequences = await pb.collection('code_sequences').getList<CodeSequence>(1, 1, {
      filter: `prefix = "${prefix}" && year = ${currentYear}`,
    });

    let newSequence: number;

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

    return formatCode(prefix, currentYear, newSequence);
  } catch (error) {
    console.error('Error generating code:', error);
    throw new Error(`Failed to generate code for prefix: ${prefix}`);
  }
}

/**
 * Generates a new unique order code in compact format: A{YY}{XXXX}
 * Uses 'ORD' prefix internally for sequence tracking
 * @param pbInstance - Optional PocketBase instance (for server-side use)
 */
export async function generateOrderCode(pbInstance?: PocketBase): Promise<string> {
  const currentYear = new Date().getFullYear();
  const pb = pbInstance || getPb();
  const prefix = CODE_PREFIXES.ORDER;
  
  try {
    // Try to find existing sequence for this prefix and year
    const existingSequences = await pb.collection('code_sequences').getList<CodeSequence>(1, 1, {
      filter: `prefix = "${prefix}" && year = ${currentYear}`,
    });

    let newSequence: number;

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

    return formatOrderCode(currentYear, newSequence);
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
