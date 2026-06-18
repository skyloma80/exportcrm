"use client"

/**
 * Order Documents Page (V3) - FlatSO
 * 订单文档列表页面 - 新版 FlatSO
 */

import { useState, useEffect, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useToast } from "@/hooks/use-toast"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { 
  Upload, 
  FolderOpen,
  FileText,
  Loader2,
  ChevronDown,
  ChevronRight,
  Eye,
  Download,
  ArrowLeft
} from "lucide-react"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { ViewOrderDocumentButton } from "@/components/orders/view-order-document-button"
import { 
  ORDER_DOCUMENT_TYPES, 
  type OrderDocumentType,
  SHIPMENT_DOCUMENT_TYPES,
  type ShipmentDocumentType,
  getOrderDocumentPath,
  getPODocumentPath,
  getShipmentDocumentPath,
  extractOrderPathInfo,
  type OrderPathInfo,
} from "@/lib/services/shipment-document-path"
import type { FlatSO } from "@/lib/pocketbase/services/so"
import type { Shipment } from "@/lib/pocketbase/services/shipments"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { navigateToDisk } from "@/lib/disk/ensure-folder"

interface PageProps {
  params: Promise<{ id: string }>
}

interface DocumentFile {
  name: string
  path: string
  size: number
  lastModified: Date
}

interface DocumentSection {
  type: string
  label: string
  files: DocumentFile[]
  loading: boolean
}

