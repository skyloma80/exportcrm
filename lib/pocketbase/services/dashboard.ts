/**
 * Dashboard Service
 * 
 * Provides data aggregation for dashboard components
 */

import { getPocketBase } from '../auth';
import { 
  KPIStats, 
  ChartDataPoint, 
  TimeRange,
  OrderSummary,
  PaymentSummary,
  ShipmentSummary 
} from '@/lib/dashboard/types';
import { 
  getTimeRangeStartDate, 
  getPreviousPeriodStartDate,
  aggregateOrdersByTimeRange 
} from '@/lib/dashboard/utils';

class DashboardService {
  private get pb() {
    return getPocketBase();
  }

  /**
   * Get KPI statistics with comparison to previous period
   */
  async getKPIStats(timeRange: TimeRange = '30d'): Promise<KPIStats> {
    const currentStart = getTimeRangeStartDate(timeRange);
    const previousStart = getPreviousPeriodStartDate(timeRange);

    // Fetch all orders and filter client-side
    let currentOrders: any[] = [];
    let previousOrders: any[] = [];
    try {
      const allOrders = await this.pb.collection('so').getFullList({
        batch: 200,
      });
      const now = new Date();
      currentOrders = allOrders.filter((o: any) => {
        const created = new Date(o.created);
        return created >= currentStart && created <= now && o.status !== 'cancelled';
      });
      previousOrders = allOrders.filter((o: any) => {
        const created = new Date(o.created);
        return created >= previousStart && created < currentStart && o.status !== 'cancelled';
      });
    } catch (e: any) {
      console.error('Failed to load orders for KPI:', e?.message || e?.status, e);
    }

    // Fetch all RFQs and filter client-side
    let currentRfqs: any[] = [];
    let previousRfqs: any[] = [];
    try {
      const allRfqs = await this.pb.collection('rfqs').getFullList({
        batch: 200,
      });
      const now = new Date();
      currentRfqs = allRfqs.filter((r: any) => {
        const created = new Date(r.created);
        return created >= currentStart && created <= now;
      });
      previousRfqs = allRfqs.filter((r: any) => {
        const created = new Date(r.created);
        return created >= previousStart && created < currentStart;
      });
    } catch (e) {
      console.error('Failed to load RFQs for KPI:', e);
    }





    return {
       revenue: {
        current: currentOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
        previous: previousOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
      },
      orders: {
        current: currentOrders.length,
        previous: previousOrders.length,
      },
      rfqs: {
        current: currentRfqs.length,
        previous: previousRfqs.length,
      }

    };
  }

  /**
   * Get revenue trend data for chart
   */
  async getRevenueTrend(timeRange: TimeRange): Promise<ChartDataPoint[]> {
    const startDate = getTimeRangeStartDate(timeRange);
    
    try {
      console.log('Fetching orders for revenue trend...');
      const orders = await this.pb.collection('so').getFullList({
        sort: '-created',
        batch: 200,
      });
      console.log('Fetched orders count:', orders.length);
      
      const filtered: { created: string; total_amount: number }[] = orders.filter((o: any) => 
        o.status !== 'cancelled' && new Date(o.created) >= startDate
      ).map((o: any) => ({ created: o.created, total_amount: o.total_amount || 0 }));
      
      return aggregateOrdersByTimeRange(filtered, timeRange);
    } catch (e: any) {
      console.error('Failed to load revenue trend:', {
        message: e?.message,
        status: e?.status,
        originalError: e
      });
      return [];
    }
  }


  /**
   * Get recent orders
   */
  async getRecentOrders(limit: number = 10): Promise<OrderSummary[]> {
    try {
      const orders = await this.pb.collection('so').getList(1, limit, {
        sort: '-created',

      });

      return orders.items.map(o => ({
        id: o.id,
        code: o.code,
        customerName: o.expand?.customer?.name || o.expand?.customer?.name_cn,
        total_amount: o.total_amount,
        currency: o.currency,
        status: o.status,
        created: o.created,
      }));
    } catch (e) {
      console.error('Failed to load recent orders:', e);
      return [];
    }
  }

  /**
   * Get pending payments
   */
  async getPendingPayments(limit: number = 10): Promise<PaymentSummary[]> {
    try {
      const payments = await this.pb.collection('order_payments').getList(1, limit, {
        filter: 'status = "pending"',
        sort: '-payment_date',
        expand: 'order,order.customer',
      });

      return payments.items.map(p => ({
        id: p.id,
        order: p.order,
        orderCode: p.expand?.order?.code,
        customerName: p.expand?.order?.expand?.customer?.name,
        type: p.type,
        amount: p.amount,
        currency: p.currency,
        payment_date: p.payment_date,
        status: p.status,
      }));
    } catch (e) {
      console.error('Failed to load pending payments:', e);
      return [];
    }
  }

  /**
   * Get upcoming shipments
   */
  async getUpcomingShipments(limit: number = 10): Promise<ShipmentSummary[]> {
    try {
      const allShipments = await this.pb.collection('shipments').getFullList({
        sort: 'etd',
        expand: 'order,order.customer',
        batch: 200,
      });

      return allShipments
        .filter((s: any) => s.status !== 'delivered')
        .slice(0, limit)
        .map((s: any) => ({
          id: s.id,
          code: s.code,
          order: s.order,
          orderCode: s.expand?.order?.code,
          customerName: s.expand?.order?.expand?.customer?.name,
          status: s.status,
          etd: s.etd,
          eta: s.eta,
        }));
    } catch (e) {
      console.error('Failed to load upcoming shipments:', e);
      return [];
    }
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
