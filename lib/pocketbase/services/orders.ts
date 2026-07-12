/**
 * Order Service
 * 销售订单服务
 * 
 * Provides CRUD operations and business logic for order management.
 */

import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';
import { codeGenerator, CODE_PREFIXES, generateOrderCode } from '@/lib/services/code-generator';
import { activityLogService } from './activity-logs';
import { remittanceService } from './remittance';

// ============================================================================
// Types
// ============================================================================

export type OrderStatus =
  | 'draft'
  | 'confirmed'
  | 'in_production'
  | 'ready_to_ship'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type PaymentType = 'deposit' | 'progress' | 'final';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type MoldType = 'die_casting' | 'stamping' | 'injection' | 'cnc_fixture' | 'forging' | 'extrusion';
export type MoldChargeMethod = 'one_time' | 'amortized' | 'first_order_free';
export type MoldOwnership = 'customer' | 'supplier' | 'shared';

// Valid status transitions
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['in_production', 'cancelled'],
  in_production: ['ready_to_ship', 'cancelled'],
  ready_to_ship: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: ['draft'], // Allow reactivation to draft
};


export interface Order extends RecordModel {
  code: string;
  project?: string;
  customer: string;
  quotation?: string;
  status: OrderStatus;
  incoterm: string;
  port_of_loading?: string;
  port_of_destination?: string;
  payment_terms?: string;
  currency: string;
  exchange_rate?: number;
  total_amount: number;
  paid_amount: number;
  expected_delivery_date?: string;
  // Trade fields for PI
  country_of_origin?: string;
  country_of_destination?: string;
  mode_of_shipment?: string;
  items?: any[];  // JSON items
  // PI-related fields - 存为 JSON 字符串
  bank_info?: string;
  shipping_marks?: string;
  estimated_shipping_date?: string;
  remarks?: string;  // 备注（包含包装信息等）
  customer_po?: string;
  vendor_code?: string;
  created_by?: string;
  updated_by?: string;
}



export interface OrderPayment extends RecordModel {
  order: string;
  customer_id?: string;
  project_id?: string;
  type: PaymentType;
  amount: number;
  currency: string;
  payment_method?: string;
  payment_date: string;
  bank_reference?: string;
  receipt_file?: string;
  status: PaymentStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
}

export interface OrderWithExpand extends Order {
  expand?: {
    project?: {
      id: string;
      code: string;
      name: string;
      name_cn?: string;
      customer: string;
    };
    customer?: {
      id: string;
      code: string;
      name: string;
      name_cn?: string;
      preferred_currency?: string;
    };
    created_by?: {
      id: string;
      name: string;
      email: string;
    };
    updated_by?: {
      id: string;
      name: string;
      email: string;
    };
    quotation?: {
      id: string;
      code: string;
      version: number;
    };
    order_payments_via_order?: OrderPayment[];
    shipments_via_order?: any[];
    order_purchase_orders_via_order?: any[];
  };
}

export interface OrderCreateInput {
  project?: string;
  customer: string;
  customer_name: string;
  quotation?: string;
  incoterm: string;
  port_of_loading?: string;
  port_of_destination?: string;
  payment_terms?: string;
  currency: string;
  exchange_rate?: number;
  expected_delivery_date?: string;
  // Trade fields for PI
  country_of_origin?: string;
  country_of_destination?: string;
  mode_of_shipment?: string;
  // PI-related fields - 存为 JSON 字符串，取出时需解析
  bank_info?: string;
  shipping_marks?: string;
  estimated_shipping_date?: string;
  remarks?: string;  // 备注（包含包装信息等）
  customer_po?: string;
  vendor_code?: string;
}



export interface OrderPaymentCreateInput {
  order: string;
  customer_id?: string;
  project_id?: string;
  type: PaymentType;
  amount: number;
  currency: string;
  payment_method?: string;
  payment_date: string;
  bank_reference?: string;
  receipt_file?: string;
}

// ============================================================================
// Order Service
// ============================================================================

class OrderService extends BaseCollectionService<Order> {
  constructor() {
    super('so');
  }

  /**
   * Generate a new order code in compact format: A{YY}{XXXX}
   */
  async generateCode(): Promise<string> {
    return generateOrderCode();
  }



