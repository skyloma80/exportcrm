"use client"

/**
 * RFQ Detail Page
 * 询价单详情页 - 简化版，只显示供应商报价表格
 * 
 * 强制项目上下文：必须通过 URL 参数 `project` 传递项目 ID，否则返回 404
 */

import { useState, useEffect } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { notFound } from "next/navigation"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { useProjectContext } from "@/hooks/use-project-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Edit,
  FileText,
  Building2,
  Loader2,
  CheckCircle,
} from "lucide-react"
import { rfqService, RFQWithExpand, RFQStatus } from "@/lib/pocketbase/services/rfqs"
import { useRFQItems, useRFQSuppliers, useRFQQuotations } from "@/hooks/collections/rfqs"
import { useToast } from "@/hooks/use-toast"
import { SupplierQuotationFiles } from "@/components/rfqs"

export default function RFQDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const { setItems: setBreadcrumb } = useBreadcrumb()
  const rfqId = params.id as string
  
  // 获取项目参数
  const projectIdFromUrl = searchParams.get("project")
  const returnTo = searchParams.get("returnTo")
  
  // 强制项目上下文：无项目参数返回 404
  if (!projectIdFromUrl) {
    notFound()
  }
  
  // 使用项目上下文 Hook 获取返回 URL
  const { 
    loading: contextLoading,
    returnUrl 
  } = useProjectContext({
    documentType: 'rfq'
  })

  const [rfq, setRfq] = useState<RFQWithExpand | null>(null)
  const [loading, setLoading] = useState(true)

  const { items } = useRFQItems(rfqId)
  const { suppliers, loading: suppliersLoading } = useRFQSuppliers(rfqId)
  const { quotations } = useRFQQuotations(rfqId)

  // Set breadcrumb when RFQ loads
  useEffect(() => {
    if (rfq) {
      setBreadcrumb([{ label: rfq.code }])
    }
    return () => setBreadcrumb([])
  }, [rfq, setBreadcrumb])

  useEffect(() => {
    loadRFQ()
  }, [rfqId])

  const loadRFQ = async () => {
    setLoading(true)
    try {
      const data = await rfqService.getWithDetails(rfqId)
      setRfq(data)
    } catch (error) {
      console.error("Error loading RFQ:", error)
      toast({
        title: t("common.error"),
        description: String(error),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  
  // 返回按钮导航 - 支持返回工作流
  const handleBack = () => {
    if (returnTo === 'workflow') {
      router.push(`/projects/${projectIdFromUrl}/workflow`)
    } else {
      router.push(returnUrl || `/projects/${projectIdFromUrl}?tab=rfqs`)
    }
  }

  const getStatusColor = (status: RFQStatus) => {
    const colors: Record<RFQStatus, string> = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      received: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }

  const getSupplierStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      received: "bg-green-100 text-green-800",
      selected: "bg-purple-100 text-purple-800",
      rejected: "bg-red-100 text-red-800",
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }

  const getDisplayName = (item: { name?: string; name_cn?: string }) => {
    if (locale === "zh" && item.name_cn) return item.name_cn
    return item.name || "-"
  }

  if (loading || contextLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!rfq) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-xl font-semibold mb-2">{t("rfqs.notFound")}</h2>
          <Button onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common.back")}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{rfq.code}</h1>
              <Badge variant="outline" className={getStatusColor(rfq.status)}>
                {t(`rfqs.status.${rfq.status}`)}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {rfq.expand?.project ? getDisplayName(rfq.expand.project) : "-"}
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push(`/rfqs/${rfq.id}/edit?project=${projectIdFromUrl}`)}>
            <Edit className="mr-2 h-4 w-4" />
            {t("common.edit")}
          </Button>
        </div>
      </div>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t("rfqs.suppliers.title")}
          </CardTitle>
          <CardDescription>{t("rfqs.suppliers.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {suppliersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>{t("rfqs.suppliers.empty")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{locale === 'zh' ? '供应商' : 'Supplier'}</TableHead>
                  <TableHead>{t("rfqs.columns.status")}</TableHead>
                  <TableHead>{locale === 'zh' ? '发送日期' : 'Sent Date'}</TableHead>
                  <TableHead>{locale === 'zh' ? '报价状态' : 'Quotation'}</TableHead>
                  <TableHead>{locale === 'zh' ? '报价文件' : 'Files'}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => {
                  const supplierQuotations = quotations.filter(q => q.supplier === supplier.supplier)
                  const hasQuotations = supplierQuotations.length > 0
                  const quotationTotal = supplierQuotations.reduce((sum, q) => {
                    const item = items.find(i => i.id === q.rfq_item)
                    return sum + (q.unit_price * (item?.quantity || 0))
                  }, 0)
                  
                  return (
                    <TableRow 
                      key={supplier.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/rfqs/${rfqId}/quotations/${supplier.supplier}?project=${projectIdFromUrl}${returnTo ? `&returnTo=${returnTo}` : ''}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {supplier.expand?.supplier ? getDisplayName(supplier.expand.supplier) : "-"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {supplier.expand?.supplier?.code}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getSupplierStatusColor(supplier.status)}>
                          {t(`rfqs.supplierStatus.${supplier.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {supplier.sent_at
                          ? new Date(supplier.sent_at).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {hasQuotations ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="text-sm text-muted-foreground">
                              {supplierQuotations.length}{locale === 'zh' ? '项' : ' items'} / ¥{quotationTotal.toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{locale === 'zh' ? '待报价' : 'Pending'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {rfq.expand?.project?.expand?.customer && rfq.expand?.project && supplier.expand?.supplier?.code && (
                          <SupplierQuotationFiles
                            customerName={getDisplayName(rfq.expand.project.expand.customer)}
                            projectName={getDisplayName(rfq.expand.project)}
                            rfqCode={rfq.code}
                            supplierCode={supplier.expand.supplier.code}
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/rfqs/${rfqId}/quotations/${supplier.supplier}?project=${projectIdFromUrl}${returnTo ? `&returnTo=${returnTo}` : ''}`)
                          }}
                        >
                          {hasQuotations 
                            ? (locale === 'zh' ? '编辑报价' : 'Edit') 
                            : (locale === 'zh' ? '录入报价' : 'Enter')
                          }
                        </Button>
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
