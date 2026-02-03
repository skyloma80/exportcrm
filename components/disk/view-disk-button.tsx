"use client"

/**
 * 通用网盘跳转按钮
 * 支持多种路径模式：客户、供应商、项目、产品等
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FolderOpen, Loader2 } from "lucide-react"
import { navigateToDisk, buildTypedPath } from "@/lib/disk/ensure-folder"

export type DiskPathType = 
  | 'customer'           // Customers/{name}
  | 'customer-project'   // Customers/{customerName}/{projectName}
  | 'supplier'           // Suppliers/{name}
  | 'project'            // Customers/{customerName}/{projectName}
  | 'product'            // Products/{code}
  | 'custom'             // 自定义路径

interface ViewDiskButtonProps {
  type: DiskPathType
  name?: string              // 客户名、供应商名或产品编码
  customerName?: string      // 客户名（用于项目）
  projectName?: string       // 项目名
  customPath?: string        // type='custom' 时使用
  label?: string
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function ViewDiskButton({
  type,
  name,
  customerName,
  projectName,
  customPath,
  label,
  variant = "outline",
  size = "sm",
  className,
}: ViewDiskButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // 构建路径
  const buildPath = (): string => {
    switch (type) {
      case 'customer':
        return buildTypedPath('Customers', name || '')
      case 'customer-project':
      case 'project':
        return buildTypedPath('Customers', customerName || name || '', projectName)
      case 'supplier':
        return buildTypedPath('Suppliers', name || '')
      case 'product':
        return buildTypedPath('Products', name || '')
      case 'custom':
        return customPath || ''
      default:
        return ''
    }
  }

  const handleClick = async () => {
    const path = buildPath()
    if (!path) return
    
    setLoading(true)
    try {
      await navigateToDisk(path, router)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FolderOpen className="h-4 w-4 mr-2" />
      )}
      {label || "文件"}
    </Button>
  )
}
