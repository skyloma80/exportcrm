/**
 * 贸易常量 Hooks
 * 直接返回常量，无需查询数据库
 */

import {
  PORTS,
  INCOTERMS,
  CURRENCIES,
  PAYMENT_TERMS,
  findPortByCode,
  getPortsByCountry,
  getChinaPorts,
  findIncotermByCode,
  findCurrencyByCode,
  findPaymentTermByCode,
} from '@/lib/constants/trade-constants'

/**
 * 获取港口列表
 */
export function usePorts() {
  return {
    ports: PORTS,
    chinaPorts: getChinaPorts(),
    findByCode: findPortByCode,
    getByCountry: getPortsByCountry,
    loading: false,
  }
}

/**
 * 获取贸易条款列表
 */
export function useIncoterms() {
  return {
    incoterms: INCOTERMS,
    findByCode: findIncotermByCode,
    loading: false,
  }
}

/**
 * 获取货币列表
 */
export function useCurrencies() {
  return {
    currencies: CURRENCIES,
    findByCode: findCurrencyByCode,
    loading: false,
  }
}

/**
 * 获取付款条款列表
 */
export function usePaymentTerms() {
  return {
    paymentTerms: PAYMENT_TERMS,
    findByCode: findPaymentTermByCode,
    loading: false,
  }
}

/**
 * 获取所有贸易常量
 */
export function useAllTradeConstants() {
  return {
    ports: PORTS,
    incoterms: INCOTERMS,
    currencies: CURRENCIES,
    paymentTerms: PAYMENT_TERMS,
    loading: false,
  }
}
