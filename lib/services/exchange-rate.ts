/**
 * Exchange Rate Service
 * 汇率服务
 * 
 * Provides exchange rate fetching, caching, and conversion functionality.
 * Rates are cached in the database and updated daily.
 */

import { DEFAULT_CURRENCY } from '@/lib/constants/currencies';

// Lazy initialization of PocketBase client to avoid issues during testing
let _pb: ReturnType<typeof import('@/lib/pocketbase/auth').getPocketBase> | null = null;

function getPb() {
  if (!_pb) {
    const { getPocketBase } = require('@/lib/pocketbase/auth');
    _pb = getPocketBase();
  }
  return _pb!;
}

// ============================================================================
// Types
// ============================================================================

export interface ExchangeRateCache {
  id: string;
  base_currency: string;
  target_currency: string;
  rate: number;
  source: string;
  fetched_at: string;
  created: string;
  updated: string;
}

export interface ExchangeRateHistory {
  id: string;
  date: string;
  base_currency: string;
  target_currency: string;
  rate: number;
  source: string;
  created: string;
}

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  updated_at: string;
}

export interface RateHistory {
  date: string;
  rate: number;
}

// ============================================================================
// Constants
// ============================================================================

const CACHE_DURATION_HOURS = 24;
const RATE_API_SOURCE = 'exchangerate-api';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if the cached rate is still valid (less than 24 hours old)
 */
