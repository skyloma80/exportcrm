/**
 * Quotation Hooks
 * 报价单 React Hooks
 * 
 * Provides React hooks for quotation data fetching and mutations.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPocketBase } from '@/lib/pocketbase/auth';
import type { 
  Quotation, 
  QuotationWithExpand,
  QuotationItem,
  QuotationItemWithExpand,
  QuotationStatus,
} from '@/lib/pocketbase/services/quotations';

// ============================================================================
// Types
// ============================================================================

interface UseQuotationsOptions {
  projectId?: string;
  customerId?: string;
  status?: QuotationStatus;
  page?: number;
  perPage?: number;
}

interface UseQuotationsResult {
  quotations: QuotationWithExpand[];
  totalItems: number;
  totalPages: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface UseQuotationResult {
  quotation: QuotationWithExpand | null;
  items: QuotationItemWithExpand[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch quotations list with filtering and pagination
 */
export function useQuotations(options: UseQuotationsOptions = {}): UseQuotationsResult {
  const { projectId, customerId, status, page = 1, perPage = 20 } = options;
  
  const [quotations, setQuotations] = useState<QuotationWithExpand[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchQuotations = useCallback(async () => {
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

      const result = await pb.collection('quotations').getList<QuotationWithExpand>(page, perPage, {
        filter,
        sort: '-id',
        expand: 'project,customer',
      });

      setQuotations(result.items);
      setTotalItems(result.totalItems);
      setTotalPages(result.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch quotations'));
    } finally {
      setIsLoading(false);
    }
  }, [projectId, customerId, status, page, perPage]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  return {
    quotations,
    totalItems,
    totalPages,
    isLoading,
    error,
    refetch: fetchQuotations,
  };
}

/**
 * Hook to fetch a single quotation with details
 */
export function useQuotation(id: string | null): UseQuotationResult {
  const [quotation, setQuotation] = useState<QuotationWithExpand | null>(null);
  const [items, setItems] = useState<QuotationItemWithExpand[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchQuotation = useCallback(async () => {
    if (!id) {
      setQuotation(null);
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const pb = getPocketBase();
      
      // Fetch quotation with expand
      const result = await pb.collection('quotations').getOne<QuotationWithExpand>(id, {
        expand: 'project,customer,quotation_items_via_quotation,quotation_items_via_quotation.product',
      });

      setQuotation(result);
      setItems(result.expand?.quotation_items_via_quotation || []);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch quotation'));
      setQuotation(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuotation();
  }, [fetchQuotation]);

  return {
    quotation,
    items,
    isLoading,
    error,
    refetch: fetchQuotation,
  };
}

/**
 * Hook to fetch all quotations (no pagination)
 */
export function useAllQuotations(options: Omit<UseQuotationsOptions, 'page' | 'perPage'> = {}) {
  const { projectId, customerId, status } = options;
  
  const [quotations, setQuotations] = useState<QuotationWithExpand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchQuotations = useCallback(async () => {
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

      const result = await pb.collection('quotations').getFullList<QuotationWithExpand>({
        filter,
        sort: '-id',
        expand: 'project,customer',
      });

      setQuotations(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch quotations'));
    } finally {
      setIsLoading(false);
    }
  }, [projectId, customerId, status]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  return {
    quotations,
    isLoading,
    error,
    refetch: fetchQuotations,
  };
}

/**
 * Hook for quotation mutations
 */
export function useQuotationMutations() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createQuotation = useCallback(async (data: {
    project: string;
    customer: string;
    incoterm: string;
    port_of_loading?: string;
    port_of_destination?: string;
    payment_terms?: string;
    validity_days?: number;
    global_profit_margin?: number;
    currency: string;
    exchange_rate?: number;
  }): Promise<Quotation | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { quotationService } = await import('@/lib/pocketbase/services/quotations');
      const result = await quotationService.createQuotation(data);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to create quotation'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateQuotation = useCallback(async (
    id: string,
    data: Partial<Quotation>
  ): Promise<Quotation | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { quotationService } = await import('@/lib/pocketbase/services/quotations');
      const result = await quotationService.update(id, data);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to update quotation'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteQuotation = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { quotationService } = await import('@/lib/pocketbase/services/quotations');
      await quotationService.delete(id);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to delete quotation'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (
    id: string,
    status: QuotationStatus
  ): Promise<Quotation | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { quotationService } = await import('@/lib/pocketbase/services/quotations');
      const result = await quotationService.updateStatus(id, status);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to update status'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createRevision = useCallback(async (originalId: string): Promise<Quotation | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { quotationService } = await import('@/lib/pocketbase/services/quotations');
      const result = await quotationService.createRevision(originalId);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to create revision'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const applyGlobalMargin = useCallback(async (
    id: string,
    margin: number
  ): Promise<Quotation | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { quotationService } = await import('@/lib/pocketbase/services/quotations');
      const result = await quotationService.applyGlobalMargin(id, margin);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to apply global margin'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    createQuotation,
    updateQuotation,
    deleteQuotation,
    updateStatus,
    createRevision,
    applyGlobalMargin,
  };
}

/**
 * Hook for quotation item mutations
 */
export function useQuotationItemMutations() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createItem = useCallback(async (data: {
    quotation: string;
    product: string;
    quantity: number;
    cost_price: number;
    profit_margin: number;
    remarks?: string;
  }): Promise<QuotationItem | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { quotationItemService, quotationService } = await import('@/lib/pocketbase/services/quotations');
      const result = await quotationItemService.createItem(data);
      // Recalculate quotation total
      await quotationService.recalculateTotal(data.quotation);
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
    quotationId: string,
    data: Partial<{
      quantity: number;
      cost_price: number;
      profit_margin: number;
      remarks?: string;
    }>
  ): Promise<QuotationItem | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { quotationItemService, quotationService } = await import('@/lib/pocketbase/services/quotations');
      const result = await quotationItemService.updateItem(id, data);
      // Recalculate quotation total
      await quotationService.recalculateTotal(quotationId);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to update item'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteItem = useCallback(async (id: string, quotationId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { quotationItemService, quotationService } = await import('@/lib/pocketbase/services/quotations');
      await quotationItemService.delete(id);
      // Recalculate quotation total
      await quotationService.recalculateTotal(quotationId);
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

export default {
  useQuotations,
  useQuotation,
  useAllQuotations,
  useQuotationMutations,
  useQuotationItemMutations,
};