  /**
   * Get order with full details
   */
  async getWithDetails(id: string): Promise<OrderWithExpand | null> {
    try {
      const order = await this.pb.collection('so').getOne<OrderWithExpand>(id, {
        expand: 'project,customer,quotation,order_payments_via_order',
      });
      return order;
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  /**
   * Get paginated orders with expand
   */
  async getListWithExpand(page: number = 1, perPage: number = 50, filter: string = ''): Promise<{ items: OrderWithExpand[], totalItems: number }> {
    const result = await this.pb.collection('so').getList<OrderWithExpand>(page, perPage, {
      filter,
      sort: '-id',
      expand: 'customer,project',
    });
    return {
      items: result.items,
      totalItems: result.totalItems,
    };
  }

  /**
   * Get orders by project
   */
  async getByProject(projectId: string): Promise<Order[]> {
    return this.getFullList({
      filter: `project = "${projectId}"`,
      sort: '-id',
    });
  }





  /**
   * Create order with auto-generated code
   */
  async createOrder(data: OrderCreateInput, userId?: string, totalAmount?: number): Promise<Order> {
    const code = await this.generateCode();

    // Resolve bank_info: use provided value, or fall back to default Remittance template
    // bank_info 现在是 JSON 字符串格式
    let resolvedBankInfo: string = data.bank_info ?? '[]';
    if (!data.bank_info || data.bank_info === '[]') {
      try {
        const defaultRemittance = await remittanceService.getDefault();
        if (defaultRemittance?.items && defaultRemittance.items.length > 0) {
          resolvedBankInfo = JSON.stringify(defaultRemittance.items);
        }
      } catch (e) {
        console.warn('Could not load default remittance template:', e);
      }
    }

    const orderData: any = {
      ...data,
      code,
      status: 'draft' as OrderStatus,
      total_amount: totalAmount && totalAmount > 0 ? totalAmount : 0.01,
      paid_amount: 0,
      bank_info: resolvedBankInfo,
    };

    // Add created_by if provided
    if (userId) {
      orderData.created_by = userId;
    }

    let order: Order;
    try {
      order = await this.create(orderData);
    } catch (e: any) {
      // Expose PocketBase validation details for debugging
      console.error('PocketBase create order failed:', JSON.stringify(e?.response ?? e, null, 2));
      throw e;
    }

    // Log activity
    try {
      await activityLogService.logCreate('order', order.id, code, userId);
    } catch (e) {
      console.error('Failed to log order creation:', e);
    }

    return order;
  }

  /**
   * Override update method to track who updated the order
   */
  async update(id: string, data: Partial<Order>): Promise<Order> {
    // Try to get user ID from the auth store
    const userId = this.pb.authStore.model?.id;

    // Add updated_by field if we have a user ID
    if (userId) {
      const updateData = {
        ...data,
        updated_by: userId
      };
      return await this.pb.collection(this.collectionName).update<Order>(id, updateData);
    }
    return await this.pb.collection(this.collectionName).update<Order>(id, data);
  }

  /**
   * Create order from quotation
   */
  async createFromQuotation(quotationId: string): Promise<Order> {
    // Import quotation service dynamically to avoid circular dependency
    const { quotationService } = await import('./quotations');

    const quotation = await quotationService.getWithDetails(quotationId);
    if (!quotation) throw new Error('Quotation not found');
    if (quotation.status !== 'accepted') {
      throw new Error('Only accepted quotations can be converted to orders');
    }

    // Get customer name from expanded customer
    const customerName = (quotation as any).expand?.customer?.name || (quotation as any).expand?.customer?.name_cn || '';

    const order = await this.createOrder({
      project: quotation.project,
      customer: quotation.customer,
      customer_name: customerName,
      quotation: quotationId,
      incoterm: quotation.incoterm,
      port_of_loading: quotation.port_of_loading,
      port_of_destination: quotation.port_of_destination,
      payment_terms: quotation.payment_terms,
      currency: quotation.currency,
      exchange_rate: quotation.exchange_rate,
      // Copy country fields from quotation if available (for PI generation)
      country_of_origin: 'CN',
      country_of_destination: '',
      // Set default values for shipment and delivery (for PI generation)
      mode_of_shipment: (quotation.port_of_loading && quotation.port_of_destination) ? 'Sea' : undefined,
      estimated_shipping_date: quotation.delivery_time || undefined,
    });

    // Copy items from quotation JSONB
    const quotationItems = quotation.items || [];
    const orderItems = quotationItems.map(item => ({
      id: item.id || crypto.randomUUID(),
      part_number: item.part_number || '',
      product_name: item.product_name || '',
      description_en: item.description_en || '',
      description_cn: item.description_cn || '',
      quantity: item.quantity,
      unit: item.unit || 'PCS',
      unit_price: item.unit_price,
      amount: item.amount,
      cost_price: item.cost_price || 0,
    }));

    // Update order with items
    await this.update(order.id, { items: orderItems });
    await this.recalculateTotal(order.id);

    return this.getOne(order.id) as Promise<Order>;
  }

  /**
   * Check if status transition is valid
   */
  isValidStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    return STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
  }

  /**
   * Update order status with validation
   */
  async updateStatus(id: string, newStatus: OrderStatus): Promise<Order> {
    const order = await this.getOne(id);
    if (!order) throw new Error('Order not found');

    if (!this.isValidStatusTransition(order.status, newStatus)) {
      throw new Error(`Invalid status transition from ${order.status} to ${newStatus}`);
    }

    const updated = await this.update(id, { status: newStatus });

    // Log status change
    try {
      await activityLogService.logStatusChange('order', id, order.code, order.status, newStatus);
    } catch (e) {
      console.error('Failed to log order status change:', e);
    }

    // Update customer preferred currency when order is confirmed
    if (newStatus === 'confirmed') {
      await this.updateCustomerCurrency(order.customer, order.currency);
      // Auto-update project stage to 'won' when order is confirmed
      if (order.project) {
        await this.updateProjectStage(order.project, 'won');
      }
    }

    return updated;
  }

  /**
   * Update project stage
   */
  private async updateProjectStage(projectId: string, stage: string): Promise<void> {
    try {
      await this.pb.collection('projects').update(projectId, {
        stage,
      });
    } catch (e) {
      // Log but don't fail the order update
      console.error('Failed to update project stage:', e);
    }
  }

  /**
   * Update customer's preferred currency
   */
  private async updateCustomerCurrency(customerId: string, currency: string): Promise<void> {
    try {
      await this.pb.collection('customers').update(customerId, {
        preferred_currency: currency,
      });
    } catch (e) {
      // Log but don't fail the order update
      console.error('Failed to update customer currency:', e);
    }
  }

  /**
   * Confirm order
   */
  async confirmOrder(id: string): Promise<Order> {
    return this.updateStatus(id, 'confirmed');
  }

  /**
   * Cancel order
   */
  async cancelOrder(id: string): Promise<Order> {
    return this.updateStatus(id, 'cancelled');
  }

  /**
   * Delete order if it's in draft status and the current user is the creator
   */
  async deleteOrder(id: string): Promise<boolean> {
    const order = await this.getOne(id);
    if (!order) throw new Error('Order not found');

    // Delete related order payments
    try {
      const orderPayments = await this.pb.collection('order_payments').getFullList({
        filter: `order = "${id}"`
      });

      for (const payment of orderPayments) {
        await this.pb.collection('order_payments').delete(payment.id);
      }
    } catch (e) {
      console.error('Failed to delete related order records:', e);
    }

    // Then delete the order itself
    await this.delete(id);

    // Log activity
    try {
      const pb = this.pb;
      const userId = pb.authStore.model?.id;
      await activityLogService.log({
        action: 'delete',
        entity_type: 'order',
        entity_id: id,
        entity_code: order.code,
        user: userId,
        user_name: pb.authStore.model?.name || pb.authStore.model?.email,
        description: `Deleted order ${order.code}`,
        description_cn: `删除了订单 ${order.code}`,
      });
    } catch (e) {
      console.error('Failed to log order deletion:', e);
    }

    return true;
  }

  /**
   * Recalculate order total
   */
  async recalculateTotal(id: string): Promise<Order> {
    const order = await this.getOne(id);
    if (!order) throw new Error('Order not found');

    const items = order.items || [];
    const itemsTotal = items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
    const roundedTotal = Math.round(itemsTotal * 100) / 100;

    return this.update(id, { total_amount: roundedTotal });
  }

  /**
   * Recalculate paid amount
   */
  async recalculatePaidAmount(id: string): Promise<Order> {
    const payments = await orderPaymentService.getByOrder(id);
    const approvedPayments = payments.filter(p => p.status === 'approved');
    const paidAmount = approvedPayments.reduce((sum, p) => sum + p.amount, 0);
    // Round to 2 decimal places
    const roundedPaidAmount = Math.round(paidAmount * 100) / 100;

    return this.update(id, { paid_amount: roundedPaidAmount });
  }

  /**
   * Get order summary for a project
   */
  async getProjectSummary(projectId: string): Promise<{
    count: number;
    total_amount: number;
    paid_amount: number;
    pending_amount: number;
  }> {
    const orders = await this.getByProject(projectId);
    const activeOrders = orders.filter(o => o.status !== 'cancelled');

    const total_amount = Math.round(activeOrders.reduce((sum, o) => sum + o.total_amount, 0) * 100) / 100;
    const paid_amount = Math.round(activeOrders.reduce((sum, o) => sum + (o.paid_amount || 0), 0) * 100) / 100;

    return {
      count: activeOrders.length,
      total_amount,
      paid_amount,
      pending_amount: Math.round((total_amount - paid_amount) * 100) / 100,
    };
  }

  /**
   * Copy order (create a new order based on existing one)
   */
  async copyOrder(originalId: string, userId?: string): Promise<Order> {
    const original = await this.getWithDetails(originalId);
    if (!original) throw new Error('Original order not found');

    // Create new order
    // Get customer name from expanded customer
    const customerName = original.expand?.customer?.name || original.expand?.customer?.name_cn || original.customer_name || '';

    const newOrder = await this.createOrder({
      project: original.project,
      customer: original.customer,
      customer_name: customerName,
      incoterm: original.incoterm,
      port_of_loading: original.port_of_loading,
      port_of_destination: original.port_of_destination,
      payment_terms: original.payment_terms,
      currency: original.currency,
      exchange_rate: original.exchange_rate,
    }, userId);

    // Copy items from JSON
    const items = original.items || [];
    await this.update(newOrder.id, { items });

    // Recalculate total
    await this.recalculateTotal(newOrder.id);

    return this.getOne(newOrder.id) as Promise<Order>;
  }

  /**
   * Get remaining amount to be paid
   */
  getRemainingAmount(order: Order): number {
    return Math.round((order.total_amount - (order.paid_amount || 0)) * 100) / 100;
  }

  /**
   * Check if order is fully paid
   */
  isFullyPaid(order: Order): boolean {
    return Math.round((order.paid_amount || 0) * 100) >= Math.round(order.total_amount * 100);
  }
}

// ============================================================================
// Order Payment Service
// ============================================================================

class OrderPaymentService extends BaseCollectionService<OrderPayment> {
  constructor() {
    super('order_payments', { sort: '-payment_date' });
  }

