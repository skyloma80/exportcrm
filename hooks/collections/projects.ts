/**
 * Project Collection Hooks
 * 项目集合 Hooks
 */

'use client';

import { useState, useCallback } from 'react';
import { createCollectionHook, createRecordHook, createFullListHook } from '../use-collection';
import {
  projectService,
  productProjectService,
  type Project,
  type ProductProject,
  type ProjectWithRelations,
  type ProjectCreateInput,
  type ProjectUpdateInput,
  type ProjectStage,
} from '@/lib/pocketbase/services/projects';

// Basic CRUD Hooks
export const useProjects = createCollectionHook(projectService);
export const useProject = createRecordHook(projectService);
export const useAllProjects = createFullListHook(projectService);

export function useProjectWithRelations(id: string | undefined) {
  const [data, setData] = useState<ProjectWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!id) { setData(null); setLoading(false); return null; }
    setLoading(true);
    setError(null);
    try {
      const result = await projectService.getWithRelations(id);
      setData(result);
      return result;
    } catch (e: any) {
      setError(e);
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  useState(() => { fetch(); });
  return { data, loading, error, refetch: fetch };
}

export function useProjectSearch() {
  const [results, setResults] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(async (query: string, options?: { page?: number; perPage?: number; customerId?: string }) => {
    if (!query.trim()) { setResults([]); return []; }
    setLoading(true);
    setError(null);
    try {
      const result = await projectService.search(query, options);
      setResults(result.items);
      return result.items;
    } catch (e: any) {
      setError(e);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => { setResults([]); }, []);
  return { results, loading, error, search, clear };
}

export function useCreateProject() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (data: ProjectCreateInput): Promise<Project | null> => {
    setLoading(true);
    setError(null);
    try {
      return await projectService.createProject(data);
    } catch (e: any) {
      setError(e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading, error };
}

export function useUpdateProject() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(async (id: string, data: ProjectUpdateInput): Promise<Project | null> => {
    setLoading(true);
    setError(null);
    try {
      return await projectService.updateProject(id, data);
    } catch (e: any) {
      setError(e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { update, loading, error };
}


export function useProjectProducts(projectId: string | undefined) {
  const [products, setProducts] = useState<ProductProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!projectId) { setProducts([]); setLoading(false); return []; }
    setLoading(true);
    setError(null);
    try {
      const result = await productProjectService.getByProject(projectId);
      setProducts(result);
      return result;
    } catch (e: any) {
      setError(e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const addProduct = useCallback(async (productId: string, usageNote?: string) => {
    if (!projectId) throw new Error('No project id');
    const result = await productProjectService.addProductToProject(productId, projectId, usageNote);
    await fetch();
    return result;
  }, [projectId, fetch]);

  const removeProduct = useCallback(async (productId: string) => {
    if (!projectId) throw new Error('No project id');
    const result = await productProjectService.removeProductFromProject(productId, projectId);
    await fetch();
    return result;
  }, [projectId, fetch]);

  useState(() => { fetch(); });
  return { products, loading, error, refetch: fetch, addProduct, removeProduct };
}

// Export Types
export type {
  Project,
  ProductProject,
  ProjectWithRelations,
  ProjectCreateInput,
  ProjectUpdateInput,
  ProjectStage,
};
