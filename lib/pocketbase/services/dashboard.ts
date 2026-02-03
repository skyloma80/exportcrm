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
  TaskSummary,
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
    const currentStartStr = currentStart.toISOString();
    const previousStartStr = previousStart.toISOString();

    // Get current period orders
    let currentOrders: any[] = [];
    let previousOrders: any[] = [];
    try {
      currentOrders = await this.pb.collection('orders').getFullList({
        filter: `created >= "${currentStartStr}" && status != "cancelled"`,
      });
      previousOrders = await this.pb.collection('orders').getFullList({
        filter: `created >= "${previousStartStr}" && created < "${currentStartStr}" && status != "cancelled"`,
      });
    } catch (e) {
      console.error('Failed to load orders for KPI:', e);
    }

    // Get current period RFQs
    let currentRfqs: any[] = [];
    let previousRfqs: any[] = [];
    try {
      currentRfqs = await this.pb.collection('rfqs').getFullList({
        filter: `created >= "${currentStartStr}"`,
      });
      previousRfqs = await this.pb.collection('rfqs').getFullList({
        filter: `created >= "${previousStartStr}" && created < "${currentStartStr}"`,
      });
    } catch (e) {
      console.error('Failed to load RFQs for KPI:', e);
    }

    // Get tasks
    let tasks: any[] = [];
    try {
      tasks = await this.pb.collection('tasks').getFullList({
        filter: 'status != "completed" && status != "cancelled"',
      });
    } catch (e) {
      console.error('Failed to load tasks for KPI:', e);
    }

    const now = new Date();
    const overdueTasks = tasks.filter(t => 
      t.due_date && new Date(t.due_date) < now
    );

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
      },
      tasks: {
        pending: tasks.length,
        overdue: overdueTasks.length,
      },
    };
  }

  /**
   * Get revenue trend data for chart
   */
  async getRevenueTrend(timeRange: TimeRange): Promise<ChartDataPoint[]> {
    const startDate = getTimeRangeStartDate(timeRange);
    
    try {
      const orders = await this.pb.collection('orders').getFullList<{ created: string; total_amount: number }>({
        filter: `created >= "${startDate.toISOString()}" && status != "cancelled"`,
        sort: 'created',
      });
      
      return aggregateOrdersByTimeRange(orders, timeRange);
    } catch (e) {
      console.error('Failed to load revenue trend:', e);
      return [];
    }
  }

  /**
   * Get recent tasks (pending/in_progress)
   */
  async getRecentTasks(limit: number = 10): Promise<TaskSummary[]> {
    try {
      // 先检查 tasks 集合是否存在
      const tasks = await this.pb.collection('tasks').getList(1, limit, {
        filter: 'status != "completed" && status != "cancelled"',
        sort: '-created',
      });

      return tasks.items.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        due_date: t.due_date,
        assigneeName: undefined, // assignee expand 可能不可用
      }));
    } catch (e: any) {
      // 如果集合不存在，静默返回空数组
      if (e?.status === 400 || e?.status === 404) {
        console.warn('Tasks collection may not exist yet');
        return [];
      }
      console.error('Failed to load recent tasks:', e);
      return [];
    }
  }

  /**
   * Get recent orders
   */
  async getRecentOrders(limit: number = 10): Promise<OrderSummary[]> {
    try {
      const orders = await this.pb.collection('orders').getList(1, limit, {
        sort: '-created',
        expand: 'customer',
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
      const shipments = await this.pb.collection('shipments').getList(1, limit, {
        filter: 'status != "delivered"',
        sort: 'etd',
        expand: 'order,order.customer',
      });

      return shipments.items.map(s => ({
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
