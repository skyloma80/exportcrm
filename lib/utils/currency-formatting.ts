/**
 * 货币格式化工具函数
 * Currency Formatting Utilities
 * 
 * 提供统一的货币显示格式化功能，支持不同的精度要求
 */

// 货币符号映射
const currencySymbols: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CNY: '¥',
  JPY: '¥',
  RMB: '¥',
};

/**
 * 格式化单价 - 保留4位小数
 * Format unit price with 4 decimal places
 */
export function formatUnitPrice(amount: number, currency: string = 'USD'): string {
  const symbol = currencySymbols[currency] || currency;
  return `${symbol}${amount.toLocaleString('en-US', { 
    minimumFractionDigits: 4, 
    maximumFractionDigits: 4 
  })}`;
}

/**
 * 格式化金额 - 保留2位小数
 * Format amount with 2 decimal places
 */
export function formatAmount(amount: number, currency: string = 'USD'): string {
  const symbol = currencySymbols[currency] || currency;
  return `${symbol}${amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

/**
 * 格式化带货币代码的金额 - 保留2位小数
 * Format amount with currency code and 2 decimal places
 */
export function formatAmountWithCode(amount: number, currency: string = 'USD'): string {
  return `${currency} ${amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

/**
 * 格式化成本价 - 保留2位小数，使用人民币符号
 * Format cost price with 2 decimal places, using CNY symbol
 */
export function formatCostPrice(amount: number): string {
  return `¥${amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

/**
 * 格式化百分比
 * Format percentage value
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * 格式化数量 - 不保留小数
 * Format quantity without decimals
 */
export function formatQuantity(quantity: number): string {
  return quantity.toLocaleString('en-US', {
    maximumFractionDigits: 0
  });
}

// 导出默认的通用格式化函数（向后兼容）
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return formatAmount(amount, currency);
}

export default {
  formatUnitPrice,
  formatAmount,
  formatAmountWithCode,
  formatCostPrice,
  formatPercentage,
  formatQuantity,
  formatCurrency
};