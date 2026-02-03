"use client"

/**
 * Breadcrumb Context
 * 
 * Allows child pages to set custom breadcrumb items
 */

import { createContext, useContext, useState, useCallback, ReactNode } from "react"

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbContextValue {
  items: BreadcrumbItem[]
  setItems: (items: BreadcrumbItem[]) => void
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null)

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BreadcrumbItem[]>([])

  return (
    <BreadcrumbContext.Provider value={{ items, setItems }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export function useBreadcrumb() {
  const context = useContext(BreadcrumbContext)
  if (!context) {
    throw new Error("useBreadcrumb must be used within BreadcrumbProvider")
  }
  return context
}

/**
 * Hook to set breadcrumb items from a page component
 */
export function useSetBreadcrumb(items: BreadcrumbItem[]) {
  const { setItems } = useBreadcrumb()
  
  // Use useEffect-like pattern but call immediately
  const setBreadcrumbItems = useCallback(() => {
    setItems(items)
  }, [items, setItems])
  
  return setBreadcrumbItems
}
