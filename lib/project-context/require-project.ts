/**
 * Project Context Requirement Utilities
 * 项目上下文强制验证工具
 * 
 * Provides utilities to enforce project context on business document pages.
 * When a page requires project context but the URL doesn't contain a `project` parameter,
 * these utilities help return a 404 response.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { notFound } from 'next/navigation';

/**
 * Document types that require project context
 * 需要项目上下文的单据类型
 */
export type RequiredProjectDocumentType = 
  | 'quotation' 
  | 'order' 
  | 'purchase-order' 
  | 'shipment';

/**
 * Result of checking project context requirement
 * 项目上下文检查结果
 */
export interface ProjectContextCheckResult {
  /** Whether the project parameter exists in URL */
  hasProject: boolean;
  /** The project ID from URL (null if not present) */
  projectId: string | null;
  /** Whether the order parameter exists (for shipment pages) */
  hasOrder?: boolean;
  /** The order ID from URL (null if not present) */
  orderId?: string | null;
}

/**
 * Checks if URL search params contain required project context
 * 检查 URL 参数是否包含必需的项目上下文
 * 
 * @param searchParams - URL search parameters
 * @returns Check result with project ID if present
 * 
 * @example
 * ```tsx
 * // In a page component
 * const result = checkProjectContext(searchParams);
 * if (!result.hasProject) {
 *   notFound();
 * }
 * ```
 */
export function checkProjectContext(
  searchParams: { [key: string]: string | string[] | undefined } | URLSearchParams
): ProjectContextCheckResult {
  let projectId: string | null = null;
  let orderId: string | null = null;

  if (searchParams instanceof URLSearchParams) {
    projectId = searchParams.get('project');
    orderId = searchParams.get('order');
  } else {
    const projectParam = searchParams.project;
    projectId = typeof projectParam === 'string' ? projectParam : null;
    
    const orderParam = searchParams.order;
    orderId = typeof orderParam === 'string' ? orderParam : null;
  }

  return {
    hasProject: !!projectId && projectId.trim().length > 0,
    projectId: projectId && projectId.trim().length > 0 ? projectId.trim() : null,
    hasOrder: !!orderId && orderId.trim().length > 0,
    orderId: orderId && orderId.trim().length > 0 ? orderId.trim() : null,
  };
}

/**
 * Requires project context or triggers 404
 * 强制要求项目上下文，否则返回 404
 * 
 * This function should be called at the top of page components that require
 * project context. If the project parameter is missing, it will trigger
 * Next.js's notFound() which renders the 404 page.
 * 
 * @param searchParams - URL search parameters from page props
 * @returns The project ID if present
 * @throws Triggers notFound() if project parameter is missing
 * 
 * @example
 * ```tsx
 * // In a page component
 * export default function QuotationDetailPage({ searchParams }: PageProps) {
 *   const projectId = requireProjectContext(searchParams);
 *   // projectId is guaranteed to be non-null here
 *   // ...
 * }
 * ```
 */
export function requireProjectContext(
  searchParams: { [key: string]: string | string[] | undefined } | URLSearchParams
): string {
  const result = checkProjectContext(searchParams);
  
  if (!result.hasProject || !result.projectId) {
    notFound();
  }
  
  return result.projectId;
}

/**
 * Requires both project and order context or triggers 404
 * 强制要求项目和订单上下文，否则返回 404
 * 
 * This function should be called at the top of shipment page components
 * that require both project and order context.
 * 
 * @param searchParams - URL search parameters from page props
 * @returns Object containing both projectId and orderId
 * @throws Triggers notFound() if either parameter is missing
 * 
 * @example
 * ```tsx
 * // In a shipment page component
 * export default function ShipmentDetailPage({ searchParams }: PageProps) {
 *   const { projectId, orderId } = requireOrderContext(searchParams);
 *   // Both are guaranteed to be non-null here
 *   // ...
 * }
 * ```
 */
export function requireOrderContext(
  searchParams: { [key: string]: string | string[] | undefined } | URLSearchParams
): { projectId: string; orderId: string } {
  const result = checkProjectContext(searchParams);
  
  if (!result.hasProject || !result.projectId) {
    notFound();
  }
  
  if (!result.hasOrder || !result.orderId) {
    notFound();
  }
  
  return {
    projectId: result.projectId,
    orderId: result.orderId,
  };
}

/**
 * Checks if a document type requires project context
 * 检查单据类型是否需要项目上下文
 * 
 * @param documentType - The type of document
 * @returns true if the document type requires project context
 */
export function requiresProjectContext(documentType: RequiredProjectDocumentType): boolean {
  const typesRequiringProject: RequiredProjectDocumentType[] = [
    'quotation',
    'order',
    'purchase-order',
    'shipment',
  ];
  
  return typesRequiringProject.includes(documentType);
}

/**
 * Checks if a document type requires order context (in addition to project)
 * 检查单据类型是否需要订单上下文
 * 
 * @param documentType - The type of document
 * @returns true if the document type requires order context
 */
export function requiresOrderContext(documentType: RequiredProjectDocumentType): boolean {
  return documentType === 'shipment';
}
