/**
 * Supplier Collection Hooks
 * 供应商集合 Hooks
 * 
 * React hooks for supplier data management.
 */

'use client';

import { useState, useCallback } from 'react';
import {
  createCollectionHook,
  createRecordHook,
  createFullListHook,
} from '../use-collection';
import {
  supplierService,
  supplierContactService,
  supplierBankAccountService,
  type Supplier,
  type SupplierContact,
  type SupplierBankAccount,
  type SupplierWithRelations,
  type SupplierCreateInput,
  type SupplierUpdateInput,
} from '@/lib/pocketbase/services/suppliers';

// ============================================================================
// Basic CRUD Hooks
// ============================================================================

/**
 * Hook for paginated supplier list
 */
export const useSuppliers = createCollectionHook(supplierService);

/**
 * Hook for single supplier record
 */
export const useSupplier = createRecordHook(supplierService);

/**
 * Hook for all suppliers (no pagination)
 */
export const useAllSuppliers = createFullListHook(supplierService);

/**
 * Hook for supplier contacts
 */
export const useSupplierContacts = createCollectionHook(supplierContactService);

/**
 * Hook for supplier bank accounts
 */
export const useSupplierBankAccounts = createCollectionHook(supplierBankAccountService);


// ============================================================================
// Extended Hooks
// ============================================================================

/**
 * Hook for supplier with contacts and bank accounts
 */
export function useSupplierWithRelations(id: string | undefined) {
  const [data, setData] = useState<SupplierWithRelations | null>(null);
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
      const result = await supplierService.getWithRelations(id);
      setData(result);
      return result;
    } catch (e: any) {
      setError(e);
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  useState(() => {
    fetch();
  });

  return { data, loading, error, refetch: fetch };
}

/**
 * Hook for supplier search
 */
export function useSupplierSearch() {
  const [results, setResults] = useState<Supplier[]>([]);
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
      const result = await supplierService.search(query, options);
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
 * Hook for supplier creation with auto-generated code
 */
export function useCreateSupplier() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (data: SupplierCreateInput): Promise<Supplier | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await supplierService.createSupplier(data);
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
 * Hook for supplier update
 */
export function useUpdateSupplier() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(async (id: string, data: SupplierUpdateInput): Promise<Supplier | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await supplierService.updateSupplier(id, data);
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
 * Hook for supplier contacts management
 */
export function useSupplierContactsManager(supplierId: string | undefined) {
  const [contacts, setContacts] = useState<SupplierContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!supplierId) {
      setContacts([]);
      setLoading(false);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const result = await supplierContactService.getBySupplier(supplierId);
      setContacts(result);
      return result;
    } catch (e: any) {
      setError(e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  const addContact = useCallback(async (data: Omit<SupplierContact, 'id' | 'supplier' | 'created' | 'updated' | 'collectionId' | 'collectionName'>) => {
    if (!supplierId) throw new Error('No supplier id');
    const result = await supplierContactService.createContact(supplierId, data);
    await fetch();
    return result;
  }, [supplierId, fetch]);

  const updateContact = useCallback(async (contactId: string, data: Partial<SupplierContact>) => {
    const result = await supplierContactService.update(contactId, data);
    await fetch();
    return result;
  }, [fetch]);

  const removeContact = useCallback(async (contactId: string) => {
    const result = await supplierContactService.delete(contactId);
    await fetch();
    return result;
  }, [fetch]);

  const setPrimary = useCallback(async (contactId: string) => {
    if (!supplierId) throw new Error('No supplier id');
    await supplierContactService.setPrimaryContact(contactId, supplierId);
    await fetch();
  }, [supplierId, fetch]);

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

/**
 * Hook for supplier bank accounts management
 */
export function useSupplierBankAccountsManager(supplierId: string | undefined) {
  const [accounts, setAccounts] = useState<SupplierBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!supplierId) {
      setAccounts([]);
      setLoading(false);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const result = await supplierBankAccountService.getBySupplier(supplierId);
      setAccounts(result);
      return result;
    } catch (e: any) {
      setError(e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  const addAccount = useCallback(async (data: Omit<SupplierBankAccount, 'id' | 'supplier' | 'created' | 'updated' | 'collectionId' | 'collectionName'>) => {
    if (!supplierId) throw new Error('No supplier id');
    const result = await supplierBankAccountService.createAccount(supplierId, data);
    await fetch();
    return result;
  }, [supplierId, fetch]);

  const updateAccount = useCallback(async (accountId: string, data: Partial<SupplierBankAccount>) => {
    const result = await supplierBankAccountService.update(accountId, data);
    await fetch();
    return result;
  }, [fetch]);

  const removeAccount = useCallback(async (accountId: string) => {
    const result = await supplierBankAccountService.delete(accountId);
    await fetch();
    return result;
  }, [fetch]);

  const setDefault = useCallback(async (accountId: string) => {
    if (!supplierId) throw new Error('No supplier id');
    await supplierBankAccountService.setDefaultAccount(accountId, supplierId);
    await fetch();
  }, [supplierId, fetch]);

  useState(() => {
    fetch();
  });

  return {
    accounts,
    loading,
    error,
    refetch: fetch,
    addAccount,
    updateAccount,
    removeAccount,
    setDefault,
  };
}

// ============================================================================
// Export Types
// ============================================================================

export type {
  Supplier,
  SupplierContact,
  SupplierBankAccount,
  SupplierWithRelations,
  SupplierCreateInput,
  SupplierUpdateInput,
};
