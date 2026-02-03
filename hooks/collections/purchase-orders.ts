/**
 * Purchase Order Collection Hooks
 * 采购订单集合 Hooks
 * 
 * React hooks for Purchase Order data management.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  createCollectionHook,
  createRecordHook,
  createFullListHook,
} from '../use-collection';
import {
  purchaseOrderService,
  purchaseOrderItemService,
    
  purchaseOrderPaymentService,
  type PurchaseOrder,
  type PurchaseOrderItem,
  type PurchaseOrderMoldItem,
  type PurchaseOrderPayment,
  type PurchaseOrderWithExpand,
  type POCreateInput,
  type POItemCreateInput,
  type POMoldItemCreateInput,
  type POStatus,
} from '@/lib/pocketbase/services/purchase-orders';

// ============================================================================
// Basic CRUD Hooks
// ============================================================================

/**
 * Hook for paginated PO list
 */
export const usePurchaseOrders = createCollectionHook(purchaseOrderService);

/**
 * Hook for single PO record
 */
export const usePurchaseOrder = createRecordHook(purchaseOrderService);

/**
 * Hook for all POs (no pagination)
 */
export const useAllPurchaseOrders = createFullListHook(purchaseOrderService);

// ============================================================================
// Extended Hooks
// ============================================================================

/**
 * Hook for PO with full details
 */
export function usePurchaseOrderWithDetails(id: string | undefined) {
  const [data, setData] = useState<PurchaseOrderWithExpand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await purchaseOrderService.getWithDetails(id);
      setData(result);
      return result;
    } catch (e: any) {
      setError(e);
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * Hook for POs by project
 */
export function usePurchaseOrdersByProject(projectId: string | undefined) {
  const [data, setData] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!projectId) {
      setData([]);
      setLoading(false);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const result = await purchaseOrderService.getByProject(projectId);
      setData(result);
      return result;
    } catch (e: any) {
      setError(e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * Hook for POs by supplier
 */
export function usePurchaseOrdersBySupplier(supplierId: string | undefined) {
  const [data, setData] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!supplierId) {
      setData([]);
      setLoading(false);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const result = await purchaseOrderService.getBySupplier(supplierId);
      setData(result);
      return result;
    } catch (e: any) {
      setError(e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * Hook for POs by RFQ
 */
export function usePurchaseOrdersByRFQ(rfqId: string | undefined) {
  const [data, setData] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!rfqId) {
      setData([]);
      setLoading(false);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const result = await purchaseOrderService.getByRFQ(rfqId);
      setData(result);
      return result;
    } catch (e: any) {
      setError(e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [rfqId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * Hook for PO creation
 */
export function useCreatePurchaseOrder() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (data: POCreateInput): Promise<PurchaseOrder | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await purchaseOrderService.createPO(data);
      return result;
    } catch (e: any) {
      setError(e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading, error };
}

/**
 * Hook for PO update
 */
export function useUpdatePurchaseOrder() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(async (id: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await purchaseOrderService.update(id, data);
      return result;
    } catch (e: any) {
      setError(e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (id: string, status: POStatus): Promise<PurchaseOrder | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await purchaseOrderService.updateStatus(id, status);
      return result;
    } catch (e: any) {
      setError(e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { update, updateStatus, loading, error };
}

// ============================================================================
// PO Items Hooks
// ============================================================================

/**
 * Hook for PO items management
 */
export function usePurchaseOrderItems(poId: string | undefined) {
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!poId) {
      setItems([]);
      setLoading(false);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const result = await purchaseOrderItemService.getByPO(poId);
      setItems(result);
      return result;
    } catch (e: any) {
      setError(e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [poId]);

  const addItem = useCallback(async (data: Omit<POItemCreateInput, 'purchase_order'>) => {
    if (!poId) throw new Error('No PO id');
    const result = await purchaseOrderItemService.createItem({ ...data, purchase_order: poId });
    await fetch();
    return result;
  }, [poId, fetch]);

  const updateItem = useCallback(async (itemId: string, data: Partial<PurchaseOrderItem>) => {
    const result = await purchaseOrderItemService.update(itemId, data);
    await fetch();
    return result;
  }, [fetch]);

  const removeItem = useCallback(async (itemId: string) => {
    const result = await purchaseOrderItemService.delete(itemId);
    await fetch();
    return result;
  }, [fetch]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { items, loading, error, refetch: fetch, addItem, updateItem, removeItem };
}

// ============================================================================
// PO Mold Items Hooks
// ============================================================================

 
// ============================================================================
// PO Payments Hooks
// ============================================================================

/**
 * Hook for PO payments
 */
export function usePurchaseOrderPayments(poId: string | undefined) {
  const [payments, setPayments] = useState<PurchaseOrderPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!poId) {
      setPayments([]);
      setLoading(false);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const result = await purchaseOrderPaymentService.getByPO(poId);
      setPayments(result);
      return result;
    } catch (e: any) {
      setError(e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [poId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { payments, loading, error, refetch: fetch };
}

// ============================================================================
// Generate PO from RFQ Hook
// ============================================================================

interface GeneratePOOptions {
  planType: 'single' | 'mixed';
  singleSupplierId?: string;
  aiAnalysis?: {
    item_recommendations: Array<{
      rfq_item_id: string;
      best_supplier_id: string;
      unit_price: number;
    }>;
  };
}

interface GeneratedPO {
  id: string;
  code: string;
  supplier_id: string;
  supplier_name: string;
  total_amount: number;
  items_count: number;
}

interface GeneratePOResult {
  success: boolean;
  message: string;
  orders: GeneratedPO[];
}

/**
 * Hook for generating POs from RFQ
 */
export function useGeneratePOFromRFQ() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generate = useCallback(async (
    rfqId: string,
    options: GeneratePOOptions
  ): Promise<GeneratePOResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/rfqs/${rfqId}/generate-purchase-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate purchase orders');
      }

      return data as GeneratePOResult;
    } catch (e: any) {
      setError(e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, loading, error };
}

// ============================================================================
// Export Types
// ============================================================================

export type {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderMoldItem,
  PurchaseOrderPayment,
  PurchaseOrderWithExpand,
  POCreateInput,
  POItemCreateInput,
  POMoldItemCreateInput,
  POStatus,
};
