/**
 * Quotation Calculator Service
 * 报价计算服务
 * 
 * Provides calculation functions for quotation pricing, profit margins,
 * mold cost amortization, and Incoterm-related costs.
 */

// ============================================================================
// Types
// ============================================================================

export type MoldChargeMethod = 'one_time' | 'amortized' | 'first_order_free';
export type MoldOwnership = 'customer' | 'supplier' | 'shared';

export interface QuotationItemInput {
  product_id: string;
  product_name: string;
  quantity: number;
  cost_price: number;
  profit_margin: number;
}

export interface QuotationItemResult {
  product_id: string;
  product_name: string;
  quantity: number;
  cost_price: number;
  profit_margin: number;
  unit_price: number;
  amount: number;
}

export interface MoldItemInput {
  mold_type: string;
  cost: number;
  charge_method: MoldChargeMethod;
  quantity_for_amortization?: number;
}

export interface MoldItemResult extends MoldItemInput {
  cost_per_unit: number;
  total_charge: number;
}

export interface IncotermCostInput {
  incoterm: string;
  base_amount: number;
  freight_cost?: number;
  insurance_rate?: number;
  customs_duty_rate?: number;
  other_costs?: number;
}

export interface IncotermCostBreakdown {
  incoterm: string;
  base_amount: number;
  freight_cost: number;
  insurance_cost: number;
  customs_duty: number;
  other_costs: number;
  total_amount: number;
}

export interface QuotationSummary {
  items_subtotal: number;
   additional_costs: number;
  grand_total: number;
  currency: string;
  item_count: number;
  total_quantity: number;
}

// ============================================================================
// Calculation Functions
// ============================================================================

/**
 * Calculate selling price based on cost and profit margin with exchange rate
 * Formula: selling_price = (cost_price / exchange_rate) * (1 + profit_margin / 100)
 * 
 * 成本价是人民币，需要先转换为目标货币，再加利润
 * 
 * @param costPrice - The cost price of the product (in CNY)
 * @param profitMargin - The profit margin percentage (0-100)
 * @param exchangeRate - Exchange rate (1 target currency = X CNY), default 1
 * @returns The calculated selling price in target currency
 */
export function calculateSellingPrice(
  costPrice: number, 
  profitMargin: number,
  exchangeRate: number = 1
): number {
  if (costPrice < 0) throw new Error('Cost price cannot be negative');
  if (profitMargin < 0) throw new Error('Profit margin cannot be negative');
  if (exchangeRate <= 0) throw new Error('Exchange rate must be positive');
  
  // 先将人民币成本转换为目标货币，再加利润
  const costInTargetCurrency = costPrice / exchangeRate;
  return roundToDecimal(costInTargetCurrency * (1 + profitMargin / 100), 4);
}

/**
 * Calculate profit margin from cost and selling price
 * Formula: profit_margin = ((selling_price - cost_price) / cost_price) * 100
 * 
 * @param costPrice - The cost price of the product
 * @param sellingPrice - The selling price of the product
 * @returns The calculated profit margin percentage
 */
export function calculateProfitMargin(costPrice: number, sellingPrice: number): number {
  if (costPrice <= 0) throw new Error('Cost price must be positive');
  if (sellingPrice < 0) throw new Error('Selling price cannot be negative');
  
  return roundToDecimal(((sellingPrice - costPrice) / costPrice) * 100, 2);
}

/**
 * Calculate mold cost per unit based on charge method
 * 
 * @param moldCost - Total mold cost
 * @param quantity - Quantity for amortization (used for 'amortized' method)
 * @param method - Charge method: 'one_time', 'amortized', or 'first_order_free'
 * @returns Cost per unit
 */
export function calculateMoldCostPerUnit(
  moldCost: number,
  quantity: number,
  method: MoldChargeMethod
): number {
  if (moldCost < 0) throw new Error('Mold cost cannot be negative');
  if (quantity <= 0 && method === 'amortized') {
    throw new Error('Quantity must be positive for amortized method');
  }

  switch (method) {
    case 'one_time':
      // Full cost charged once, not per unit
      return 0;
    case 'amortized':
      // Cost spread across quantity
      return roundToDecimal(moldCost / quantity, 4);
    case 'first_order_free':
      // No charge for first order
      return 0;
    default:
      return 0;
  }
}

/**
 * Calculate total mold charge based on charge method
 * 
 * @param moldCost - Total mold cost
 * @param quantity - Quantity for amortization
 * @param method - Charge method
 * @returns Total charge amount
 */
export function calculateMoldTotalCharge(
  moldCost: number,
  quantity: number,
  method: MoldChargeMethod
): number {
  switch (method) {
    case 'one_time':
      return moldCost;
    case 'amortized':
      return moldCost; // Full cost, but spread per unit
    case 'first_order_free':
      return 0;
    default:
      return moldCost;
  }
}

/**
 * Calculate Incoterm-related costs
 * Different Incoterms include different cost components
 * 
 * @param options - Cost calculation options
 * @returns Cost breakdown by Incoterm
 */
