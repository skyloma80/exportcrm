/**
 * Currency Constants
 * 货币常量
 * 
 * This file contains all supported currencies and their formatting options.
 */

export interface Currency {
  code: string;
  name: string;
  name_cn: string;
  symbol: string;
  decimals: number;
  symbolPosition: 'before' | 'after';
}

export const CURRENCIES: Record<string, Currency> = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    name_cn: '美元',
    symbol: '$',
    decimals: 2,
    symbolPosition: 'before',
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    name_cn: '欧元',
    symbol: '€',
    decimals: 2,
    symbolPosition: 'before',
  },
  CNY: {
    code: 'CNY',
    name: 'Chinese Yuan',
    name_cn: '人民币',
    symbol: '¥',
    decimals: 2,
    symbolPosition: 'before',
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    name_cn: '英镑',
    symbol: '£',
    decimals: 2,
    symbolPosition: 'before',
  },
  JPY: {
    code: 'JPY',
    name: 'Japanese Yen',
    name_cn: '日元',
    symbol: '¥',
    decimals: 0,
    symbolPosition: 'before',
  },
  HKD: {
    code: 'HKD',
    name: 'Hong Kong Dollar',
    name_cn: '港币',
    symbol: 'HK$',
    decimals: 2,
    symbolPosition: 'before',
  },
  SGD: {
    code: 'SGD',
    name: 'Singapore Dollar',
    name_cn: '新加坡元',
    symbol: 'S$',
    decimals: 2,
    symbolPosition: 'before',
  },
  AUD: {
    code: 'AUD',
    name: 'Australian Dollar',
    name_cn: '澳元',
    symbol: 'A$',
    decimals: 2,
    symbolPosition: 'before',
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    name_cn: '加元',
    symbol: 'C$',
    decimals: 2,
    symbolPosition: 'before',
  },
  CHF: {
    code: 'CHF',
    name: 'Swiss Franc',
    name_cn: '瑞士法郎',
    symbol: 'CHF',
    decimals: 2,
    symbolPosition: 'before',
  },
  KRW: {
    code: 'KRW',
    name: 'South Korean Won',
    name_cn: '韩元',
    symbol: '₩',
    decimals: 0,
    symbolPosition: 'before',
  },
  INR: {
    code: 'INR',
    name: 'Indian Rupee',
    name_cn: '印度卢比',
    symbol: '₹',
    decimals: 2,
    symbolPosition: 'before',
  },
  MXN: {
    code: 'MXN',
    name: 'Mexican Peso',
    name_cn: '墨西哥比索',
    symbol: 'MX$',
    decimals: 2,
    symbolPosition: 'before',
  },
  BRL: {
    code: 'BRL',
    name: 'Brazilian Real',
    name_cn: '巴西雷亚尔',
    symbol: 'R$',
    decimals: 2,
    symbolPosition: 'before',
  },
  RUB: {
    code: 'RUB',
    name: 'Russian Ruble',
    name_cn: '俄罗斯卢布',
    symbol: '₽',
    decimals: 2,
    symbolPosition: 'after',
  },
  THB: {
    code: 'THB',
    name: 'Thai Baht',
    name_cn: '泰铢',
    symbol: '฿',
    decimals: 2,
    symbolPosition: 'before',
  },
  MYR: {
    code: 'MYR',
    name: 'Malaysian Ringgit',
    name_cn: '马来西亚林吉特',
    symbol: 'RM',
    decimals: 2,
    symbolPosition: 'before',
  },
  IDR: {
    code: 'IDR',
    name: 'Indonesian Rupiah',
    name_cn: '印尼盾',
    symbol: 'Rp',
    decimals: 0,
    symbolPosition: 'before',
  },
  VND: {
    code: 'VND',
    name: 'Vietnamese Dong',
    name_cn: '越南盾',
    symbol: '₫',
    decimals: 0,
    symbolPosition: 'after',
  },
  PHP: {
    code: 'PHP',
    name: 'Philippine Peso',
    name_cn: '菲律宾比索',
    symbol: '₱',
    decimals: 2,
    symbolPosition: 'before',
  },
  AED: {
    code: 'AED',
    name: 'UAE Dirham',
    name_cn: '阿联酋迪拉姆',
    symbol: 'د.إ',
    decimals: 2,
    symbolPosition: 'before',
  },
  SAR: {
    code: 'SAR',
    name: 'Saudi Riyal',
    name_cn: '沙特里亚尔',
    symbol: '﷼',
    decimals: 2,
    symbolPosition: 'before',
  },
  ZAR: {
    code: 'ZAR',
    name: 'South African Rand',
    name_cn: '南非兰特',
    symbol: 'R',
    decimals: 2,
    symbolPosition: 'before',
  },
  TRY: {
    code: 'TRY',
    name: 'Turkish Lira',
    name_cn: '土耳其里拉',
    symbol: '₺',
    decimals: 2,
    symbolPosition: 'before',
  },
  PLN: {
    code: 'PLN',
    name: 'Polish Zloty',
    name_cn: '波兰兹罗提',
    symbol: 'zł',
    decimals: 2,
    symbolPosition: 'after',
  },
  SEK: {
    code: 'SEK',
    name: 'Swedish Krona',
    name_cn: '瑞典克朗',
    symbol: 'kr',
    decimals: 2,
    symbolPosition: 'after',
  },
  NOK: {
    code: 'NOK',
    name: 'Norwegian Krone',
    name_cn: '挪威克朗',
    symbol: 'kr',
    decimals: 2,
    symbolPosition: 'after',
  },
  DKK: {
    code: 'DKK',
    name: 'Danish Krone',
    name_cn: '丹麦克朗',
    symbol: 'kr',
    decimals: 2,
    symbolPosition: 'after',
  },
  NZD: {
    code: 'NZD',
    name: 'New Zealand Dollar',
    name_cn: '新西兰元',
    symbol: 'NZ$',
    decimals: 2,
    symbolPosition: 'before',
  },
  TWD: {
    code: 'TWD',
    name: 'Taiwan Dollar',
    name_cn: '新台币',
    symbol: 'NT$',
    decimals: 0,
    symbolPosition: 'before',
  },
};

export const CURRENCY_LIST = Object.values(CURRENCIES);

// Common currencies for quick selection
export const COMMON_CURRENCIES = ['USD', 'EUR', 'CNY', 'GBP', 'JPY', 'HKD'] as const;

// Default currency
export const DEFAULT_CURRENCY = 'USD';

/**
 * Format a number as currency
 */
export function formatCurrency(
  amount: number,
  currencyCode: string,
  locale: string = 'en-US'
): string {
  const currency = CURRENCIES[currencyCode];
  
  if (!currency) {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }

  const formattedAmount = amount.toLocaleString(locale, {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  });

  if (currency.symbolPosition === 'before') {
    return `${currency.symbol}${formattedAmount}`;
  } else {
    return `${formattedAmount} ${currency.symbol}`;
  }
}

/**
 * Format currency with code (e.g., "USD 1,234.56")
 */
export function formatCurrencyWithCode(
  amount: number,
  currencyCode: string,
  locale: string = 'en-US'
): string {
  const currency = CURRENCIES[currencyCode];
  
  if (!currency) {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }

  const formattedAmount = amount.toLocaleString(locale, {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  });

  return `${currencyCode} ${formattedAmount}`;
}

/**
 * Get currency by code
 */
export function getCurrency(code: string): Currency | undefined {
  return CURRENCIES[code];
}

/**
 * Check if currency code is valid
 */
export function isValidCurrency(code: string): boolean {
  return code in CURRENCIES;
}

export default CURRENCIES;
