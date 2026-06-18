/**
 * Order Hooks
 * 销售订单 React Hooks
 * 
 * Provides React hooks for order data fetching and mutations.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPocketBase } from '@/lib/pocketbase/auth';
import type { 
  Order, 
  OrderWithExpand,
  OrderItem,
  OrderItemWithExpand,
  OrderPayment,
  OrderStatus,
} from '@/lib/pocketbase/services/orders';

// ============================================================================
// Types
// ============================================================================

interface UseOrdersOptions {
  projectId?: string;
  customerId?: string;
  status?: OrderStatus;
  page?: number;
  perPage?: number;
}

interface UseOrdersResult {
  orders: OrderWithExpand[];
  totalItems: number;
  totalPages: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface UseOrderResult {
  order: OrderWithExpand | null;
  items: OrderItemWithExpand[];
  payments: OrderPayment[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch orders list with filtering and pagination
 */
export function useOrders(options: UseOrdersOptions = {}): UseOrdersResult {
  const { projectId, customerId, status, page = 1, perPage = 20 } = options;
  
  const [orders, setOrders] = useState<OrderWithExpand[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const pb = getPocketBase();
      
      // Build filter
      const filters: string[] = [];
      if (projectId) filters.push(`project = "${projectId}"`);
      if (customerId) filters.push(`customer = "${customerId}"`);
      if (status) filters.push(`status = "${status}"`);
      
      const filter = filters.length > 0 ? filters.join(' && ') : '';

      const result = await pb.collection('so').getList<OrderWithExpand>(page, perPage, {
        filter,
        sort: '-id',
        expand: 'project,customer',
      });

      setOrders(result.items);
      setTotalItems(result.totalItems);
      setTotalPages(result.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch orders'));
    } finally {
      setIsLoading(false);
    }
  }, [projectId, customerId, status, page, perPage]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    totalItems,
    totalPages,
    isLoading,
    error,
    refetch: fetchOrders,
  };
}

/**
 * Hook to fetch a single order with details
 */
export function useOrder(id: string | null): UseOrderResult {
  const [order, setOrder] = useState<OrderWithExpand | null>(null);
  const [items, setItems] = useState<OrderItemWithExpand[]>([]);
   const [payments, setPayments] = useState<OrderPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!id) {
      setOrder(null);
      setItems([]); 
      setPayments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const pb = getPocketBase();
      
      // Fetch order with expand
      const result = await pb.collection('so').getOne<OrderWithExpand>(id, {
        expand: 'project,customer,quotation,order_items_via_order,order_items_via_order.product,order_payments_via_order',
      });

      setOrder(result);
      setItems(result.expand?.order_items_via_order || []);
       setPayments(result.expand?.order_payments_via_order || []);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch order'));
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  return {
    order,
    items, 
    payments,
    isLoading,
    error,
    refetch: fetchOrder,
  };
}

/**
 * Hook to fetch all orders (no pagination)
 */
export function useAllOrders(options: Omit<UseOrdersOptions, 'page' | 'perPage'> = {}) {
  const { projectId, customerId, status } = options;
  
  const [orders, setOrders] = useState<OrderWithExpand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const pb = getPocketBase();
      
      // Build filter
      const filters: string[] = [];
      if (projectId) filters.push(`project = "${projectId}"`);
      if (customerId) filters.push(`customer = "${customerId}"`);
      if (status) filters.push(`status = "${status}"`);
      
      const filter = filters.length > 0 ? filters.join(' && ') : '';

      const result = await pb.collection('so').getFullList<OrderWithExpand>({
        filter,
        sort: '-id',
        expand: 'project,customer',
      });

      setOrders(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch orders'));
    } finally {
      setIsLoading(false);
    }
  }, [projectId, customerId, status]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    isLoading,
    error,
    refetch: fetchOrders,
  };
}

/**
 * Hook for order mutations
 */
