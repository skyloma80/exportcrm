/**
 * RFQ Collection Hooks
 * 询价单集合 Hooks
 * 
 * React hooks for RFQ data management.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  createCollectionHook,
  createRecordHook,
  createFullListHook,
} from '../use-collection';
import {
  rfqService,
  rfqItemService,
  rfqSupplierService,
  rfqQuotationService,
  rfqMoldQuotationService,
  type RFQ,
  type RFQItem,
  type RFQSupplier,
  type RFQQuotation,
  type RFQMoldQuotation,
  type RFQWithExpand,
  type RFQItemWithExpand,
  type RFQSupplierWithExpand,
  type RFQCreateInput,
  type RFQUpdateInput,
  type RFQItemCreateInput,
  type RFQSupplierCreateInput,
  type RFQQuotationCreateInput,
  type RFQMoldQuotationCreateInput,
  type RFQStatus,
  type RFQSupplierStatus,
} from '@/lib/pocketbase/services/rfqs';

// ============================================================================
// Basic CRUD Hooks
// ============================================================================

/**
 * Hook for paginated RFQ list
 */
export const useRFQs = createCollectionHook(rfqService);

/**
 * Hook for single RFQ record
 */
export const useRFQ = createRecordHook(rfqService);

/**
 * Hook for all RFQs (no pagination)
 */
export const useAllRFQs = createFullListHook(rfqService);

// ============================================================================
// Extended Hooks
// ============================================================================

/**
 * Hook for RFQ with full details
 */