export function isCacheValid(fetchedAt: string): boolean {
  const fetchedDate = new Date(fetchedAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - fetchedDate.getTime()) / (1000 * 60 * 60);
  return hoursDiff < CACHE_DURATION_HOURS;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// ============================================================================
// Exchange Rate Service
// ============================================================================

/**
 * Get the latest exchange rates from cache
 * Returns rates with USD as base currency
 */
export async function getLatestRates(baseCurrency: string = DEFAULT_CURRENCY): Promise<ExchangeRates> {
  const pb = getPb();
  try {
    const cachedRates = await pb.collection('exchange_rate_cache').getList<ExchangeRateCache>(1, 100, {
      filter: `base_currency = "${baseCurrency}"`,
      sort: '-fetched_at',
    });

    const rates: Record<string, number> = {};
    let latestFetchedAt = '';

    for (const rate of cachedRates.items) {
      rates[rate.target_currency] = rate.rate;
      if (!latestFetchedAt || rate.fetched_at > latestFetchedAt) {
        latestFetchedAt = rate.fetched_at;
      }
    }

    // Always include base currency with rate 1
    rates[baseCurrency] = 1;

    return {
      base: baseCurrency,
      rates,
      updated_at: latestFetchedAt || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching latest rates:', error);
    // Return default rates if fetch fails
    return {
      base: baseCurrency,
      rates: { [baseCurrency]: 1 },
      updated_at: new Date().toISOString(),
    };
  }
}

/**
 * Get exchange rate for a specific currency pair
 */
export async function getRate(from: string, to: string): Promise<number> {
  // Same currency
  if (from === to) {
    return 1;
  }

  const pb = getPb();
  try {
    // Try to get direct rate (even if expired, use it as fallback)
    const directRate = await pb.collection('exchange_rate_cache').getList<ExchangeRateCache>(1, 1, {
      filter: `base_currency = "${from}" && target_currency = "${to}"`,
    });

    if (directRate.items.length > 0) {
      return directRate.items[0].rate;
    }

    // Try to get inverse rate (even if expired, use it as fallback)
    const inverseRate = await pb.collection('exchange_rate_cache').getList<ExchangeRateCache>(1, 1, {
      filter: `base_currency = "${to}" && target_currency = "${from}"`,
    });

    if (inverseRate.items.length > 0) {
      return 1 / inverseRate.items[0].rate;
    }

    // Try to calculate via CNY (as CNY is a common base in this system)
    if (from !== 'CNY' && to !== 'CNY') {
      try {
        const fromToCny = await getRate(from, 'CNY');
        const cnyToTo = await getRate('CNY', to);
        if (fromToCny !== 1 && cnyToTo !== 1) {
          return fromToCny * cnyToTo;
        }
      } catch (e) {
        // Fallback to USD check
      }
    }

    // Try to calculate via USD
    if (from !== 'USD' && to !== 'USD') {
      const fromToUsd = await getRate(from, 'USD');
      const usdToTo = await getRate('USD', to);
      if (fromToUsd !== 1 && usdToTo !== 1) {
        return fromToUsd * usdToTo;
      }
    }

    // Return 1 as fallback (should trigger rate update)
    console.warn(`No rate found for ${from} to ${to}, falling back to 1:1`);
    return 1;
  } catch (error) {
    console.error(`Error getting rate for ${from} to ${to}:`, error);
    return 1;
  }
}

/**
 * Convert an amount from one currency to another
 */
export async function convert(amount: number, from: string, to: string): Promise<number> {
  if (from === to) {
    return amount;
  }

  const rate = await getRate(from, to);
  return amount * rate;
}

/**
 * Get exchange rate history for a currency pair
 */
export async function getRateHistory(
  from: string,
  to: string,
  days: number = 30
): Promise<RateHistory[]> {
  const pb = getPb();
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const history = await pb.collection('exchange_rate_history').getList<ExchangeRateHistory>(1, days, {
      filter: `base_currency = "${from}" && target_currency = "${to}" && date >= "${startDateStr}"`,
      sort: 'date',
    });

    return history.items.map((item: ExchangeRateHistory) => ({
      date: item.date.split('T')[0],
      rate: item.rate,
    }));
  } catch (error) {
    console.error(`Error getting rate history for ${from} to ${to}:`, error);
    return [];
  }
}

/**
 * Check if rates need to be updated (more than 24 hours since last update)
 */
export async function shouldUpdate(): Promise<boolean> {
  const pb = getPb();
  try {
    const latestRate = await pb.collection('exchange_rate_cache').getList<ExchangeRateCache>(1, 1, {
      sort: '-fetched_at',
    });

    if (latestRate.items.length === 0) {
      return true;
    }

    return !isCacheValid(latestRate.items[0].fetched_at);
  } catch (error) {
    console.error('Error checking if rates need update:', error);
    return true;
  }
}

/**
 * Update exchange rates in the cache
 * This should be called by a scheduled job or on first access
 */
export async function updateRates(
  rates: Record<string, number>,
  baseCurrency: string = DEFAULT_CURRENCY,
  source: string = RATE_API_SOURCE
): Promise<void> {
  const pb = getPb();
  const now = new Date().toISOString();
  const today = getTodayDate();

  try {
    for (const [targetCurrency, rate] of Object.entries(rates)) {
      if (targetCurrency === baseCurrency) continue;

      // Update or create cache entry
      const existing = await pb.collection('exchange_rate_cache').getList<ExchangeRateCache>(1, 1, {
        filter: `base_currency = "${baseCurrency}" && target_currency = "${targetCurrency}"`,
      });

      if (existing.items.length > 0) {
        await pb.collection('exchange_rate_cache').update(existing.items[0].id, {
          rate,
          source,
          fetched_at: now,
        });
      } else {
        await pb.collection('exchange_rate_cache').create({
          base_currency: baseCurrency,
          target_currency: targetCurrency,
          rate,
          source,
          fetched_at: now,
        });
      }

      // Add to history (one entry per day)
      const existingHistory = await pb.collection('exchange_rate_history').getList<ExchangeRateHistory>(1, 1, {
        filter: `date ~ "${today}" && base_currency = "${baseCurrency}" && target_currency = "${targetCurrency}"`,
      });

      if (existingHistory.items.length === 0) {
        await pb.collection('exchange_rate_history').create({
          date: now,
          base_currency: baseCurrency,
          target_currency: targetCurrency,
          rate,
          source,
        });
      }
    }
  } catch (error) {
    console.error('Error updating rates:', error);
    throw error;
  }
}

/**
 * Fetch rates from external API and update cache
 * Uses exchangerate-api.com as primary source
 */
export async function refreshRates(): Promise<{ success: boolean; source: string; error?: string }> {
  const pb = getPb();
  const today = getTodayDate();

  // 目标货币：美元、欧元、英镑、日元、港币（基于人民币）
  const targetCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'HKD'];

  try {
    // 尝试从 API 获取汇率
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const apiSources = [
      'https://api.exchangerate-api.com/v4/latest/CNY',
      'https://api.exchangerate.host/latest?base=CNY',
    ];

    let apiData: any = null;
    let apiError: Error | null = null;
    let usedSource = '';

    for (const apiUrl of apiSources) {
      try {
        console.log(`尝试从 ${apiUrl} 获取汇率...`);

        const response = await fetch(apiUrl, {
          cache: 'no-store',
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`API 请求失败: ${response.status}`);
        }

        apiData = await response.json();
        usedSource = apiUrl.includes('exchangerate-api') ? 'exchangerate-api.com' : 'exchangerate.host';
        console.log('成功从 API 获取汇率');
        break;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          apiError = new Error('API 请求超时（30秒）');
        } else {
          apiError = error;
        }
        continue;
      }
    }

    clearTimeout(timeoutId);

    if (!apiData || !apiData.rates) {
      throw apiError || new Error('所有汇率 API 都失败');
    }

    // 保存汇率到数据库
    const now = new Date().toISOString();

    for (const currency of targetCurrencies) {
      const rate = apiData.rates[currency];
      if (!rate) continue;

      try {
        // 更新或创建缓存
        const existing = await pb.collection('exchange_rate_cache').getList<ExchangeRateCache>(1, 1, {
          filter: `base_currency = "CNY" && target_currency = "${currency}"`,
        });

        if (existing.items.length > 0) {
          await pb.collection('exchange_rate_cache').update(existing.items[0].id, {
            rate,
            source: usedSource,
            fetched_at: now,
          });
        } else {
          await pb.collection('exchange_rate_cache').create({
            base_currency: 'CNY',
            target_currency: currency,
            rate,
            source: usedSource,
            fetched_at: now,
          });
        }

        // 添加历史记录（每天一条）
        const existingHistory = await pb.collection('exchange_rate_history').getList<ExchangeRateHistory>(1, 1, {
          filter: `date ~ "${today}" && base_currency = "CNY" && target_currency = "${currency}"`,
        });

        if (existingHistory.items.length === 0) {
          await pb.collection('exchange_rate_history').create({
            date: now,
            base_currency: 'CNY',
            target_currency: currency,
            rate,
            source: usedSource,
          });
        }
      } catch (error) {
        console.error(`保存 ${currency} 汇率失败:`, error);
      }
    }

    return { success: true, source: usedSource };
  } catch (error: any) {
    console.error('刷新汇率失败:', error);
    return { success: false, source: 'none', error: error.message };
  }
}