export function useOrderMutations() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createOrder = useCallback(async (data: {
    project: string;
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
  }): Promise<Order | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { orderService } = await import('@/lib/pocketbase/services/orders');
      const result = await orderService.createOrder(data);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to create order'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateOrder = useCallback(async (
    id: string,
    data: Partial<Order>
  ): Promise<Order | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { orderService } = await import('@/lib/pocketbase/services/orders');
      const result = await orderService.update(id, data);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to update order'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteOrder = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { orderService } = await import('@/lib/pocketbase/services/orders');
      await orderService.delete(id);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to delete order'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (
    id: string,
    status: OrderStatus
  ): Promise<Order | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { orderService } = await import('@/lib/pocketbase/services/orders');
      const result = await orderService.updateStatus(id, status);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to update status'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const confirmOrder = useCallback(async (id: string): Promise<Order | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { orderService } = await import('@/lib/pocketbase/services/orders');
      const result = await orderService.confirmOrder(id);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to confirm order'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelOrder = useCallback(async (id: string): Promise<Order | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { orderService } = await import('@/lib/pocketbase/services/orders');
      const result = await orderService.cancelOrder(id);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to cancel order'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const copyOrder = useCallback(async (id: string): Promise<Order | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { orderService } = await import('@/lib/pocketbase/services/orders');
      const pb = await import('@/lib/pocketbase/auth');
      const currentUser = pb.getPocketBase().authStore.model?.id;
      const result = await orderService.copyOrder(id, currentUser);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to copy order'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createFromQuotation = useCallback(async (quotationId: string): Promise<Order | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { orderService } = await import('@/lib/pocketbase/services/orders');
      const result = await orderService.createFromQuotation(quotationId);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to create order from quotation'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    createOrder,
    updateOrder,
    deleteOrder,
    updateStatus,
    confirmOrder,
    cancelOrder,
    copyOrder,
    createFromQuotation,
  };
}

/**
 * Hook for order item mutations
 */
export function useOrderItemMutations() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createItem = useCallback(async (data: {
    order: string;
    product: string;
    quantity: number;
    unit_price: number;
  }): Promise<OrderItem | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { orderItemService, orderService } = await import('@/lib/pocketbase/services/orders');
      const result = await orderItemService.createItem(data);
      // Recalculate order total
      await orderService.recalculateTotal(data.order);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to create item'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateItem = useCallback(async (
    id: string,
    orderId: string,
    data: Partial<{
      quantity: number;
      unit_price: number;
    }>
  ): Promise<OrderItem | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { orderItemService, orderService } = await import('@/lib/pocketbase/services/orders');
      const result = await orderItemService.updateItem(id, data);
      // Recalculate order total
      await orderService.recalculateTotal(orderId);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to update item'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteItem = useCallback(async (id: string, orderId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { orderItemService, orderService } = await import('@/lib/pocketbase/services/orders');
      await orderItemService.delete(id);
      // Recalculate order total
      await orderService.recalculateTotal(orderId);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to delete item'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    createItem,
    updateItem,
    deleteItem,
  };
}

/**
 * Hook for order payment mutations
 */
export function useOrderPaymentMutations() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createPayment = useCallback(async (data: {
    order: string;
    type: 'deposit' | 'progress' | 'final';
    amount: number;
    currency: string;
    payment_method?: string;
    payment_date: string;
    bank_reference?: string;
    receipt_file?: string;
  }): Promise<OrderPayment | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { orderPaymentService } = await import('@/lib/pocketbase/services/orders');
      const result = await orderPaymentService.createPayment(data);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to create payment'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const approvePayment = useCallback(async (id: string, approvedBy: string): Promise<OrderPayment | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { orderPaymentService } = await import('@/lib/pocketbase/services/orders');
      const result = await orderPaymentService.approvePayment(id, approvedBy);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to approve payment'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const rejectPayment = useCallback(async (id: string, reason: string): Promise<OrderPayment | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { orderPaymentService } = await import('@/lib/pocketbase/services/orders');
      const result = await orderPaymentService.rejectPayment(id, reason);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to reject payment'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    createPayment,
    approvePayment,
    rejectPayment,
  };
}

export default {
  useOrders,
  useOrder,
  useAllOrders,
  useOrderMutations,
  useOrderItemMutations,
  useOrderPaymentMutations,
};
