"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

/**
 * Hook to manage tab state with URL synchronization
 * Tab 状态管理 Hook，支持 URL 参数同步
 * 
 * @param defaultTab - Default tab value when no URL param exists
 * @param paramName - URL parameter name (default: "tab")
 * @returns [activeTab, setActiveTab] - Current tab and setter function
 */
export function useTabState(
  defaultTab: string,
  paramName: string = "tab"
): [string, (tab: string) => void] {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Initialize from URL or default
  const [activeTab, setActiveTabState] = useState(() => {
    return searchParams.get(paramName) || defaultTab
  })

  // Sync state when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const urlTab = searchParams.get(paramName)
    if (urlTab && urlTab !== activeTab) {
      setActiveTabState(urlTab)
    }
  }, [searchParams, paramName, activeTab])

  // Update both state and URL
  const setActiveTab = useCallback((newTab: string) => {
    setActiveTabState(newTab)
    
    // Build new URL with updated tab param
    const params = new URLSearchParams(searchParams.toString())
    if (newTab === defaultTab) {
      // Remove param if it's the default value
      params.delete(paramName)
    } else {
      params.set(paramName, newTab)
    }
    
    const newUrl = params.toString() 
      ? `${pathname}?${params.toString()}`
      : pathname
    
    // Use replace to avoid adding to history for tab changes
    router.replace(newUrl, { scroll: false })
  }, [router, pathname, searchParams, paramName, defaultTab])

  return [activeTab, setActiveTab]
}
