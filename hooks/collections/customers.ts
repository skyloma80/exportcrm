/**
 * Customer Collection Hooks
 * 客户集合 Hooks
 * 
 * React hooks for customer data management.
 */

'use client';

import { useState, useCallback } from 'react';
import {
  createCollectionHook,
  createRecordHook,
  createFullListHook,
} from '../use-collection';
import {
  customerService,
  customerContactService,
  type Customer,
  type CustomerContact,
  type CustomerWithContacts,
  type CustomerCreateInput,
  type CustomerUpdateInput,
} from '@/lib/pocketbase/services/customers';

// ============================================================================
// Basic CRUD Hooks
// ============================================================================

/**
 * Hook for paginated customer list
 */
export const useCustomers = createCollectionHook(customerService);

/**
 * Hook for single customer record
 */
export const useCustomer = createRecordHook(customerService);

/**
 * Hook for all customers (no pagination)
 */
export const useAllCustomers = createFullListHook(customerService);

/**
 * Hook for customer contacts
 */
export const useCustomerContacts = createCollectionHook(customerContactService);

// ============================================================================
// Extended Hooks
// ============================================================================

/**
 * Hook for customer with contacts
 */
export function useCustomerWithContacts(id: string | undefined) {
  const [data, setData] = useState<CustomerWithContacts | null>(null);
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
      const result = await customerService.getWithContacts(id);
      setData(result);
      return result;
    } catch (e: any) {
      setError(e);
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Initial fetch
  useState(() => {
    fetch();
  });

  return { data, loading, error, refetch: fetch };
}

/**
 * Hook for customer search
 */
export function useCustomerSearch() {
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    perPage: 50,
    totalPages: 0,
  });

  const search = useCallback(async (query: string, options?: { page?: number; perPage?: number }) => {
    if (!query.trim()) {
      setResults([]);
      return [];
    }
    
    setLoading(true);
    setError(null);
    try {
      const result = await customerService.search(query, options);
      setResults(result.items);
      setPagination({
        total: result.totalItems,
        page: options?.page || 1,
        perPage: options?.perPage || 50,
        totalPages: result.totalPages,
      });
      return result.items;
    } catch (e: any) {
      setError(e);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setPagination({ total: 0, page: 1, perPage: 50, totalPages: 0 });
  }, []);

  return { results, loading, error, pagination, search, clear };
}

/**
 * Hook for customer creation with auto-generated code
 */
export function useCreateCustomer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (data: CustomerCreateInput): Promise<Customer | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await customerService.createCustomer(data);
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
 * Hook for customer update
 */
export function useUpdateCustomer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(async (id: string, data: CustomerUpdateInput): Promise<Customer | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await customerService.updateCustomer(id, data);
      return result;
    } catch (e: any) {
      setError(e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { update, loading, error };
}

/**
 * Hook for customer contacts management
 */
export function useCustomerContactsManager(customerId: string | undefined) {
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!customerId) {
      setContacts([]);
      setLoading(false);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const result = await customerContactService.getByCustomer(customerId);
      setContacts(result);
      return result;
    } catch (e: any) {
      setError(e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  const addContact = useCallback(async (data: Omit<CustomerContact, 'id' | 'customer' | 'created' | 'updated' | 'collectionId' | 'collectionName'>) => {
    if (!customerId) throw new Error('No customer id');
    const result = await customerContactService.createContact(customerId, data);
    await fetch();
    return result;
  }, [customerId, fetch]);

  const updateContact = useCallback(async (contactId: string, data: Partial<CustomerContact>) => {
    const result = await customerContactService.update(contactId, data);
    await fetch();
    return result;
  }, [fetch]);

  const removeContact = useCallback(async (contactId: string) => {
    const result = await customerContactService.delete(contactId);
    await fetch();
    return result;
  }, [fetch]);

  const setPrimary = useCallback(async (contactId: string) => {
    if (!customerId) throw new Error('No customer id');
    await customerContactService.setPrimaryContact(contactId, customerId);
    await fetch();
  }, [customerId, fetch]);

  // Initial fetch
  useState(() => {
    fetch();
  });

  return {
    contacts,
    loading,
    error,
    refetch: fetch,
    addContact,
    updateContact,
    removeContact,
    setPrimary,
  };
}

// ============================================================================
// Export Types
// ============================================================================

export type {
  Customer,
  CustomerContact,
  CustomerWithContacts,
  CustomerCreateInput,
  CustomerUpdateInput,
};