export function useRFQWithDetails(id: string | undefined) {
  const [data, setData] = useState<RFQWithExpand | null>(null);
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
      const result = await rfqService.getWithDetails(id);
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
 * Hook for RFQs by project
 */
export function useRFQsByProject(projectId: string | undefined) {
  const [data, setData] = useState<RFQ[]>([]);
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
      const result = await rfqService.getByProject(projectId);
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
 * Hook for RFQ creation
 */
export function useCreateRFQ() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (data: RFQCreateInput): Promise<RFQ | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await rfqService.createRFQ(data);
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
 * Hook for RFQ update
 */
export function useUpdateRFQ() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(async (id: string, data: RFQUpdateInput): Promise<RFQ | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await rfqService.update(id, data);
      return result;
    } catch (e: any) {
      setError(e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (id: string, status: RFQStatus): Promise<RFQ | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await rfqService.updateStatus(id, status);
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
// RFQ Items Hooks
// ============================================================================

/**
 * Hook for RFQ items management
 */
export function useRFQItems(rfqId: string | undefined) {
  const [items, setItems] = useState<RFQItemWithExpand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!rfqId) {
      setItems([]);
      setLoading(false);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const result = await rfqItemService.getByRFQ(rfqId);
      setItems(result);
      return result;
    } catch (e: any) {
      setError(e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [rfqId]);

  const addItem = useCallback(async (data: Omit<RFQItemCreateInput, 'rfq'>) => {
    if (!rfqId) throw new Error('No RFQ id');
    const result = await rfqItemService.createItem({ ...data, rfq: rfqId });
    await fetch();
    return result;
  }, [rfqId, fetch]);

  const updateItem = useCallback(async (itemId: string, data: Partial<RFQItem>) => {
    const result = await rfqItemService.update(itemId, data);
    await fetch();
    return result;
  }, [fetch]);

  const removeItem = useCallback(async (itemId: string) => {
    const result = await rfqItemService.delete(itemId);
    await fetch();
    return result;
  }, [fetch]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { items, loading, error, refetch: fetch, addItem, updateItem, removeItem };
}

// ============================================================================
// RFQ Suppliers Hooks
// ============================================================================

/**
 * Hook for RFQ suppliers management
 */
export function useRFQSuppliers(rfqId: string | undefined) {
  const [suppliers, setSuppliers] = useState<RFQSupplierWithExpand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!rfqId) {
      setSuppliers([]);
      setLoading(false);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const result = await rfqSupplierService.getByRFQ(rfqId);
      setSuppliers(result);
      return result;
    } catch (e: any) {
      setError(e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [rfqId]);

  const addSupplier = useCallback(async (supplierId: string) => {
    if (!rfqId) throw new Error('No RFQ id');
    const result = await rfqSupplierService.addSupplier({ rfq: rfqId, supplier: supplierId });
    await fetch();
    return result;
  }, [rfqId, fetch]);

  const updateSupplierStatus = useCallback(async (id: string, status: RFQSupplierStatus) => {
    const result = await rfqSupplierService.updateStatus(id, status);
    await fetch();
    return result;
  }, [fetch]);

  const removeSupplier = useCallback(async (id: string) => {
    const result = await rfqSupplierService.delete(id);
    await fetch();
    return result;
  }, [fetch]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { suppliers, loading, error, refetch: fetch, addSupplier, updateSupplierStatus, removeSupplier };
}

// ============================================================================
// RFQ Quotations Hooks
// ============================================================================

/**
 * Hook for RFQ quotations
 */
export function useRFQQuotations(rfqId: string | undefined) {
  const [quotations, setQuotations] = useState<RFQQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!rfqId) {
      setQuotations([]);
      setLoading(false);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const result = await rfqQuotationService.getByRFQ(rfqId);
      setQuotations(result);
      return result;
    } catch (e: any) {
      setError(e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [rfqId]);

  const addQuotation = useCallback(async (data: Omit<RFQQuotationCreateInput, 'rfq'>) => {
    if (!rfqId) throw new Error('No RFQ id');
    const result = await rfqQuotationService.createQuotation({ ...data, rfq: rfqId });
    await fetch();
    return result;
  }, [rfqId, fetch]);

  const updateQuotation = useCallback(async (id: string, data: Partial<RFQQuotation>) => {
    const result = await rfqQuotationService.update(id, data);
    await fetch();
    return result;
  }, [fetch]);

  const removeQuotation = useCallback(async (id: string) => {
    const result = await rfqQuotationService.delete(id);
    await fetch();
    return result;
  }, [fetch]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { quotations, loading, error, refetch: fetch, addQuotation, updateQuotation, removeQuotation };
}

/**
 * Hook for RFQ mold quotations
 */
export function useRFQMoldQuotations(rfqId: string | undefined) {
  const [moldQuotations, setMoldQuotations] = useState<RFQMoldQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!rfqId) {
      setMoldQuotations([]);
      setLoading(false);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const result = await rfqMoldQuotationService.getByRFQ(rfqId);
      setMoldQuotations(result);
      return result;
    } catch (e: any) {
      setError(e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [rfqId]);

  const addMoldQuotation = useCallback(async (data: Omit<RFQMoldQuotationCreateInput, 'rfq'>) => {
    if (!rfqId) throw new Error('No RFQ id');
    const result = await rfqMoldQuotationService.createMoldQuotation({ ...data, rfq: rfqId });
    await fetch();
    return result;
  }, [rfqId, fetch]);

  const updateMoldQuotation = useCallback(async (id: string, data: Partial<RFQMoldQuotation>) => {
    const result = await rfqMoldQuotationService.update(id, data);
    await fetch();
    return result;
  }, [fetch]);

  const removeMoldQuotation = useCallback(async (id: string) => {
    const result = await rfqMoldQuotationService.delete(id);
    await fetch();
    return result;
  }, [fetch]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { moldQuotations, loading, error, refetch: fetch, addMoldQuotation, updateMoldQuotation, removeMoldQuotation };
}

/**
 * Hook for quotation comparison
 */
export function useQuotationComparison(rfqId: string | undefined) {
  const [comparison, setComparison] = useState<Awaited<ReturnType<typeof rfqService.getQuotationComparison>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!rfqId) {
      setComparison(null);
      setLoading(false);
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await rfqService.getQuotationComparison(rfqId);
      setComparison(result);
      return result;
    } catch (e: any) {
      setError(e);
      return null;
    } finally {
      setLoading(false);
    }
  }, [rfqId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { comparison, loading, error, refetch: fetch };
}

// ============================================================================
// Export Types
// ============================================================================

export type {
  RFQ,
  RFQItem,
  RFQSupplier,
  RFQQuotation,
  RFQMoldQuotation,
  RFQWithExpand,
  RFQItemWithExpand,
  RFQSupplierWithExpand,
  RFQCreateInput,
  RFQUpdateInput,
  RFQItemCreateInput,
  RFQSupplierCreateInput,
  RFQQuotationCreateInput,
  RFQMoldQuotationCreateInput,
  RFQStatus,
  RFQSupplierStatus,
};