export function calculateIncotermCosts(options: IncotermCostInput): IncotermCostBreakdown {
  const {
    incoterm,
    base_amount,
    freight_cost = 0,
    insurance_rate = 0,
    customs_duty_rate = 0,
    other_costs = 0,
  } = options;

  let includedFreight = 0;
  let includedInsurance = 0;
  let includedDuty = 0;

  // Determine which costs are included based on Incoterm
  switch (incoterm.toUpperCase()) {
    case 'EXW': // Ex Works - buyer bears all costs
      break;
    case 'FCA': // Free Carrier - seller delivers to carrier
    case 'FAS': // Free Alongside Ship
    case 'FOB': // Free On Board - seller pays to load on ship
      // No freight, insurance, or duty included
      break;
    case 'CFR': // Cost and Freight
    case 'CPT': // Carriage Paid To
      includedFreight = freight_cost;
      break;
    case 'CIF': // Cost, Insurance and Freight
    case 'CIP': // Carriage and Insurance Paid To
      includedFreight = freight_cost;
      includedInsurance = roundToDecimal((base_amount + freight_cost) * (insurance_rate / 100), 2);
      break;
    case 'DAP': // Delivered at Place
    case 'DPU': // Delivered at Place Unloaded
      includedFreight = freight_cost;
      includedInsurance = roundToDecimal((base_amount + freight_cost) * (insurance_rate / 100), 2);
      break;
    case 'DDP': // Delivered Duty Paid - seller bears all costs
      includedFreight = freight_cost;
      includedInsurance = roundToDecimal((base_amount + freight_cost) * (insurance_rate / 100), 2);
      includedDuty = roundToDecimal(base_amount * (customs_duty_rate / 100), 2);
      break;
    default:
      // Unknown Incoterm, include no additional costs
      break;
  }

  const total_amount = roundToDecimal(
    base_amount + includedFreight + includedInsurance + includedDuty + other_costs,
    2
  );

  return {
    incoterm,
    base_amount,
    freight_cost: includedFreight,
    insurance_cost: includedInsurance,
    customs_duty: includedDuty,
    other_costs,
    total_amount,
  };
}

/**
 * Calculate quotation item with pricing
 * 
 * @param item - Item input with cost and margin
 * @returns Calculated item with unit price and amount
 */
export function calculateQuotationItem(item: QuotationItemInput): QuotationItemResult {
  const unit_price = calculateSellingPrice(item.cost_price, item.profit_margin);
  const amount = roundToDecimal(unit_price * item.quantity, 2);

  return {
    ...item,
    unit_price,
    amount,
  };
}

/**
 * Calculate mold item with charges
 * 
 * @param item - Mold item input
 * @returns Calculated mold item with per-unit cost and total charge
 */
export function calculateMoldItem(item: MoldItemInput): MoldItemResult {
  const quantity = item.quantity_for_amortization || 1;
  const cost_per_unit = calculateMoldCostPerUnit(item.cost, quantity, item.charge_method);
  const total_charge = calculateMoldTotalCharge(item.cost, quantity, item.charge_method);

  return {
    ...item,
    cost_per_unit,
    total_charge,
  };
}

/**
 * Calculate complete quotation total
 * 
 * @param items - Array of quotation items
  * @param additionalCosts - Additional costs (freight, etc.)
 * @param currency - Currency code
 * @returns Quotation summary
 */
export function calculateQuotationTotal(
  items: QuotationItemInput[],
   additionalCosts: number = 0,
  currency: string = 'USD'
): QuotationSummary {
  // Calculate items
  const calculatedItems = items.map(calculateQuotationItem);
  const items_subtotal = roundToDecimal(
    calculatedItems.reduce((sum, item) => sum + item.amount, 0),
    2
  );
  const total_quantity = calculatedItems.reduce((sum, item) => sum + item.quantity, 0);

 

  // Calculate grand total
  const grand_total = roundToDecimal(items_subtotal +   additionalCosts, 2);

  return {
    items_subtotal,
   
    additional_costs: additionalCosts,
    grand_total,
    currency,
    item_count: items.length,
    total_quantity,
  };
}

/**
 * Apply global profit margin to all items
 * 
 * @param items - Array of quotation items
 * @param globalMargin - Global profit margin to apply
 * @returns Items with updated profit margins
 */
export function applyGlobalProfitMargin(
  items: QuotationItemInput[],
  globalMargin: number
): QuotationItemResult[] {
  return items.map(item => calculateQuotationItem({
    ...item,
    profit_margin: globalMargin,
  }));
}

/**
 * Calculate break-even price (cost price with 0% margin)
 * 
 * @param costPrice - The cost price
 * @returns Break-even selling price
 */
export function calculateBreakEvenPrice(costPrice: number): number {
  return calculateSellingPrice(costPrice, 0);
}

/**
 * Calculate target cost from selling price and desired margin
 * Formula: cost = selling_price / (1 + margin / 100)
 * 
 * @param sellingPrice - Target selling price
 * @param profitMargin - Desired profit margin percentage
 * @returns Maximum cost price to achieve margin
 */
export function calculateTargetCost(sellingPrice: number, profitMargin: number): number {
  if (sellingPrice < 0) throw new Error('Selling price cannot be negative');
  if (profitMargin < 0) throw new Error('Profit margin cannot be negative');
  
  return roundToDecimal(sellingPrice / (1 + profitMargin / 100), 4);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Round a number to specified decimal places
 */
function roundToDecimal(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// ============================================================================
// Export
// ============================================================================

export const quotationCalculator = {
  calculateSellingPrice,
  calculateProfitMargin,
  calculateMoldCostPerUnit,
  calculateMoldTotalCharge,
  calculateIncotermCosts,
  calculateQuotationItem,
  calculateMoldItem,
  calculateQuotationTotal,
  applyGlobalProfitMargin,
  calculateBreakEvenPrice,
  calculateTargetCost,
};

export default quotationCalculator;
