/**
 * Task Hooks
 * 任务 React Hooks
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPocketBase } from '@/lib/pocketbase/auth';
import type { Task, TaskWithExpand, TaskStatus, TaskPriority, TaskCreateInput } from '@/lib/pocketbase/services/tasks';

// ============================================================================
// Task Hooks
// ============================================================================

interface UseTasksOptions {
  status?: TaskStatus;
  assigneeId?: string;
  page?: number;
  perPage?: number;
}

export function useTasks(options: UseTasksOptions = {}) {
  const { status, assigneeId, page = 1, perPage = 20 } = options;

  const [tasks, setTasks] = useState<TaskWithExpand[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const pb = getPocketBase();
      const filters: string[] = [];
      if (status) filters.push(`status = "${status}"`);
      if (assigneeId) filters.push(`assignee = "${assigneeId}"`);
      const filter = filters.length > 0 ? filters.join(' && ') : '';

      const result = await pb.collection('tasks').getList<TaskWithExpand>(page, perPage, {
        ...(filter ? { filter } : {}),
      });

      setTasks(result.items);
      setTotalItems(result.totalItems);
      setTotalPages(result.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch tasks'));
    } finally {
      setIsLoading(false);
    }
  }, [status, assigneeId, page, perPage]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, totalItems, totalPages, isLoading, error, refetch: fetchTasks };
}

export function useTask(id: string | null) {
  const [task, setTask] = useState<TaskWithExpand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTask = useCallback(async () => {
    if (!id) {
      setTask(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const pb = getPocketBase();
      const result = await pb.collection('tasks').getOne<TaskWithExpand>(id, {
      });
      setTask(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch task'));
      setTask(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  return { task, isLoading, error, refetch: fetchTask };
}

export function useOverdueTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { taskService } = await import('@/lib/pocketbase/services/tasks');
      const result = await taskService.getOverdue();
      setTasks(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch overdue tasks'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, isLoading, error, refetch: fetchTasks };
}

export function useTaskMutations() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createTask = useCallback(async (data: TaskCreateInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const { taskService } = await import('@/lib/pocketbase/services/tasks');
      return await taskService.createTask(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to create task'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    setIsLoading(true);
    setError(null);
    try {
      const { taskService } = await import('@/lib/pocketbase/services/tasks');
      return await taskService.update(id, data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to update task'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (id: string, status: TaskStatus) => {
    setIsLoading(true);
    setError(null);
    try {
      const { taskService } = await import('@/lib/pocketbase/services/tasks');
      return await taskService.updateStatus(id, status);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to update status'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const completeTask = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { taskService } = await import('@/lib/pocketbase/services/tasks');
      return await taskService.complete(id);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to complete task'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { taskService } = await import('@/lib/pocketbase/services/tasks');
      await taskService.delete(id);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to delete task'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, createTask, updateTask, updateStatus, completeTask, deleteTask };
}

export default {
  useTasks,
  useTask,
  useOverdueTasks,
  useTaskMutations,
};
