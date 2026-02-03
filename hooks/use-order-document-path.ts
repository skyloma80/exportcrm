/**
 * Hook for managing order document paths
 * 订单文档路径管理 Hook
 */

import { useMemo } from 'react'
import { getOrderDocumentPath, extractOrderPathInfo, type OrderDocumentType } from '@/lib/services/shipment-document-path'
import type { OrderWithExpand } from '@/lib/pocketbase/services/orders'

export function useOrderDocumentPath(order: OrderWithExpand | null) {
  const pathInfo = useMemo(() => {
    if (!order) return null
    return extractOrderPathInfo(order)
  }, [order])

  const getPath = (docType: OrderDocumentType) => {
    if (!pathInfo) return null
    return getOrderDocumentPath(pathInfo, docType)
  }

  return {
    pathInfo,
    getPath,
    isReady: !!pathInfo,
  }
}
