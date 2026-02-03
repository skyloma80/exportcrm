/**
 * Dashboard Utility Functions
 * 
 * Helper functions for dashboard data processing
 */

import { TimeRange, ChartDataPoint } from './types';

// ============================================================================
// Trend Calculation
// ============================================================================

/**
 * Calculate trend percentage between current and previous values
 * Returns percentage change: ((current - previous) / previous) * 100
 * When previous is 0: returns 100 if current > 0, otherwise 0
 */
export function calculateTrendPercentage(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

// ============================================================================
// Date Utilities
// ============================================================================

/**
 * Get start date for a time range
 */
export function getTimeRangeStartDate(timeRange: TimeRange): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  switch (timeRange) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '3m':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

/**
 * Get previous period start date (for comparison)
 */
export function getPreviousPeriodStartDate(timeRange: TimeRange): Date {
  const currentStart = getTimeRangeStartDate(timeRange);
  const periodLength = new Date().getTime() - currentStart.getTime();
  return new Date(currentStart.getTime() - periodLength);
}

// ============================================================================
// Time Range Filtering
// ============================================================================

interface HasCreatedDate {
  created: string;
}

/**
 * Filter records by time range
 */
export function filterByTimeRange<T extends HasCreatedDate>(
  records: T[],
  timeRange: TimeRange
): T[] {
  const startDate = getTimeRangeStartDate(timeRange);
  const endDate = new Date();
  
  return records.filter(record => {
    const recordDate = new Date(record.created);
    return recordDate >= startDate && recordDate <= endDate;
  });
}

// ============================================================================
// Aggregation Functions
// ============================================================================

interface HasAmountAndDate {
  created: string;
  total_amount: number;
}

/**
 * Aggregate orders by time range
 * - 7d: aggregate by day (max 7 points)
 * - 30d: aggregate by week (max 5 points)
 * - 3m: aggregate by month (max 3 points)
 */
export function aggregateOrdersByTimeRange<T extends HasAmountAndDate>(
  orders: T[],
  timeRange: TimeRange
): ChartDataPoint[] {
  const startDate = getTimeRangeStartDate(timeRange);
  const filteredOrders = orders.filter(o => new Date(o.created) >= startDate);
  
  switch (timeRange) {
    case '7d':
      return aggregateByDay(filteredOrders, 7);
    case '30d':
      return aggregateByWeek(filteredOrders, 5);
    case '3m':
      return aggregateByMonth(filteredOrders, 3);
    default:
      return aggregateByDay(filteredOrders, 7);
  }
}

/**
 * Aggregate by day
 */
function aggregateByDay<T extends HasAmountAndDate>(
  orders: T[],
  days: number
): ChartDataPoint[] {
  const result: ChartDataPoint[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayOrders = orders.filter(o => {
      const orderDate = new Date(o.created);
      return orderDate.toISOString().split('T')[0] === dateStr;
    });
    
    const amount = dayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    
    result.push({
      date: dateStr,
      amount,
      label: formatDateLabel(date, 'day'),
    });
  }
  
  return result;
}

/**
 * Aggregate by week
 */
function aggregateByWeek<T extends HasAmountAndDate>(
  orders: T[],
  weeks: number
): ChartDataPoint[] {
  const result: ChartDataPoint[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  for (let i = weeks - 1; i >= 0; i--) {
    const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weekOrders = orders.filter(o => {
      const orderDate = new Date(o.created);
      return orderDate >= weekStart && orderDate < weekEnd;
    });
    
    const amount = weekOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    
    result.push({
      date: weekStart.toISOString().split('T')[0],
      amount,
      label: formatDateLabel(weekStart, 'week'),
    });
  }
  
  return result;
}

/**
 * Aggregate by month
 */
function aggregateByMonth<T extends HasAmountAndDate>(
  orders: T[],
  months: number
): ChartDataPoint[] {
  const result: ChartDataPoint[] = [];
  const now = new Date();
  
  for (let i = months - 1; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    
    const monthOrders = orders.filter(o => {
      const orderDate = new Date(o.created);
      return orderDate >= monthDate && orderDate <= monthEnd;
    });
    
    const amount = monthOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    
    result.push({
      date: monthDate.toISOString().split('T')[0],
      amount,
      label: formatDateLabel(monthDate, 'month'),
    });
  }
  
  return result;
}

/**
 * Format date label based on aggregation type
 */
function formatDateLabel(date: Date, type: 'day' | 'week' | 'month'): string {
  switch (type) {
    case 'day':
      return `${date.getMonth() + 1}/${date.getDate()}`;
    case 'week':
      return `W${getWeekNumber(date)}`;
    case 'month':
      return date.toLocaleDateString('zh-CN', { month: 'short' });
    default:
      return date.toISOString().split('T')[0];
  }
}

/**
 * Get week number of the year
 */
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// ============================================================================
// Navigation Utilities
// ============================================================================

/**
 * Get navigation URL for a tab item
 */
export function getTabItemUrl(tabType: string, itemId: string): string {
  const entityMap: Record<string, string> = {
    tasks: 'tasks',
    orders: 'orders',
    payments: 'payments',
    shipments: 'shipments',
  };
  
  const entity = entityMap[tabType] || tabType;
  return `/${entity}/${itemId}`;
}
