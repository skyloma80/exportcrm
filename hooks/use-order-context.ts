/**
 * Order Context Hook
 * 订单上下文 Hook
 * 
 * 从 URL 参数获取订单和项目上下文，用于在订单内创建发货时预填充订单和项目信息
 * 
 * Requirements: 8.2
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { orderService, type Order } from '@/lib/pocketbase/services/orders';
import { projectService, type Project } from '@/lib/pocketbase/services/projects';

export interface OrderContext {
  /** 订单 ID（从 URL 参数获取） */
  orderId: string | null;
  /** 订单数据 */
  order: Order | null;
  /** 项目 ID（从 URL 参数或订单关联获取） */
  projectId: string | null;
  /** 项目数据 */
  project: Project | null;
  /** 是否在订单上下文中 */
  isWithinOrder: boolean;
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 重新加载数据 */
  refetch: () => Promise<void>;
}

/**
 * 订单上下文 Hook
 * 
 * 从 URL 参数 `order` 获取订单 ID，从 `project` 获取项目 ID
 * 如果只有订单 ID，会从订单数据中获取项目 ID
 * 
 * @example
 * ```tsx
 * // 在发货表单组件中使用
 * const { orderId, order, projectId, project, isWithinOrder, loading } = useOrderContext();
 * 
 * // 如果有订单上下文，预填充并禁用订单选择
 * <OrderSelect 
 *   value={orderId} 
 *   disabled={isWithinOrder}
 *   filter={{ project: projectId }}  // 只显示当前项目的订单
 *   onChange={...}
 * />
 * ```
 */
export function useOrderContext(): OrderContext {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');
  const urlProjectId = searchParams.get('project');
  
  const [order, setOrder] = useState<Order | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadOrderWithProject = useCallback(async () => {
    if (!orderId) {
      setOrder(null);
      // 如果没有订单 ID 但有项目 ID，仍然加载项目
      if (urlProjectId) {
        try {
          const projectData = await projectService.getOne(urlProjectId);
          setProject(projectData);
        } catch (e: any) {
          setProject(null);
        }
      } else {
        setProject(null);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 加载订单
      const orderData = await orderService.getOne(orderId);
      setOrder(orderData);

      // 获取项目 ID：优先使用 URL 参数，否则使用订单关联的项目
      const effectiveProjectId = urlProjectId || orderData?.project;

      // 如果有项目 ID，加载项目信息
      if (effectiveProjectId) {
        const projectData = await projectService.getOne(effectiveProjectId);
        setProject(projectData);
      } else {
        setProject(null);
      }
    } catch (e: any) {
      setError(e);
      setOrder(null);
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [orderId, urlProjectId]);

  useEffect(() => {
    loadOrderWithProject();
  }, [loadOrderWithProject]);

  // 计算有效的项目 ID：优先使用 URL 参数，否则使用订单关联的项目
  const effectiveProjectId = urlProjectId || order?.project || null;

  return {
    orderId,
    order,
    projectId: effectiveProjectId,
    project,
    isWithinOrder: !!orderId,
    loading,
    error,
    refetch: loadOrderWithProject,
  };
}

export default useOrderContext;
