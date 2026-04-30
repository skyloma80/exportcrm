"use client"

/**
 * Order Shipments Page (V2)
 * 订单发货管理页面
 * 
 * Requirements: 需求8.1-8.7
 */

import { useState, useEffect, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useToast } from "@/hooks/use-toast"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { 
  Plus,
  Ship,
  Plane,
  Truck,
  Package,
  Calendar,
  MapPin,
  Loader2,
} from "lucide-react"
import type { OrderWithExpand } from "@/lib/pocketbase/services/orders"
import type { Shipment } from "@/lib/pocketbase/services/shipments"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { useProjectContext } from "@/hooks/use-project-context"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function OrderShipmentsPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const { setItems: setBreadcrumbItems } = useBreadcrumb()
  
  // Get project context
  const projectIdFromUrl = searchParams.get("project")
  
  // Enforce project context: return 404 if no project parameter
  if (!projectIdFromUrl) {
    notFound()
  }
  
  const { returnUrl } = useProjectContext({
    documentType: 'order'
  })
  
  const [order, setOrder] = useState<OrderWithExpand | null>(null)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Set breadcrumb
  useEffect(() => {
    if (order) {
      setBreadcrumbItems([
        { label: order.code, href: `/orders/${id}?project=${projectIdFromUrl}` },
        { label: t('shipments.title') },
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
      
      // Load order
      const orderData = await pb.collection("orders").getOne<OrderWithExpand>(id, {
        expand: "project,customer",
      })
      setOrder(orderData)
      
      // Load shipments
      const shipmentsData = await pb.collection("shipments").getFullList<Shipment>({
        filter: `order = "${id}"`,
      })
      setShipments(shipmentsData)
      
    } catch (err: any) {
      console.error("Error loading shipments:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateShipment = () => {
    // Navigate to new shipment page with order and project context
    router.push(`/shipments/new?order=${id}&project=${projectIdFromUrl}`)
  }

  const getShippingIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'sea': return Ship
      case 'air': return Plane
      case 'land': return Truck
      default: return Package
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'delivered': return 'default'
      case 'preparing': return 'outline'
      case 'in_transit': return 'secondary'
      default: return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold">{t("orders.notFound")}</h2>
              <Button variant="outline" onClick={() => router.push(returnUrl || `/projects/${projectIdFromUrl}?tab=orders`)} className="mt-4">
                {t("common.back")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('shipments.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('shipments.subtitle', { orderCode: order.code })}
        </p>
      </div>

      {/* Shipments List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('shipments.listTitle')}</CardTitle>
            <CardDescription>{t('shipments.listDesc')}</CardDescription>
          </div>
          <Button onClick={handleCreateShipment}>
            <Plus className="mr-2 h-4 w-4" />
            {t('shipments.create')}
          </Button>
        </CardHeader>
        <CardContent>
          {shipments.length === 0 ? (
            <div className="text-center py-12">
              <Ship className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">{t('shipments.empty')}</p>
              <Button variant="outline" onClick={handleCreateShipment}>
                <Plus className="mr-2 h-4 w-4" />
                {t('shipments.create')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('shipments.columns.code')}</TableHead>
                  <TableHead>{t('shipments.columns.status')}</TableHead>
                  <TableHead>{t('shipments.columns.method')}</TableHead>
                  <TableHead>{t('shipments.columns.container')}</TableHead>
                  <TableHead>{t('shipments.columns.etd')}</TableHead>
                  <TableHead>{t('shipments.columns.eta')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.map((shipment) => {
                  const ShippingIcon = getShippingIcon(shipment.shipping_method)
                  return (
                    <TableRow 
                      key={shipment.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/shipments/${shipment.id}?order=${id}&project=${projectIdFromUrl}`)}
                    >
                      <TableCell className="font-mono font-medium">{shipment.code}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(shipment.status)}>
                          {t(`shipments.status.${shipment.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ShippingIcon className="h-4 w-4" />
                          <span>{shipment.shipping_method}</span>
                        </div>
                      </TableCell>
                      <TableCell>{shipment.container_number || '-'}</TableCell>
                      <TableCell>
                        {shipment.etd ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>{shipment.etd}</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {shipment.eta ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span>{shipment.eta}</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
