/**
 * Project Context Hook
 * 项目上下文 Hook
 * 
 * 从 URL 参数获取项目上下文，用于在项目内创建单据时预填充项目和客户信息
 * 
 * Requirements: 1.2, 1.3, 1.4, 4.1, 4.2, 4.3, 5.1
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { projectService, type Project } from '@/lib/pocketbase/services/projects';
import { customerService, type Customer } from '@/lib/pocketbase/services/customers';
import { type BreadcrumbItem } from '@/lib/breadcrumb/context';

/**
 * Document types for return URL calculation
 * 单据类型，用于计算返回 URL
 */
export type DocumentType = 'quotation' | 'order' | 'purchase-order' | 'shipment';

/**
 * Return mode for navigation
 * 返回模式
 */
export type ReturnMode = 'detail' | 'workflow';

/**
 * Maps document types to project detail page tab names
 * 单据类型到项目详情页标签页名称的映射
 */
export const DOCUMENT_TYPE_TO_TAB: Record<DocumentType, string> = {
  'quotation': 'quotations',
  'order': 'orders',
  'purchase-order': 'purchaseOrders',
  'shipment': 'shipments',
};

export interface ProjectContext {
  /** 项目 ID（从 URL 参数获取） */
  projectId: string | null;
  /** 项目数据 */
  project: Project | null;
  /** 客户数据（从项目关联获取） */
  customer: Customer | null;
  /** 是否在项目上下文中 */
  isWithinProject: boolean;
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 重新加载数据 */
  refetch: () => Promise<void>;
  /** 返回 URL（项目详情页 + 对应标签页） */
  returnUrl: string | null;
  /** 面包屑项目 */
  breadcrumbItems: BreadcrumbItem[];
}

/**
 * Calculates the return URL for a given project and document type
 * 计算给定项目和单据类型的返回 URL
 * 
 * @param projectId - The project ID
 * @param documentType - The type of document (optional, defaults to project info tab)
 * @param returnMode - Return mode: 'workflow' returns to workflow page, 'detail' returns to project detail
 * @returns The return URL string, or null if no projectId
 * 
 * **Feature: project-context-simplification, Property 4: 返回 URL 计算**
 * **Validates: Requirements 4.1, 4.2, 4.3**
 */
export function calculateReturnUrl(
  projectId: string | null,
  documentType?: DocumentType,
  returnMode?: ReturnMode
): string | null {
  if (!projectId) {
    return null;
  }
  
  const baseUrl = `/projects/${projectId}`;
  
  // 工作流模式：返回到工作流页面
  if (returnMode === 'workflow') {
    return `${baseUrl}/workflow`;
  }
  
  if (!documentType) {
    return baseUrl;
  }
  
  const tab = DOCUMENT_TYPE_TO_TAB[documentType];
  return `${baseUrl}?tab=${tab}`;
}

/**
 * 生成带工作流返回参数的 URL
 * @param baseUrl - 基础 URL（如 /quotations/new）
 * @param projectId - 项目 ID
 * @param returnMode - 返回模式
 */
export function buildWorkflowUrl(
  baseUrl: string,
  projectId: string,
  returnMode: ReturnMode = 'workflow'
): string {
  const params = new URLSearchParams();
  params.set('project', projectId);
  if (returnMode === 'workflow') {
    params.set('returnTo', 'workflow');
  }
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generates breadcrumb items for project context
 * 生成项目上下文的面包屑项目
 * 
 * @param customer - Customer data (optional)
 * @param project - Project data (optional)
 * @param currentPage - Current page label
 * @returns Array of breadcrumb items
 */
export function generateProjectBreadcrumbs(
  customer: Customer | null,
  project: Project | null,
  currentPage: string
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [];
  
  // Add customer breadcrumb if available
  if (customer) {
    items.push({
      label: customer.name,
      href: `/customers/${customer.id}`,
    });
  }
  
  // Add project breadcrumb if available
  if (project) {
    items.push({
      label: project.name,
      href: `/projects/${project.id}`,
    });
  }
  
  // Add current page (no href - it's the current location)
  items.push({
    label: currentPage,
  });
  
  return items;
}

/**
 * 项目上下文 Hook
 * 
 * 从 URL 参数 `project` 获取项目 ID，并加载项目和客户信息
 * 
 * @param options - Hook options
 * @param options.documentType - Document type for return URL calculation
 * @param options.currentPageLabel - Label for current page in breadcrumbs
 * 
 * @example
 * ```tsx
 * // 在表单组件中使用
 * const { projectId, project, customer, isWithinProject, loading, returnUrl, breadcrumbItems } = useProjectContext({
 *   documentType: 'quotation',
 *   currentPageLabel: '新建报价'
 * });
 * 
 * // 如果有项目上下文，预填充并禁用项目选择
 * <ProjectSelect 
 *   value={projectId} 
 *   disabled={isWithinProject}
 *   onChange={...}
 * />
 * 
 * // 使用返回 URL
 * router.push(returnUrl || '/projects');
 * ```
 */
export function useProjectContext(options?: {
  documentType?: DocumentType;
  currentPageLabel?: string;
}): ProjectContext {
  const { documentType, currentPageLabel = '' } = options || {};
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');
  const returnTo = searchParams.get('returnTo') as ReturnMode | null;
  
  const [project, setProject] = useState<Project | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadProjectWithCustomer = useCallback(async () => {
    if (!projectId) {
      setProject(null);
      setCustomer(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 加载项目
      const projectData = await projectService.getOne(projectId);
      setProject(projectData);

      // 如果项目有关联客户，加载客户信息
      if (projectData?.customer) {
        const customerData = await customerService.getOne(projectData.customer);
        setCustomer(customerData);
      } else {
        setCustomer(null);
      }
    } catch (e: any) {
      setError(e);
      setProject(null);
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProjectWithCustomer();
  }, [loadProjectWithCustomer]);

  // Calculate return URL based on project, document type, and return mode
  const returnUrl = useMemo(() => {
    // 优先使用 returnTo 参数
    if (returnTo === 'workflow') {
      return calculateReturnUrl(projectId, documentType, 'workflow');
    }
    return calculateReturnUrl(projectId, documentType);
  }, [projectId, documentType, returnTo]);

  // Generate breadcrumb items
  const breadcrumbItems = useMemo(() => {
    return generateProjectBreadcrumbs(customer, project, currentPageLabel);
  }, [customer, project, currentPageLabel]);

  return {
    projectId,
    project,
    customer,
    isWithinProject: !!projectId,
    loading,
    error,
    refetch: loadProjectWithCustomer,
    returnUrl,
    breadcrumbItems,
  };
}

export default useProjectContext;
