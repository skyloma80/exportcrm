"use client"

/**
 * RFQ List Page
 * 询价单列表页 - 全局只读视图
 * 
 * 支持 URL 参数:
 * - project: 按项目过滤
 * - returnTo: 返回目标 (workflow)
 */

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@/lib/i18n/use-i18n"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
} from "@/components/data-table"
import { FileText, Plus, Loader2, FileOutput, FolderKanban } from "lucide-react"
import { rfqService, RFQWithExpand, RFQStatus } from "@/lib/pocketbase/services/rfqs"
import { useToast } from "@/hooks/use-toast"
import { MergeToQuotationDialog } from "@/components/rfqs/merge-to-quotation-dialog"

const STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Received", value: "received" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
]

export default function RFQsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()
  const { toast } = useToast()

  // URL 参数
  const projectFilter = searchParams.get("project")
  const returnTo = searchParams.get("returnTo")

  const [rfqs, setRfqs] = useState<RFQWithExpand[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRfqIds, setSelectedRfqIds] = useState<string[]>([])
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)
  const [selectProjectDialogOpen, setSelectProjectDialogOpen] = useState(false)

  useEffect(() => {
    loadRFQs()
  }, [projectFilter])

  const loadRFQs = async () => {
    setLoading(true)
    try {
      let data: RFQWithExpand[]
      if (projectFilter) {
        // 按项目过滤
        data = await rfqService.getAllWithExpand(`project = "${projectFilter}"`)
      } else {
        data = await rfqService.getAllWithExpand()
      }
      setRfqs(data)
    } catch (error) {
      console.error("Error loading RFQs:", error)
      toast({
        title: t("common.error"),
        description: String(error),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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

  const getDisplayName = (item: { name?: string; name_cn?: string }) => {
    if (locale === "zh" && item.name_cn) return item.name_cn
    return item.name || "-"
  }

  const handleDelete = async (rfq: RFQWithExpand) => {
    if (!confirm(t("rfqs.deleteConfirm"))) return

    try {
      await rfqService.delete(rfq.id)
      toast({
        title: t("common.success"),
        description: t("rfqs.deleteSuccess") || "RFQ deleted successfully",
      })
      loadRFQs()
    } catch (error: any) {
      toast({
        title: t("rfqs.deleteError"),
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Handle row selection
  const handleRowSelectionChange = (selectedRows: RFQWithExpand[]) => {
    setSelectedRfqIds(selectedRows.map(r => r.id))
  }

  // Get selected RFQs
  const selectedRfqs = useMemo(() => {
    return rfqs.filter(r => selectedRfqIds.includes(r.id))
  }, [rfqs, selectedRfqIds])

  // Check if selected RFQs are from the same project
  const selectedProjectInfo = useMemo(() => {
    if (selectedRfqs.length === 0) return null
    
    const projectIds = new Set(selectedRfqs.map(r => r.project))
    if (projectIds.size > 1) {
      return { valid: false, message: "选中的询价单属于不同项目" }
    }
    
    const project = selectedRfqs[0].expand?.project
    return {
      valid: true,
      projectId: selectedRfqs[0].project,
      projectName: project ? getDisplayName(project) : "-",
    }
  }, [selectedRfqs])

  // Handle merge to quotation
  const handleMergeToQuotation = () => {
    if (!selectedProjectInfo?.valid) {
      toast({
        title: "无法合并",
        description: selectedProjectInfo?.message || "请选择同一项目的询价单",
        variant: "destructive",
      })
      return
    }
    setMergeDialogOpen(true)
  }

  // Navigate to RFQ with project parameter
  const navigateToRfq = (rfq: RFQWithExpand, path: string = "") => {
    const projectId = rfq.project
    let url = `/rfqs/${rfq.id}${path}?project=${projectId}`
    if (returnTo) {
      url += `&returnTo=${returnTo}`
    }
    router.push(url)
  }

  const columns: ColumnDef<RFQWithExpand>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label={t("common.selectAll")}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            onClick={(e) => e.stopPropagation()}
            aria-label={t("common.selectRow")}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("rfqs.columns.code")} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium">{row.getValue("code")}</span>
        ),
      },
      {
        id: "project",
        accessorFn: (row) => row.expand?.project?.name || "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("rfqs.columns.project")} />
        ),
        cell: ({ row }) => {
          const project = row.original.expand?.project
          return (
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
              <span>{project ? getDisplayName(project) : "-"}</span>
            </div>
          )
        },
      },
      {
        id: "customer",
        accessorFn: (row) => row.expand?.project?.expand?.customer?.name || "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("rfqs.columns.customer")} />
        ),
        cell: ({ row }) => {
          const customer = row.original.expand?.project?.expand?.customer
          return customer ? getDisplayName(customer) : "-"
        },
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("rfqs.columns.status")} />
        ),
        cell: ({ row }) => {
          const status = row.getValue("status") as RFQStatus
          return (
            <Badge variant="outline" className={getStatusColor(status)}>
              {t(`rfqs.status.${status}`)}
            </Badge>
          )
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id))
        },
      },
      {
        accessorKey: "deadline",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("rfqs.columns.deadline")} />
        ),
        cell: ({ row }) => {
          const deadline = row.getValue("deadline") as string
          return deadline ? new Date(deadline).toLocaleDateString() : "-"
        },
      },
      {
        accessorKey: "created",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("common.created")} />
        ),
        cell: ({ row }) => new Date(row.getValue("created")).toLocaleDateString(),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <DataTableRowActions
            row={row}
            onView={(item) => navigateToRfq(item)}
            onEdit={(item) => navigateToRfq(item, "/edit")}
            onDelete={(item) => handleDelete(item)}
          />
        ),
      },
    ],
    [t, locale, router]
  )

  // Stats
  const stats = {
    total: rfqs.length,
    draft: rfqs.filter((r) => r.status === "draft").length,
    sent: rfqs.filter((r) => r.status === "sent").length,
    completed: rfqs.filter((r) => r.status === "completed").length,
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("rfqs.title")}</h1>
            <p className="text-muted-foreground mt-1">
              {projectFilter 
                ? (locale === 'zh' ? '当前项目的询价单' : 'RFQs for current project')
                : t("rfqs.description")
              }
            </p>
          </div>
          <div className="flex gap-2">
            {selectedRfqIds.length > 0 && (
              <Button
                variant="outline"
                onClick={handleMergeToQuotation}
                disabled={!selectedProjectInfo?.valid}
              >
                <FileOutput className="mr-2 h-4 w-4" />
                转换为报价 ({selectedRfqIds.length})
              </Button>
            )}
            <Button onClick={() => setSelectProjectDialogOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {t("rfqs.newRfq")}
            </Button>
          </div>
        </div>
        
        {/* Selection info */}
        {selectedRfqIds.length > 0 && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <span className="text-sm">
              已选择 {selectedRfqIds.length} 个询价单
              {selectedProjectInfo?.valid && (
                <span className="text-muted-foreground ml-2">
                  (同一项目: {selectedProjectInfo.projectName})
                </span>
              )}
              {!selectedProjectInfo?.valid && selectedProjectInfo?.message && (
                <span className="text-destructive ml-2">
                  ({selectedProjectInfo.message})
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("rfqs.stats.total")}</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("rfqs.stats.draft")}</CardDescription>
            <CardTitle className="text-3xl">{stats.draft}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("rfqs.stats.sent")}</CardDescription>
            <CardTitle className="text-3xl">{stats.sent}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("rfqs.stats.completed")}</CardDescription>
            <CardTitle className="text-3xl">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* DataTable */}
      <Card>
        <CardHeader>
          <CardTitle>{t("rfqs.listTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground mt-2">{t("common.loading")}</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={rfqs}
              searchKey="code"
              filterableColumns={[
                {
                  id: "status",
                  title: t("rfqs.columns.status"),
                  options: STATUS_OPTIONS.map((opt) => ({
                    ...opt,
                    label: t(`rfqs.status.${opt.value}`),
                  })),
                },
              ]}
              onRowClick={(row) => navigateToRfq(row)}
              onRowSelectionChange={handleRowSelectionChange}
            />
          )}
        </CardContent>
      </Card>

      {/* Merge to Quotation Dialog */}
      <MergeToQuotationDialog
        open={mergeDialogOpen}
        onOpenChange={setMergeDialogOpen}
        rfqIds={selectedRfqIds}
        onSuccess={(quotationId) => {
          setSelectedRfqIds([])
          router.push(`/quotations/${quotationId}`)
        }}
      />

      {/* Select Project First Dialog */}
      <AlertDialog open={selectProjectDialogOpen} onOpenChange={setSelectProjectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.selectProjectFirst")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("rfqs.selectProjectDescription") || "请先从项目详情页创建询价单，以便系统自动关联项目信息。"}
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
