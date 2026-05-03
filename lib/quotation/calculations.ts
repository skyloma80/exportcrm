/**
 * 报价单计算工具函数
 * Quotation Calculation Utilities
 */

export interface QuotationItemData {
  id: string
  productId: string
  productCode: string
  productName: string
  productNameCn?: string
  description?: string
  descriptionCn?: string
  partNumber?: string
  unit: string
  quantity: number
  costPrice: number
  profitMargin: number
  unitPrice: number
  amount: number
  // 包装信息
  pcsPerCarton?: number
  cartonDimensions?: string // 格式: "LxWxH cm"
  cartonGrossWeight?: number // kg
  remarks?: string
}

export interface MoldItemData {
  id: string
  moldType: string
  cost: number
  chargeMethod: 'upfront' | 'amortized' | 'first_order_free'
  ownership: 'customer' | 'supplier'
  leadTimeDays?: number
  notes?: string
  includeInPrice?: boolean
}

/**
 * 计算行项目金额
 * Calculate line item amount: quantity × unitPrice
 * **Property 3: Line Item Calculation**
 * **Validates: Requirements 1.5**
 */
export function calculateLineItemAmount(quantity: number, unitPrice: number): number {
  if (quantity < 0 || unitPrice < 0) {
    return 0
  }
  return Math.round(quantity * unitPrice * 100) / 100
}

/**
 * 根据利润率计算单价（支持汇率转换）
 * Calculate unit price from cost price and profit margin with exchange rate
 * Formula: unitPrice = (costPrice / exchangeRate) × (1 + profitMargin / 100)
 * 
 * 成本价是人民币，需要先转换为目标货币，再加利润
 * Cost price is in CNY, convert to target currency first, then add margin
 * 
 * **Property 4: Profit Margin Calculation**
 * **Validates: Requirements 2.2**
 * 
 * @param costPrice - 成本价（人民币）
 * @param profitMargin - 利润率百分比
 * @param exchangeRate - 汇率（1 目标货币 = X 人民币），默认为1（人民币）
 */
export function calculateUnitPriceFromMargin(
  costPrice: number, 
  profitMargin: number,
  exchangeRate: number = 1
): number {
  if (costPrice < 0 || exchangeRate <= 0) {
    return 0
  }
  const margin = Math.max(0, profitMargin)
  // 先将人民币成本转换为目标货币，再加利润
  const costInTargetCurrency = costPrice / exchangeRate
  return Math.round(costInTargetCurrency * (1 + margin / 100) * 100) / 100
}

/**
 * 计算产品小计
 * Calculate subtotal from all items
 * **Property 3: Line Item Calculation**
 * **Validates: Requirements 1.5**
 */
export function calculateSubtotal(items: QuotationItemData[]): number {
  if (!items || items.length === 0) {
    return 0
  }
  const total = items.reduce((sum, item) => sum + (item.amount || 0), 0)
  return Math.round(total * 100) / 100
}

/**
 * 计算费用分解总计
 * Calculate total from cost breakdown fields
 * **Property 6: Cost Breakdown Sum**
 * **Validates: Requirements 3.2**
 */
export function calculateCostBreakdownTotal(costBreakdown: Record<string, number>): number {
  if (!costBreakdown || typeof costBreakdown !== 'object') {
    return 0
  }
  const total = Object.values(costBreakdown).reduce((sum, value) => {
    const numValue = typeof value === 'number' ? value : 0
    return sum + (numValue > 0 ? numValue : 0)
  }, 0)
  return Math.round(total * 100) / 100
}

 
/**
 * 计算总计
 * Calculate grand total: subtotal + costBreakdownTotal + moldCostsTotal
 * **Property 7: Grand Total Calculation**
 * **Validates: Requirements 3.3, 4.2, 4.3**
 */
export function calculateGrandTotal(
  subtotal: number,
  costBreakdownTotal: number,
  moldCostsTotal: number
): number {
  const total = (subtotal || 0) + (costBreakdownTotal || 0) + (moldCostsTotal || 0)
  return Math.round(total * 100) / 100
}

/**
 * 货币转换
 * Convert amount from one currency to another using exchange rates
 * Formula: newAmount = amount × (toRate / fromRate)
 * **Property 8: Currency Conversion**
 * **Validates: Requirements 6.2**
 */
export function convertCurrency(
  amount: number,
  fromRate: number,
  toRate: number
): number {
  if (amount < 0 || fromRate <= 0 || toRate <= 0) {
    return 0
  }
  const converted = amount * (toRate / fromRate)
  return Math.round(converted * 100) / 100
}

/**
 * 批量应用全局利润率（支持汇率转换）
 * Apply global profit margin to all items with cost prices
 * **Property 5: Global Profit Margin Application**
 * **Validates: Requirements 2.3**
 * 
 * @param items - 报价单明细项
 * @param globalMargin - 全局利润率
 * @param exchangeRate - 汇率（1 目标货币 = X 人民币），默认为1
 */
export function applyGlobalProfitMargin(
  items: QuotationItemData[],
  globalMargin: number,
  exchangeRate: number = 1
): QuotationItemData[] {
  return items.map(item => {
    // 只对有成本价的产品应用利润率
    if (item.costPrice > 0) {
      const newUnitPrice = calculateUnitPriceFromMargin(item.costPrice, globalMargin, exchangeRate)
      const newAmount = calculateLineItemAmount(item.quantity, newUnitPrice)
      return {
        ...item,
        profitMargin: globalMargin,
        unitPrice: newUnitPrice,
        amount: newAmount,
      }
    }
    return item
  })
}

/**
 * 根据新汇率重新计算所有明细项的单价和金额
 * Recalculate all items with new exchange rate
 * 
 * @param items - 报价单明细项
 * @param exchangeRate - 新汇率（1 目标货币 = X 人民币）
 */
export function recalculateItemsWithExchangeRate(
  items: QuotationItemData[],
  exchangeRate: number
): QuotationItemData[] {
  return items.map(item => {
    if (item.costPrice > 0) {
      const newUnitPrice = calculateUnitPriceFromMargin(item.costPrice, item.profitMargin, exchangeRate)
      const newAmount = calculateLineItemAmount(item.quantity, newUnitPrice)
      return {
        ...item,
        unitPrice: newUnitPrice,
        amount: newAmount,
      }
    }
    return item
  })
}

/**
 * 计算利润率预览
 * Calculate profit margin preview statistics
 */
export function calculateMarginPreview(
  items: QuotationItemData[],
  globalMargin: number
): {
  totalCost: number
  totalRevenue: number
  totalProfit: number
  profitPercentage: number
  itemsWithCost: number
  itemsWithoutCost: number
} {
  let totalCost = 0
  let totalRevenue = 0
  let itemsWithCost = 0
  let itemsWithoutCost = 0

  items.forEach(item => {
    if (item.costPrice > 0) {
      itemsWithCost++
      const cost = item.costPrice * item.quantity
      const unitPrice = calculateUnitPriceFromMargin(item.costPrice, globalMargin)
      const revenue = unitPrice * item.quantity
      totalCost += cost
      totalRevenue += revenue
    } else {
      itemsWithoutCost++
      totalRevenue += item.amount || 0
    }
  })

  const totalProfit = totalRevenue - totalCost
  const profitPercentage = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    profitPercentage: Math.round(profitPercentage * 100) / 100,
    itemsWithCost,
    itemsWithoutCost,
  }
}
