/**
 * Product Collection Hooks
 * 产品集合 Hooks
 * 
 * React hooks for product data management.
 */

'use client';

import { useState, useCallback } from 'react';
import {
  createCollectionHook,
  createRecordHook,
  createFullListHook,
} from '../use-collection';
import {
  productService,
  productCategoryService,
  productMoldService,
  productDocumentService,
  type Product,
  type ProductCategory,
  type ProductMold,
  type ProductDocument,
  type ProductWithRelations,
  type ProductCreateInput,
  type ProductUpdateInput,
} from '@/lib/pocketbase/services/products';

// ============================================================================
// Basic CRUD Hooks
// ============================================================================

export const useProducts = createCollectionHook(productService);
export const useProduct = createRecordHook(productService);
export const useAllProducts = createFullListHook(productService);

export const useProductCategories = createCollectionHook(productCategoryService);
export const useAllProductCategories = createFullListHook(productCategoryService);

export const useProductMolds = createCollectionHook(productMoldService);
export const useProductDocuments = createCollectionHook(productDocumentService);


// ============================================================================
// Extended Hooks
// ============================================================================

export function useProductWithRelations(id: string | undefined) {
  const [data, setData] = useState<ProductWithRelations | null>(null);
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
      const result = await productService.getWithRelations(id);
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

export function useProductSearch() {
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    perPage: 50,
    totalPages: 0,
  });

  const search = useCallback(async (query: string, options?: { page?: number; perPage?: number; categoryId?: string }) => {
    if (!query.trim()) {
      setResults([]);
      return [];
    }
    
    setLoading(true);
    setError(null);
    try {
      const result = await productService.search(query, options);
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

export function useCreateProduct() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (data: ProductCreateInput): Promise<Product | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await productService.createProduct(data);
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

export function useUpdateProduct() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(async (id: string, data: ProductUpdateInput): Promise<Product | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await productService.updateProduct(id, data);
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


export function useProductMoldsManager(productId: string | undefined) {
  const [molds, setMolds] = useState<ProductMold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!productId) {
      setMolds([]);
      setLoading(false);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const result = await productMoldService.getByProduct(productId);
      setMolds(result);
      return result;
    } catch (e: any) {
      setError(e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const addMold = useCallback(async (data: Omit<ProductMold, 'id' | 'code' | 'product' | 'created' | 'updated' | 'collectionId' | 'collectionName'>) => {
    if (!productId) throw new Error('No product id');
    const result = await productMoldService.createMold(productId, data);
    await fetch();
    return result;
  }, [productId, fetch]);

  const updateMold = useCallback(async (moldId: string, data: Partial<ProductMold>) => {
    const result = await productMoldService.update(moldId, data);
    await fetch();
    return result;
  }, [fetch]);

  const removeMold = useCallback(async (moldId: string) => {
    const result = await productMoldService.delete(moldId);
    await fetch();
    return result;
  }, [fetch]);

  useState(() => {
    fetch();
  });

  return { molds, loading, error, refetch: fetch, addMold, updateMold, removeMold };
}

export function useProductDocumentsManager(productId: string | undefined) {
  const [documents, setDocuments] = useState<ProductDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!productId) {
      setDocuments([]);
      setLoading(false);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const result = await productDocumentService.getByProduct(productId);
      setDocuments(result);
      return result;
    } catch (e: any) {
      setError(e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const addDocument = useCallback(async (data: Omit<ProductDocument, 'id' | 'product' | 'created' | 'updated' | 'collectionId' | 'collectionName'>) => {
    if (!productId) throw new Error('No product id');
    const result = await productDocumentService.createDocument(productId, data);
    await fetch();
    return result;
  }, [productId, fetch]);

  const removeDocument = useCallback(async (docId: string) => {
    const result = await productDocumentService.delete(docId);
    await fetch();
    return result;
  }, [fetch]);

  useState(() => {
    fetch();
  });

  return { documents, loading, error, refetch: fetch, addDocument, removeDocument };
}

// ============================================================================
// Export Types
// ============================================================================

export type {
  Product,
  ProductCategory,
  ProductMold,
  ProductDocument,
  ProductWithRelations,
  ProductCreateInput,
  ProductUpdateInput,
};
