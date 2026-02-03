/**
 * Service Provider Hooks
 * 服务商 React Hooks
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  serviceProviderService, 
  ServiceProvider, 
  ServiceProviderType,
  ServiceProviderCreateInput,
  ServiceProviderUpdateInput 
} from '@/lib/pocketbase/services/service-providers';

/**
 * Hook for fetching all service providers
 */
export function useServiceProviders(options?: { type?: ServiceProviderType; activeOnly?: boolean }) {
  const [data, setData] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let providers: ServiceProvider[];
      if (options?.type) {
        providers = await serviceProviderService.getByType(options.type);
      } else if (options?.activeOnly) {
        providers = await serviceProviderService.getActive();
      } else {
        providers = await serviceProviderService.getFullList();
      }
      setData(providers);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [options?.type, options?.activeOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for fetching a single service provider
 */
export function useServiceProvider(id: string | null) {
  const [data, setData] = useState<ServiceProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const provider = await serviceProviderService.getOne(id);
      setData(provider);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for service provider mutations
 */
export function useServiceProviderMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (data: ServiceProviderCreateInput) => {
    setLoading(true);
    setError(null);
    try {
      const result = await serviceProviderService.createServiceProvider(data);
      return result;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id: string, data: ServiceProviderUpdateInput) => {
    setLoading(true);
    setError(null);
    try {
      const result = await serviceProviderService.updateServiceProvider(id, data);
      return result;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await serviceProviderService.delete(id);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleActive = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await serviceProviderService.toggleActive(id);
      return result;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, update, remove, toggleActive, loading, error };
}
