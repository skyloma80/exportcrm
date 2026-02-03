/**
 * Packaging Calculator Service
 * 包装计算服务
 * 
 * Calculates packaging information based on product specifications.
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

// ============================================================================
// Types
// ============================================================================

export interface CartonDimensions {
  length: number;  // mm
  width: number;   // mm
  height: number;  // mm
}

export interface ProductPackaging {
  product_id: string;
  product_name: string;
  quantity: number;
  pcs_per_carton?: number;
  carton_dimensions?: CartonDimensions;
  carton_gross_weight?: number;  // kg
  carton_net_weight?: number;    // kg
}

export interface PackagingItemSummary {
  product_name: string;
  quantity: number;
  cartons: number | null;  // null if pcs_per_carton is missing
  dimensions?: string;
  gross_weight: number | null;
  net_weight: number | null;
  volume: number | null;  // m³
  is_pending: boolean;  // true if packaging info is incomplete
}

export interface PackagingSummary {
  items: PackagingItemSummary[];
  totals: {
    total_cartons: number;
    total_gross_weight: number;
    total_net_weight: number;
    total_volume: number;
  };
  has_pending: boolean;  // true if any item has incomplete packaging info
  text: string;  // formatted text description
}

// ============================================================================
// Calculation Functions
// ============================================================================

/**
 * Calculate the number of cartons needed for a given quantity
 * Uses ceiling to ensure all items fit
 * 
 * Property 3: 总箱数计算正确性
 * For any quantity and pcs_per_carton, cartons = ceil(quantity / pcs_per_carton)
 */
export function calculateCartons(quantity: number, pcsPerCarton: number): number {
  if (pcsPerCarton <= 0) return 0;
  return Math.ceil(quantity / pcsPerCarton);
}

/**
 * Calculate volume in cubic meters from dimensions in mm
 * 
 * Formula: volume (m³) = (L × W × H) / 1,000,000,000
 * Example: 625mm × 450mm × 390mm = 109,687,500 mm³ = 0.1097 m³
 */
export function calculateVolume(dimensions: CartonDimensions): number {
  // Convert mm³ to m³ (1 m³ = 1,000,000,000 mm³)
  return (dimensions.length * dimensions.width * dimensions.height) / 1000000000;
}

/**
 * Format dimensions as string (L×W×H mm)
 */
export function formatDimensions(dimensions: CartonDimensions): string {
  return `${dimensions.length}×${dimensions.width}×${dimensions.height} mm`;
}

/**
 * Calculate packaging summary for a single product
 */
export function calculateProductPackaging(item: ProductPackaging): PackagingItemSummary {
  const isPending = !item.pcs_per_carton;
  
  let cartons: number | null = null;
  let grossWeight: number | null = null;
  let netWeight: number | null = null;
  let volume: number | null = null;
  let dimensions: string | undefined;

  if (item.pcs_per_carton && item.pcs_per_carton > 0) {
    cartons = calculateCartons(item.quantity, item.pcs_per_carton);
    
    if (item.carton_gross_weight) {
      grossWeight = cartons * item.carton_gross_weight;
    }
    
    if (item.carton_net_weight) {
      netWeight = cartons * item.carton_net_weight;
    }
    
    if (item.carton_dimensions) {
      dimensions = formatDimensions(item.carton_dimensions);
      volume = cartons * calculateVolume(item.carton_dimensions);
    }
  }

  return {
    product_name: item.product_name,
    quantity: item.quantity,
    cartons,
    dimensions,
    gross_weight: grossWeight,
    net_weight: netWeight,
    volume,
    is_pending: isPending,
  };
}

/**
 * Calculate packaging summary for multiple products
 * 
 * Property 4: 总重量计算正确性
 * total_gross_weight = sum of (cartons × carton_gross_weight) for each product
 * total_net_weight = sum of (cartons × carton_net_weight) for each product
 */
export function calculatePackaging(items: ProductPackaging[]): PackagingSummary {
  const itemSummaries = items.map(calculateProductPackaging);
  
  const totals = {
    total_cartons: 0,
    total_gross_weight: 0,
    total_net_weight: 0,
    total_volume: 0,
  };

  let hasPending = false;

  for (const item of itemSummaries) {
    if (item.is_pending) {
      hasPending = true;
    }
    if (item.cartons !== null) {
      totals.total_cartons += item.cartons;
    }
    if (item.gross_weight !== null) {
      totals.total_gross_weight += item.gross_weight;
    }
    if (item.net_weight !== null) {
      totals.total_net_weight += item.net_weight;
    }
    if (item.volume !== null) {
      totals.total_volume += item.volume;
    }
  }

  // Round totals to reasonable precision
  totals.total_gross_weight = Math.round(totals.total_gross_weight * 100) / 100;
  totals.total_net_weight = Math.round(totals.total_net_weight * 100) / 100;
  totals.total_volume = Math.round(totals.total_volume * 100) / 100;  // 保留2位小数

  const text = formatPackagingText({
    items: itemSummaries,
    totals,
    has_pending: hasPending,
    text: '',  // Will be set below
  });

  return {
    items: itemSummaries,
    totals,
    has_pending: hasPending,
    text,
  };
}

/**
 * Format packaging summary as text
 * 
 * Property 5: 包装信息文本包含必要内容
 * For any product list, the text should contain product name, quantity, and cartons
 * 
 * Property 6: 缺少包装规格标注待定
 * For any product without pcs_per_carton, the text should indicate "TBD" or "待定"
 */
export function formatPackagingText(summary: PackagingSummary): string {
  const lines: string[] = [];

  for (const item of summary.items) {
    if (item.is_pending) {
      // Property 6: Mark as pending when packaging info is missing
      lines.push(`${item.product_name}: ${item.quantity} pcs - Packaging TBD / 包装待定`);
    } else {
      let line = `${item.product_name}: ${item.quantity} pcs, ${item.cartons} cartons`;
      if (item.dimensions) {
        line += ` (${item.dimensions})`;
      }
      if (item.gross_weight !== null) {
        line += `, G.W: ${item.gross_weight}kg`;
      }
      if (item.net_weight !== null) {
        line += `, N.W: ${item.net_weight}kg`;
      }
      lines.push(line);
    }
  }

  // Add separator and totals
 
  
  const totalLine = [
    `Total: ${summary.totals.total_cartons} cartons`,
  ];
  
  if (summary.totals.total_gross_weight > 0) {
    totalLine.push(`G.W: ${summary.totals.total_gross_weight}kg`);
  }
  if (summary.totals.total_net_weight > 0) {
    totalLine.push(`N.W: ${summary.totals.total_net_weight}kg`);
  }
  if (summary.totals.total_volume > 0) {
    totalLine.push(`Vol: ${summary.totals.total_volume}m³`);
  }
  
  lines.push(totalLine.join(', '));

  if (summary.has_pending) {
    lines.push('');
    lines.push('* Some products have incomplete packaging information / 部分产品包装信息待定');
  }

  return lines.join('\n');
}

export default {
  calculateCartons,
  calculateVolume,
  formatDimensions,
  calculateProductPackaging,
  calculatePackaging,
  formatPackagingText,
};
