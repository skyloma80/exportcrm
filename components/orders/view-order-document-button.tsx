"use client"

/**
 * View Order Document Directory Button
 * 查看订单文档目录按钮
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FolderOpen, Loader2 } from "lucide-react"
import { navigateToDisk } from "@/lib/disk/ensure-folder"
import { useOrderDocumentPath } from "@/hooks/use-order-document-path"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/lib/i18n/use-i18n"
import type { FlatSO } from "@/lib/pocketbase/services/so"
import type { OrderDocumentType } from "@/lib/services/shipment-document-path"

interface ViewOrderDocumentButtonProps {
  order: FlatSO | null
  docType: OrderDocumentType
  label?: string
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function ViewOrderDocumentButton({
  order,
  docType,
  label,
  variant = "outline",
  size = "sm",
  className,
}: ViewOrderDocumentButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const { getPath, isReady } = useOrderDocumentPath(order)

  const handleClick = async () => {
    const path = getPath(docType)
    
    if (!path) {
      toast({
        title: t("common.error"),
        description: t("orders.sendEmail.missingData"),
        variant: "destructive"
      })
      return
    }
    
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
      disabled={loading || !isReady}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FolderOpen className="h-4 w-4 mr-2" />
      )}
      {label || t("orders.documents.openDirectory")}
    </Button>
  )
}
