"use client"

/**
 * Quotations List Page
 * 报价单列表页 - 全局只读视图
 */

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTable, DataTableColumnHeader } from "@/components/data-table"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { useI18n } from "@/lib/i18n/use-i18n"
import { Plus, FileText, Building2, FolderKanban, DollarSign, ArrowLeft, MoreHorizontal, Eye, Pencil, Trash2, Send, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import type { QuotationWithExpand, QuotationStatus } from "@/lib/pocketbase/services/quotations"

const QUOTATION_STATUSES: QuotationStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'revised']

export default function QuotationsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  
  // URL 参数
  const projectId = searchParams.get('project')
  const returnTo = searchParams.get('returnTo')
  const showBackButton = returnTo === 'workflow' && projectId
  
  const [data, setData] = useState<QuotationWithExpand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [selectProjectDialogOpen, setSelectProjectDialogOpen] = useState(false)

  useEffect(() => { loadData() }, [projectId])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const pb = getPocketBase()
      // 如果有项目参数，按项目过滤
      const filter = projectId ? `project = "${projectId}"` : ''
      const results = await pb.collection("quotations").getList<QuotationWithExpand>(1, 100, { 
        sort: "-created", 
        expand: "project,customer",
        filter,
      })
      setData(results.items || [])
      setTotalCount(results.totalItems || 0)
    } catch (err: any) {
      console.error("Error loading data:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  // 返回工作流页面
  const handleBack = () => {
    if (projectId) {
      router.push(`/projects/${projectId}/workflow`)
    }
  }

  const getProjectName = (project?: { name: string; name_cn?: string }) => {
    if (!project) return "-"
    return locale === 'zh' && project.name_cn ? project.name_cn : project.name
  }

  const getCustomerName = (customer?: { name: string; name_cn?: string }) => {
    if (!customer) return "-"
    return locale === 'zh' && customer.name_cn ? customer.name_cn : customer.name
  }

  const getStatusVariant = (status: QuotationStatus) => {
    switch (status) {
      case 'accepted': return 'default'
      case 'rejected': return 'destructive'
      case 'expired': return 'secondary'
      case 'sent': return 'outline'
      case 'revised': return 'secondary'
      default: return 'outline'
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
      style: 'currency',
      currency: currency || 'USD',
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Navigate to quotation with project parameter
  const navigateToQuotation = (quotation: QuotationWithExpand, path: string = "") => {
    const projectId = quotation.project
    const url = `/quotations/${quotation.id}${path}?project=${projectId}`
    router.push(url)
  }

  const columns: ColumnDef<QuotationWithExpand>[] = useMemo(() => [
    {
      accessorKey: "code",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("quotations.columns.code")} />,
      cell: ({ row }) => <span className="font-mono text-sm">{row.getValue("code")}</span>,
    },
    {
      accessorKey: "project",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("quotations.columns.project")} />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          <span>{getProjectName(row.original.expand?.project)}</span>
        </div>
      ),
    },
    {
      accessorKey: "customer",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("quotations.columns.customer")} />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span>{getCustomerName(row.original.expand?.customer)}</span>
        </div>
      ),
    },
    {
      accessorKey: "version",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("quotations.columns.version")} />,
      cell: ({ row }) => <span className="text-muted-foreground">v{row.getValue("version")}</span>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("quotations.columns.status")} />,
      cell: ({ row }) => {
        const status = row.getValue("status") as QuotationStatus
        return <Badge variant={getStatusVariant(status)}>{t(`quotations.status.${status}`)}</Badge>
      },
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: "incoterm",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("quotations.columns.incoterm")} />,
      cell: ({ row }) => <span className="font-mono">{row.getValue("incoterm")}</span>,
    },
    {
      accessorKey: "total_amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("quotations.columns.totalAmount")} />,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">
            {formatCurrency(row.original.total_amount, row.original.currency)}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const quotation = row.original
        const canSend = quotation.status === 'draft'
        const canAccept = quotation.status === 'sent'
        const canCreateOrder = quotation.status === 'sent' || quotation.status === 'accepted'
        const canReject = quotation.status === 'draft' || quotation.status === 'sent'
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigateToQuotation(quotation)}>
                <Eye className="mr-2 h-4 w-4" />
                {t("common.view")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigateToQuotation(quotation, "/edit")}>
                <Pencil className="mr-2 h-4 w-4" />
                {t("common.edit")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {canSend && (
                <DropdownMenuItem onClick={() => handleSend(quotation)}>
                  <Send className="mr-2 h-4 w-4" />
                  {t("quotations.actions.send")}
                </DropdownMenuItem>
              )}
              {canAccept && (
                <DropdownMenuItem onClick={() => handleAccept(quotation)}>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  {t("quotations.actions.accept") || "接受报价"}
                </DropdownMenuItem>
              )}
              {canCreateOrder && (
                <DropdownMenuItem 
                  onClick={() => handleCreateOrder(quotation)}
                  disabled={convertingId === quotation.id}
                >
                  <CheckCircle className="mr-2 h-4 w-4 text-blue-600" />
                  {convertingId === quotation.id 
                    ? (t("quotations.converting") || "转换中...") 
                    : (t("quotations.actions.createOrder") || "转订单")}
                </DropdownMenuItem>
              )}
              {/* 调试：显示当前状态 */}
              <DropdownMenuItem disabled>
                <span className="text-xs text-muted-foreground">
                  状态: {quotation.status} | 可转订单: {canCreateOrder ? '是' : '否'}
                </span>
              </DropdownMenuItem>
              {canReject && (
                <DropdownMenuItem onClick={() => handleReject(quotation)}>
                  <XCircle className="mr-2 h-4 w-4 text-red-600" />
                  {t("quotations.actions.reject")}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleDelete(quotation)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [t, locale, router])

  // 发送报价单（发邮件给客户）
  const handleSend = async (quotation: QuotationWithExpand) => {
    try {
      const pb = getPocketBase()
      await pb.collection("quotations").update(quotation.id, {
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      toast({ title: t("quotations.sendSuccess") })
      loadData()
    } catch (err) {
      console.error("Send error:", err)
      toast({ title: t("quotations.sendError"), variant: "destructive" })
    }
  }

  // 转订单（从报价单创建订单）
  const [convertingId, setConvertingId] = useState<string | null>(null)
  
  const handleCreateOrder = async (quotation: QuotationWithExpand) => {
    setConvertingId(quotation.id)
    try {
      const response = await fetch(`/api/quotations/${quotation.id}/convert-to-order`, {
        method: 'POST',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to convert to order')
      }
      const result = await response.json()
      toast({ 
        title: t("quotations.convertToOrderSuccess") || "转订单成功",
        description: result.order ? `订单号: ${result.order.code}` : undefined,
      })
      if (result.order) {
        router.push(`/orders/${result.order.id}?project=${quotation.project}`)
      }
    } catch (err: any) {
      console.error("Convert to order error:", err)
      toast({ 
        title: t("quotations.convertToOrderError") || "转订单失败", 
        description: err.message,
        variant: "destructive" 
      })
    } finally {
      setConvertingId(null)
    }
  }

  // 确认报价单（客户接受）
  const handleAccept = async (quotation: QuotationWithExpand) => {
    try {
      const pb = getPocketBase()
      await pb.collection("quotations").update(quotation.id, {
        status: 'accepted',
      })
      toast({ title: t("quotations.acceptSuccess") })
      loadData()
    } catch (err) {
      console.error("Accept error:", err)
      toast({ title: t("quotations.acceptError"), variant: "destructive" })
    }
  }

  // 拒绝报价单
  const handleReject = async (quotation: QuotationWithExpand) => {
    try {
      const pb = getPocketBase()
      await pb.collection("quotations").update(quotation.id, {
        status: 'rejected',
      })
      toast({ title: t("quotations.rejectSuccess") })
      loadData()
    } catch (err) {
      console.error("Reject error:", err)
      toast({ title: t("quotations.rejectError"), variant: "destructive" })
    }
  }

  const handleDelete = async (quotation: QuotationWithExpand) => {
    if (!confirm(t("quotations.deleteConfirm"))) return
    try {
      const pb = getPocketBase()
      await pb.collection("quotations").delete(quotation.id)
      loadData()
    } catch (err) {
      console.error("Delete error:", err)
      alert(t("quotations.deleteError"))
    }
  }

  // Stats by status
  const draftCount = data.filter(q => q.status === 'draft').length
  const sentCount = data.filter(q => q.status === 'sent').length
  const acceptedCount = data.filter(q => q.status === 'accepted').length

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {showBackButton && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold">{t("quotations.title")}</h1>
              <p className="text-muted-foreground mt-1">{t("quotations.description")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setSelectProjectDialogOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {t("quotations.newQuotation")}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("quotations.stats.total")}</CardDescription>
            <CardTitle className="text-3xl">{totalCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("quotations.stats.draft")}</CardDescription>
            <CardTitle className="text-3xl">{draftCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("quotations.stats.sent")}</CardDescription>
            <CardTitle className="text-3xl">{sentCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("quotations.stats.accepted")}</CardDescription>
            <CardTitle className="text-3xl">{acceptedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>{t("common.error")}: {error.message}</p>
              <Button variant="outline" onClick={loadData} className="mt-4">{t("common.retry")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("quotations.listTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-muted-foreground mt-2">{t("common.loading")}</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={data}
              searchKey="code"
              filterableColumns={[
                {
                  id: "status",
                  title: t("quotations.columns.status"),
                  options: QUOTATION_STATUSES.map(s => ({ 
                    label: t(`quotations.status.${s}`), 
                    value: s 
                  })),
                },
              ]}
              onRowClick={(row) => navigateToQuotation(row)}
            />
          )}
        </CardContent>
      </Card>

      {/* Select Project First Dialog */}
      <AlertDialog open={selectProjectDialogOpen} onOpenChange={setSelectProjectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.selectProjectFirst")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("quotations.selectProjectDescription") || "请先从项目详情页创建报价单，以便系统自动关联项目和客户信息。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push("/projects")}>
              {t("projects.title")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