/**
 * Get current exchange rates for dashboard display
 * Returns rates for USD, EUR, GBP, JPY, HKD based on CNY
 */
export async function getDashboardRates(): Promise<{
  rates: Array<{
    currency: string;
    rate: number | null;
    change1d: number | null;
    updatedAt: string | null;
  }>;
  needsUpdate: boolean;
}> {
  const pb = getPb();
  const targetCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'HKD'];
  const rates: Array<{
    currency: string;
    rate: number | null;
    change1d: number | null;
    updatedAt: string | null;
  }> = [];

  let needsUpdate = false;

  for (const currency of targetCurrencies) {
    try {
      // 获取当前汇率
      const current = await pb.collection('exchange_rate_cache').getList<ExchangeRateCache>(1, 1, {
        filter: `base_currency = "CNY" && target_currency = "${currency}"`,
        sort: '-fetched_at',
      });

      if (current.items.length === 0) {
        rates.push({ currency, rate: null, change1d: null, updatedAt: null });
        needsUpdate = true;
        continue;
      }

      const currentRate = current.items[0];

      // 检查是否需要更新
      if (!isCacheValid(currentRate.fetched_at)) {
        needsUpdate = true;
      }

      // 获取昨天的汇率计算变化
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let change1d: number | null = null;

      try {
        const history = await pb.collection('exchange_rate_history').getList<ExchangeRateHistory>(1, 1, {
          filter: `base_currency = "CNY" && target_currency = "${currency}" && date < "${new Date().toISOString().split('T')[0]}"`,
          sort: '-date',
        });

        if (history.items.length > 0) {
          const prevRate = history.items[0].rate;
          change1d = ((currentRate.rate - prevRate) / prevRate) * 100;
        }
      } catch (e) {
        // 忽略历史数据获取失败
      }

      rates.push({
        currency,
        rate: currentRate.rate,
        change1d,
        updatedAt: currentRate.fetched_at,
      });
    } catch (error) {
      rates.push({ currency, rate: null, change1d: null, updatedAt: null });
      needsUpdate = true;
    }
  }

  return { rates, needsUpdate };
}

/**
 * Get rate with automatic refresh if needed
 */
export async function getRateWithRefresh(from: string, to: string): Promise<number> {
  const needsUpdate = await shouldUpdate();

  if (needsUpdate) {
    try {
      await refreshRates();
    } catch (error) {
      console.error('Failed to refresh rates:', error);
    }
  }

  return getRate(from, to);
}

// ============================================================================
// Export Service
// ============================================================================

export const exchangeRateService = {
  getLatestRates,
  getRate,
  convert,
  getRateHistory,
  shouldUpdate,
  updateRates,
  refreshRates,
  getRateWithRefresh,
  isCacheValid,
  getDashboardRates,
};

export default exchangeRateService;
