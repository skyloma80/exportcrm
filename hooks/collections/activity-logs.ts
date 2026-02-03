/**
 * Activity Log Hooks
 * 活动日志 React Hooks
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  activityLogService, 
  ActivityLogWithExpand,
  EntityType 
} from '@/lib/pocketbase/services/activity-logs';

/**
 * Hook for fetching entity activities (timeline)
 */
export function useEntityActivities(entityType: EntityType | null, entityId: string | null) {
  const [data, setData] = useState<ActivityLogWithExpand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!entityType || !entityId) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await activityLogService.getByEntity(entityType, entityId);
      setData(result.items);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for fetching recent activities
 */
export function useRecentActivities(limit: number = 20) {
  const [data, setData] = useState<ActivityLogWithExpand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activities = await activityLogService.getRecent(limit);
      setData(activities);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for fetching user activities
 */
export function useUserActivities(userId: string | null) {
  const [data, setData] = useState<ActivityLogWithExpand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await activityLogService.getByUser(userId);
      setData(result.items);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
