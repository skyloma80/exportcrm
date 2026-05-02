/**
 * Hook for managing order document paths
 * 订单文档路径管理 Hook
 */

import { useMemo } from 'react'
import { getOrderDocumentPath, extractOrderPathInfo, type OrderDocumentType } from '@/lib/services/shipment-document-path'
import type { FlatSO } from '@/lib/pocketbase/services/so'

export function useOrderDocumentPath(order: FlatSO | null) {
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
