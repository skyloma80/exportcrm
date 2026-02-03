/**
 * Dashboard Types
 * 
 * Type definitions for dashboard components and data
 */

import { Task } from '@/lib/pocketbase/services/tasks';
import { Order, OrderPayment } from '@/lib/pocketbase/services/orders';

// ============================================================================
// Time Range Types
// ============================================================================

export type TimeRange = '7d' | '30d' | '3m';

// ============================================================================
// KPI Types
// ============================================================================

export interface KPIValue {
  current: number;
  previous: number;
}

export interface KPIStats {
  revenue: KPIValue;
  orders: KPIValue;
  rfqs: KPIValue;
  tasks: {
    pending: number;
    overdue: number;
  };
}

// ============================================================================
// Chart Types
// ============================================================================

export interface ChartDataPoint {
  date: string;
  amount: number;
  label?: string;
}

// ============================================================================
// Tab Types
// ============================================================================

export type TabType = 'tasks' | 'orders' | 'payments' | 'shipments';

export interface ShipmentSummary {
  id: string;
  code: string;
  order: string;
  orderCode?: string;
  customerName?: string;
  status: string;
  etd?: string;
  eta?: string;
}

export interface PaymentSummary {
  id: string;
  order: string;
  orderCode?: string;
  customerName?: string;
  type: string;
  amount: number;
  currency: string;
  payment_date: string;
  status: string;
}

export interface OrderSummary {
  id: string;
  code: string;
  customerName?: string;
  total_amount: number;
  currency: string;
  status: string;
  created: string;
}

export interface TaskSummary {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date?: string;
  assigneeName?: string;
}

// ============================================================================
// Dashboard Data Types
// ============================================================================

export interface DashboardData {
  kpiStats: KPIStats;
  chartData: ChartDataPoint[];
  tasks: TaskSummary[];
  orders: OrderSummary[];
  payments: PaymentSummary[];
  shipments: ShipmentSummary[];
}
