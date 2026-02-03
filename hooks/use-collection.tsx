/**
 * Collection Hook 工厂
 * 
 * 根据 Service 自动生成对应的 React Hooks
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { RecordModel, ListResult } from 'pocketbase';
import type { BaseCollectionService, QueryOptions } from '@/lib/pocketbase/base-service';

export interface CollectionHookResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
  refetch: (options?: QueryOptions) => Promise<ListResult<T> | null>;
  create: (data: Partial<T>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<boolean>;
}

export interface RecordHookResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<T | null>;
  update: (data: Partial<T>) => Promise<T>;
  remove: () => Promise<boolean>;
}

/**
 * 创建 Collection Hook（列表）
 */
export function createCollectionHook<T extends RecordModel>(
  service: BaseCollectionService<T>
) {
  return function useCollection(options?: QueryOptions): CollectionHookResult<T> {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [pagination, setPagination] = useState({
      total: 0,
      page: 1,
      perPage: 50,
      totalPages: 0,
    });
    
    // 用 ref 存储 options 避免无限循环
    const optionsRef = useRef(options);
    optionsRef.current = options;

    const fetch = useCallback(async (fetchOptions?: QueryOptions) => {
      setLoading(true);
      setError(null);
      try {
        const mergedOptions = { ...optionsRef.current, ...fetchOptions };
        const result = await service.getList(mergedOptions);
        setData(result.items);
        setPagination({
          total: result.totalItems,
          page: result.page,
          perPage: result.perPage,
          totalPages: result.totalPages,
        });
        return result;
      } catch (e: any) {
        setError(e);
        return null;
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      fetch();
    }, [fetch]);

    const create = useCallback(async (createData: Partial<T>) => {
      const result = await service.create(createData);
      fetch();
      return result;
    }, [fetch]);

    const update = useCallback(async (id: string, updateData: Partial<T>) => {
      const result = await service.update(id, updateData);
      fetch();
      return result;
    }, [fetch]);

    const remove = useCallback(async (id: string) => {
      const result = await service.delete(id);
      fetch();
      return result;
    }, [fetch]);

    return { data, loading, error, pagination, refetch: fetch, create, update, remove };
  };
}

/**
 * 创建 Record Hook（单条记录）
 */
export function createRecordHook<T extends RecordModel>(
  service: BaseCollectionService<T>
) {
  return function useRecord(
    id: string | undefined,
    options?: { expand?: string }
  ): RecordHookResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    
    const optionsRef = useRef(options);
    optionsRef.current = options;

    const fetch = useCallback(async () => {
      if (!id) {
        setData(null);
        setLoading(false);
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await service.getOne(id, optionsRef.current);
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

    const update = useCallback(async (updateData: Partial<T>) => {
      if (!id) throw new Error('No record id');
      const result = await service.update(id, updateData);
      setData(result);
      return result;
    }, [id]);

    const remove = useCallback(async () => {
      if (!id) throw new Error('No record id');
      return service.delete(id);
    }, [id]);

    return { data, loading, error, refetch: fetch, update, remove };
  };
}

/**
 * 创建 FullList Hook（获取全部记录，不分页）
 */
export function createFullListHook<T extends RecordModel>(
  service: BaseCollectionService<T>
) {
  return function useFullList(options?: Omit<QueryOptions, 'page' | 'perPage'>) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    
    const optionsRef = useRef(options);
    optionsRef.current = options;

    const fetch = useCallback(async (fetchOptions?: Omit<QueryOptions, 'page' | 'perPage'>) => {
      setLoading(true);
      setError(null);
      try {
        const mergedOptions = { ...optionsRef.current, ...fetchOptions };
        const result = await service.getFullList(mergedOptions);
        setData(result);
        return result;
      } catch (e: any) {
        setError(e);
        return [];
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      fetch();
    }, [fetch]);

    return { data, loading, error, refetch: fetch };
  };
}