  /**
   * Get payments for an order
   */
  async getByOrder(orderId: string): Promise<OrderPayment[]> {
    return this.getFullList({
      filter: `order = "${orderId}"`,
    });
  }

  /**
   * Create payment record
   */
  async createPayment(data: OrderPaymentCreateInput): Promise<OrderPayment> {
    // Validate payment amount
    const order = await orderService.getOne(data.order);
    if (!order) throw new Error('Order not found');

    const remainingAmount = orderService.getRemainingAmount(order);
    if (Math.round(data.amount * 100) > Math.round(remainingAmount * 100)) {
      throw new Error(`Payment amount exceeds remaining balance of ${remainingAmount}`);
    }

    return this.create({
      ...data,
      status: 'pending' as PaymentStatus,
    });
  }

  /**
   * Approve payment
   */
  async approvePayment(id: string, approvedBy: string): Promise<OrderPayment> {
    const payment = await this.getOne(id);
    if (!payment) throw new Error('Payment not found');
    if (payment.status !== 'pending') {
      throw new Error('Only pending payments can be approved');
    }

    const updated = await this.update(id, {
      status: 'approved' as PaymentStatus,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    });

    // Recalculate order paid amount
    await orderService.recalculatePaidAmount(payment.order);

    return updated;
  }

  /**
   * Reject payment
   */
  async rejectPayment(id: string, reason: string): Promise<OrderPayment> {
    const payment = await this.getOne(id);
    if (!payment) throw new Error('Payment not found');
    if (payment.status !== 'pending') {
      throw new Error('Only pending payments can be rejected');
    }

    return this.update(id, {
      status: 'rejected' as PaymentStatus,
      rejection_reason: reason,
    });
  }

  /**
   * Get total approved payments for an order
   */
  async getTotalApprovedPayments(orderId: string): Promise<number> {
    const payments = await this.getByOrder(orderId);
    const total = payments
      .filter(p => p.status === 'approved')
      .reduce((sum, p) => sum + p.amount, 0);
    return Math.round(total * 100) / 100;
  }

  /**
   * Get pending payments for an order
   */
  async getPendingPayments(orderId: string): Promise<OrderPayment[]> {
    return this.getFullList({
      filter: `order = "${orderId}" && status = "pending"`,
    });
  }
}

// ============================================================================
// Export Services
// ============================================================================

export const orderService = new OrderService();
export const orderPaymentService = new OrderPaymentService();

export default orderService;