export default function OrderDocumentsPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const { setItems: setBreadcrumbItems } = useBreadcrumb()
  
  const projectIdFromUrl = searchParams.get("project")
  
  const [order, setOrder] = useState<FlatSO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [pathInfo, setPathInfo] = useState<OrderPathInfo | null>(null)
  
  const [orderDocs, setOrderDocs] = useState<Record<string, DocumentSection>>({})
  
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [shipmentDocs, setShipmentDocs] = useState<Record<string, Record<string, DocumentFile[]>>>({})
  const [shipmentExpanded, setShipmentExpanded] = useState<Record<string, boolean>>({})
  const [shipmentLoading, setShipmentLoading] = useState<Record<string, boolean>>({})
  
  const [uploading, setUploading] = useState<string | null>(null)

  useEffect(() => {
    if (order) {
      setBreadcrumbItems([
        { label: t("nav.orders"), href: "/orders" },
        { label: order.code || t("orders.detail"), href: `/orders/${id}${projectIdFromUrl ? `?project=${projectIdFromUrl}` : ''}` },
        { label: t('orders.documents.title') },
      ])
    }
    return () => setBreadcrumbItems([])
  }, [order, setBreadcrumbItems, id, projectIdFromUrl, t])

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const pb = getPocketBase()
      
      const result = await pb.collection("so").getOne<FlatSO>(id, {
        expand: "project_id,customer_id",
      })
      setOrder(result)
      
      const info = extractOrderPathInfo(result)
      if (!info) {
        throw new Error("Missing customer information")
      }
      setPathInfo(info)
      
      await loadOrderDocuments(info)
      
      const ships = await pb.collection("shipments").getFullList<Shipment>({
        filter: `order = "${id}"`,
        sort: "id",
      })
      setShipments(ships)
      
    } catch (err: any) {
      console.error("Error loading order:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const loadOrderDocuments = async (info: OrderPathInfo) => {
    const docs: Record<string, DocumentSection> = {}
    
    for (const docType of ORDER_DOCUMENT_TYPES) {
      docs[docType] = {
        type: docType,
        label: t(`orders.documents.types.${docType}`),
        files: [],
        loading: true,
      }
    }
    setOrderDocs(docs)
    
    try {
      const response = await fetch(`/api/orders/${id}/documents?type=order`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to load documents")
      }
      
      const { documents } = await response.json()
      
      for (const docType of ORDER_DOCUMENT_TYPES) {
        setOrderDocs(prev => ({
          ...prev,
          [docType]: {
            ...prev[docType],
            files: documents[docType] || [],
            loading: false,
          }
        }))
      }
    } catch (error) {
      console.error("Error loading order documents:", error)
      for (const docType of ORDER_DOCUMENT_TYPES) {
        setOrderDocs(prev => ({
          ...prev,
          [docType]: {
            ...prev[docType],
            loading: false,
          }
        }))
      }
    }
  }

  const loadShipmentDocuments = async (shipment: Shipment, shipmentIndex: number, info: OrderPathInfo) => {
    setShipmentLoading(prev => ({ ...prev, [shipment.id]: true }))
    
    try {
      const response = await fetch(`/api/orders/${id}/documents?type=shipment&shipmentId=${shipment.id}`)
      if (!response.ok) throw new Error("Failed to load shipment documents")
      
      const { documents } = await response.json()
      
      setShipmentDocs(prev => ({
        ...prev,
        [shipment.id]: documents,
      }))
    } catch (error) {
      console.error("Error loading shipment documents:", error)
    } finally {
      setShipmentLoading(prev => ({ ...prev, [shipment.id]: false }))
    }
  }

  const handleUpload = async (docType: OrderDocumentType, file: File) => {
    if (!pathInfo) return
    
    setUploading(docType)
    try {
      const path = getOrderDocumentPath(pathInfo, docType)
      const filePath = `${path}/${file.name}`
      
      const formData = new FormData()
      formData.append("file", file)
      formData.append("path", filePath)
      
      const response = await fetch('/api/disk/upload', {
        method: "POST",
        body: formData,
      })
      
      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error || "Upload failed")
      }
      
      toast({
        title: t('orders.documents.uploadSuccess'),
        description: t('orders.documents.uploadSuccessDesc'),
      })
      
      await loadOrderDocuments(pathInfo)
    } catch (error: any) {
      console.error("Upload error:", error)
      toast({
        title: t('orders.documents.uploadError'),
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setUploading(null)
    }
  }

  const handlePreview = (filePath: string) => {
    window.open(`/api/disk/file?path=${encodeURIComponent(filePath)}`, '_blank')
  }

  const handleOpenShipmentDirectory = async (shipment: Shipment, shipmentIndex: number, docType: ShipmentDocumentType) => {
    if (!pathInfo) return
    
    const path = getShipmentDocumentPath(pathInfo, shipmentIndex, docType)
    await navigateToDisk(path, router)
  }

  const toggleShipment = (shipmentId: string) => {
    const isExpanding = !shipmentExpanded[shipmentId]
    setShipmentExpanded(prev => ({ ...prev, [shipmentId]: isExpanding }))
    
    if (isExpanding && !shipmentDocs[shipmentId] && pathInfo) {
      const shipmentIndex = shipments.findIndex(s => s.id === shipmentId)
      const shipment = shipments[shipmentIndex]
      if (shipment && shipmentIndex >= 0) {
        loadShipmentDocuments(shipment, shipmentIndex + 1, pathInfo)
      }
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !order || !pathInfo) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">{t("orders.notFound")}</h2>
          <Button variant="outline" onClick={() => router.push(`/orders/${id}`)} className="mt-4">
            {t("common.back")}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
         <Button variant="ghost" size="icon" onClick={() => router.push(`/orders/${id}${projectIdFromUrl ? `?project=${projectIdFromUrl}` : ''}`)}>
            <ArrowLeft className="w-5 h-5" />
         </Button>
         <div>
            <h1 className="text-2xl font-bold">{t('orders.documents.title')}</h1>
            <p className="text-muted-foreground mt-1">
               {order.code}
            </p>
         </div>
      </div>

      {/* Order Documents */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">{t('orders.documents.orderDocuments')}</h2>
        
        {ORDER_DOCUMENT_TYPES.map(docType => {
          const section = orderDocs[docType]
          if (!section) return null
          
          return (
            <div key={docType} className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b">
                <h3 className="font-medium">
                  {section.label}
                  {section.files.length > 0 && (
                    <span className="text-sm text-muted-foreground ml-2">({section.files.length})</span>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  <ViewOrderDocumentButton order={order} docType={docType} />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploading === docType}
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0]
                        if (file) handleUpload(docType, file)
                      }
                      input.click()
                    }}
                  >
                    {uploading === docType ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {t('orders.documents.upload')}
                  </Button>
                </div>
              </div>
              
              {section.loading ? (
                <div className="text-sm text-muted-foreground py-2">{t('common.loading')}</div>
              ) : section.files.length > 0 ? (
                <div className="space-y-1">
                  {section.files.map(file => (
                    <div key={file.path} className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/50 transition-colors group">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate" title={file.name}>{file.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handlePreview(file.path)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          asChild
                        >
                          <a href={`/api/disk/download?path=${encodeURIComponent(file.path)}`} download>
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">{t('orders.documents.noFiles')}</p>
              )}
            </div>
          )
        })}
      </div>


      {/* Shipment Documents */}
      {shipments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{t('orders.documents.shipmentDocuments')}</h2>
          
          {shipments.map((shipment, index) => {
            const isExpanded = shipmentExpanded[shipment.id]
            const isLoading = shipmentLoading[shipment.id]
            const docs = shipmentDocs[shipment.id] || {}
            const totalFiles = Object.values(docs).reduce((sum, files) => sum + files.length, 0)
            
            return (
              <Collapsible key={shipment.id} open={isExpanded} onOpenChange={() => toggleShipment(shipment.id)}>
                <div className="border-b">
                  <div className="flex items-center justify-between py-3">
                    <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="font-medium">{shipment.code}</span>
                      <span className="text-muted-foreground">• {t(`shipments.status.${shipment.status}`)}</span>
                      {totalFiles > 0 && (
                        <Badge variant="secondary" className="ml-2 font-normal">{totalFiles}</Badge>
                      )}
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="pb-3 space-y-3">
                      {isLoading ? (
                        <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
                      ) : (
                        SHIPMENT_DOCUMENT_TYPES.map(docType => {
                          const files = docs[docType] || []
                          
                          return (
                            <div key={docType} className="space-y-1">
                              <div className="flex items-center justify-between py-1">
                                <span className="text-sm font-medium">{t(`orders.documents.shipmentTypes.${docType}`)}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenShipmentDirectory(shipment, index + 1, docType)}
                                >
                                  <FolderOpen className="h-3 w-3 mr-1" />
                                  {t('orders.documents.openDirectory')}
                                </Button>
                              </div>
                              {files.length > 0 ? (
                                <div className="space-y-1 pl-4">
                                  {files.map(file => (
                                    <div key={file.path} className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/50 transition-colors group">
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                        <span className="text-xs truncate" title={file.name}>{file.name}</span>
                                        <span className="text-xs text-muted-foreground flex-shrink-0">{formatFileSize(file.size)}</span>
                                      </div>
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handlePreview(file.path)}>
                                          <Eye className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                                          <a href={`/api/disk/download?path=${encodeURIComponent(file.path)}`} download>
                                            <Download className="h-3 w-3" />
                                          </a>
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground pl-4">{t('orders.documents.noFiles')}</p>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )
          })}
        </div>
      )}
    </div>
  )
}
