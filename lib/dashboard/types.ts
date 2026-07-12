

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

export type TabType =   'orders' | 'payments' | 'shipments';

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


// ============================================================================
// Dashboard Data Types
// ============================================================================

export interface DashboardData {
  kpiStats: KPIStats;
  chartData: ChartDataPoint[];

  orders: OrderSummary[];
  payments: PaymentSummary[];
  shipments: ShipmentSummary[];
}
