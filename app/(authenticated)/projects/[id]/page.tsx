"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useI18n } from "@/lib/i18n/use-i18n"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { Edit, FolderKanban, Building2, Package, Calendar, FileText, ShoppingCart, Truck, DollarSign, Loader2, Plus, Upload, Eye, Trash2, Layers, ClipboardList, Wand2, PlayCircle } from "lucide-react"
import { ViewDiskButton } from "@/components/disk/view-disk-button"
import { Project, ProjectStage, productProjectService } from "@/lib/pocketbase/services/projects"
import { ProductImportDialog } from "@/components/projects/product-import-dialog"
import { ProjectTimeline } from "@/components/projects/project-timeline"
import { MergeToQuotationDialog } from "@/components/rfqs/merge-to-quotation-dialog"
import { useToast } from "@/hooks/use-toast"
import { useTabState } from "@/hooks/use-tab-state"
import { Customer } from "@/lib/pocketbase/services/customers"
import { Product } from "@/lib/pocketbase/services/products"
import { DataTable, DataTableColumnHeader, DataTableRowActions } from "@/components/data-table"
import { Checkbox } from "@/components/ui/checkbox"
import { ColumnDef } from "@tanstack/react-table"
import type { RFQStatus } from "@/lib/pocketbase/services/rfqs"
import { UNITS } from "@/lib/constants/trade-standards"
import type { QuotationStatus } from "@/lib/pocketbase/services/quotations"
import type { OrderStatus } from "@/lib/pocketbase/services/orders"
import { useBreadcrumb } from "@/lib/breadcrumb/context"

interface ProductProject {
  id: string
  product: string
  project: string
  usage_note?: string
  expand?: { product?: Product }
}

interface RFQData {
  id: string
  code: string
  status: RFQStatus
  deadline?: string
  created: string
}

interface QuotationData {
  id: string
  code: string
  status: QuotationStatus
  total_amount: number
  currency: string
  version: number
  created: string
}



interface BusinessSummary {
  rfqs: { total: number; completed: number };
  quotations: { total: number; accepted: number };
}

interface TimelineEvent {
  id: string;
  type: 'rfq' | 'quotation';
  code: string;
  title: string;
  status: string;
  date: string;
  amount?: number;
  currency?: string;
}

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { t, locale } = useI18n()
  const id = params.id as string

  const { toast } = useToast()
  const { setItems: setBreadcrumb } = useBreadcrumb()
  const [project, setProject] = useState<Project | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [products, setProducts] = useState<ProductProject[]>([])
  const [rfqs, setRfqs] = useState<RFQData[]>([])
  const [quotations, setQuotations] = useState<QuotationData[]>([])
  const [summary, setSummary] = useState<BusinessSummary | null>(null)
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useTabState("info")
  const [selectedRfqIds, setSelectedRfqIds] = useState<string[]>([])
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)

  // Set breadcrumb when project loads
  // 面包屑结构：客户名称 > 项目名称
  useEffect(() => {
    if (project) {
      const projectDisplayName = locale === 'zh' && project.name_cn ? project.name_cn : project.name

      if (customer) {
        const customerDisplayName = locale === 'zh' && customer.name_cn ? customer.name_cn : customer.name
        setBreadcrumb([
          { label: customerDisplayName, href: `/customers/${customer.id}` },
          { label: projectDisplayName },
        ])
      } else {
        // 如果没有客户信息，只显示项目
        setBreadcrumb([
          { label: projectDisplayName },
        ])
      }
    }
    return () => setBreadcrumb([])
  }, [project, customer, setBreadcrumb, locale])

  // Product table columns - 与产品列表页保持一致
  const productColumns: ColumnDef<{
    id: string
    productId: string
    code: string
    part_number: string
    name: string
    name_cn: string
    description: string
    description_cn: string
    category: string
    unit: string
    hs_code: string
  }>[] = [
      {
        accessorKey: "code",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.columns.code")} />,
        cell: ({ row }) => <span className="font-mono text-sm">{row.getValue("code")}</span>,
      },
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.columns.name")} />,
        cell: ({ row }) => {
          const name = locale === 'zh' && row.original.name_cn ? row.original.name_cn : row.original.name
          return (
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{name}</span>
            </div>
          )
        },
      },
      {
        accessorKey: "part_number",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.columns.partNumber")} />,
        cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("part_number") || "-"}</span>,
      },
      {
        accessorKey: "description",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.columns.description")} />,
        cell: ({ row }) => {
          const desc = locale === 'zh' && row.original.description_cn ? row.original.description_cn : row.original.description
          return (
            <span className="text-muted-foreground max-w-[200px] truncate block" title={desc || "-"}>
              {desc || "-"}
            </span>
          )
        },
      },
      {
        accessorKey: "unit",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.columns.unit")} />,
        cell: ({ row }) => <span>{UNITS[row.getValue("unit") as string]?.name_cn || row.getValue("unit")}</span>,
      },
      {
        accessorKey: "hs_code",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.columns.hsCode")} />,
        cell: ({ row }) => <span className="font-mono text-sm">{row.getValue("hs_code") || "-"}</span>,
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/products/${row.original.productId}?project=${id}`)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleRemoveProduct(row.original.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ]

  // RFQ table columns with selection
  const rfqColumns: ColumnDef<RFQData>[] = useMemo(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={locale === 'zh' ? '全选' : 'Select all'}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          onClick={(e) => e.stopPropagation()}
          aria-label={locale === 'zh' ? '选择行' : 'Select row'}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "code",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("rfqs.columns.code")} />,
      cell: ({ row }) => <span className="font-mono text-sm">{row.getValue("code")}</span>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("rfqs.columns.status")} />,
      cell: ({ row }) => {
        const status = row.getValue("status") as RFQStatus
        const variant = status === 'completed' ? 'default' : status === 'cancelled' ? 'destructive' : 'outline'
        return <Badge variant={variant}>{t(`rfqs.status.${status}`)}</Badge>
      },
    },
    {
      accessorKey: "deadline",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("rfqs.columns.deadline")} />,
      cell: ({ row }) => {
        const deadline = row.getValue("deadline") as string
        return deadline ? new Date(deadline).toLocaleDateString() : "-"
      },
    },
    {
      accessorKey: "created",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("common.created")} />,
      cell: ({ row }) => new Date(row.getValue("created")).toLocaleDateString(),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onView={(item) => router.push(`/rfqs/${item.id}?project=${id}`)}
          onEdit={(item) => router.push(`/rfqs/${item.id}/edit?project=${id}`)}
        />
      ),
    },
  ], [t, router, locale, id])

  // Quotation table columns
  const quotationColumns: ColumnDef<QuotationData>[] = useMemo(() => [
    {
      accessorKey: "code",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("quotations.columns.code")} />,
      cell: ({ row }) => <span className="font-mono text-sm">{row.getValue("code")}</span>,
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
        const variant = status === 'accepted' ? 'default' : status === 'rejected' ? 'destructive' : 'outline'
        return <Badge variant={variant}>{t(`quotations.status.${status}`)}</Badge>
      },
    },
    {
      accessorKey: "total_amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("quotations.columns.totalAmount")} />,
      cell: ({ row }) => (
        <span className="font-medium">{formatCurrency(row.original.total_amount, row.original.currency)}</span>
      ),
    },
    {
      accessorKey: "created",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("common.created")} />,
      cell: ({ row }) => new Date(row.getValue("created")).toLocaleDateString(),
    },
  ], [t, locale, id])


  const handleRemoveProduct = async (ppId: string) => {
    try {
      await productProjectService.delete(ppId)
      toast({
        title: locale === 'zh' ? '移除成功' : 'Removed',
        description: locale === 'zh' ? '产品已从项目中移除' : 'Product removed from project',
      })
      loadData()
    } catch (error) {
      console.error('Error removing product:', error)
      toast({
        title: locale === 'zh' ? '移除失败' : 'Failed to remove',
        variant: 'destructive',
      })
    }
  }

  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const pb = getPocketBase()
      const [projectData, productsData] = await Promise.all([
        pb.collection("projects").getOne<Project>(id, { expand: "customer" }),
        pb.collection("products_projects").getFullList<ProductProject>({ filter: `project = "${id}"`, expand: "product" }),
      ])
      setProject(projectData)
      setCustomer((projectData as any).expand?.customer || null)
      setProducts(productsData)

      // Load business summary
      // 先获取项目的订单ID列表


      const [rfqsData, quotationsData] = await Promise.all([
        pb.collection("rfqs").getFullList<RFQData>({ filter: `project = "${id}"` }),
        pb.collection("quotations").getFullList<QuotationData>({ filter: `project = "${id}"` }),
      ])

      setRfqs(rfqsData)
      setQuotations(quotationsData)

      // Set business summary
      setSummary({
        rfqs: {
          total: rfqsData.length,
          completed: rfqsData.filter(r => r.status === 'completed').length,
        },
        quotations: {
          total: quotationsData.length,
          accepted: quotationsData.filter(q => q.status === 'accepted').length,
        },
      })

      // Build timeline events
      const events: TimelineEvent[] = [
        ...rfqsData.map((r) => ({
          id: r.id,
          type: 'rfq' as const,
          code: r.code,
          title: r.code,
          status: r.status,
          date: r.created,
        })),
        ...quotationsData.map((q) => ({
          id: q.id,
          type: 'quotation' as const,
          code: q.code,
          title: q.code,
          status: q.status,
          date: q.created,
          amount: q.total_amount,
          currency: q.currency,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      
      setTimelineEvents(events)
    } catch (err: any) {
      console.error("Error loading project:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const getDisplayName = () => {
    if (!project) return ""
    return locale === 'zh' && project.name_cn ? project.name_cn : project.name
  }

  const getStageVariant = (stage: ProjectStage) => {
    switch (stage) {
      case 'won': return 'default'
      case 'lost': return 'destructive'
      case 'on_hold': return 'secondary'
      default: return 'outline'
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).format(amount)
  }

  const handleImportProducts = async (productIds: string[]) => {
    try {
      for (const productId of productIds) {
        await productProjectService.addProductToProject(productId, id)
      }
      toast({
        title: locale === 'zh' ? '导入成功' : 'Import successful',
        description: locale === 'zh'
          ? `已导入 ${productIds.length} 个产品`
          : `Imported ${productIds.length} product(s)`,
      })
      // 先关闭对话框，再刷新数据
      setImportDialogOpen(false)
      loadData()
    } catch (error) {
      console.error('Error importing products:', error)
      toast({
        title: locale === 'zh' ? '导入失败' : 'Import failed',
        variant: 'destructive',
      })
      throw error
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>{t("common.error")}: {error?.message || t("projects.notFound")}</p>
              <Button variant="outline" onClick={() => router.back()} className="mt-4">{t("common.back")}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <FolderKanban className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-3xl font-bold">{getDisplayName()}</h1>
              <Badge variant={getStageVariant(project.stage)}>{t(`projects.stages.${project.stage}`)}</Badge>
            </div>
            <p className="text-muted-foreground mt-1 font-mono">{project.code}</p>
          </div>
          <ViewDiskButton
            type="project"
            customerName={customer?.name}
            projectName={project.name}
            label={locale === 'zh' ? '文件' : 'Files'}
          />
          {/* 工作流按钮暂时隐藏
          <Button variant="default" onClick={() => router.push(`/projects/${id}/workflow`)}>
            <PlayCircle className="mr-2 h-4 w-4" />
            {locale === 'zh' ? '工作流' : 'Workflow'}
          </Button>
          */}
          <Button variant="outline" onClick={() => router.push(`/projects/${id}/cost-table`)}>
            <ClipboardList className="mr-2 h-4 w-4" />
            {locale === 'zh' ? '采购成本表' : 'Cost Table'}
          </Button>
          <Button onClick={() => router.push(`/projects/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            {t("common.edit")}
          </Button>
        </div>
      </div>

      {/* Business Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t("projects.rfqs.title")}
              </CardDescription>
              <CardTitle className="text-2xl">{summary?.rfqs?.total ?? 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {summary?.rfqs?.completed ?? 0} {locale === 'zh' ? '已完成' : 'completed'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {t("projects.quotations.title")}
              </CardDescription>
              <CardTitle className="text-2xl">{summary?.quotations?.total ?? 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {summary?.quotations?.accepted ?? 0} {locale === 'zh' ? '已接受' : 'accepted'}
              </p>
            </CardContent>
          </Card>
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">{t("projects.tabs.info")}</TabsTrigger>
          <TabsTrigger value="timeline">{locale === 'zh' ? '时间线' : 'Timeline'}</TabsTrigger>
          <TabsTrigger value="products">{t("projects.tabs.products")}</TabsTrigger>
          <TabsTrigger value="rfqs">{t("projects.tabs.rfqs")}</TabsTrigger>
          <TabsTrigger value="quotations">{t("projects.tabs.quotations")}</TabsTrigger>

        </TabsList>

        <TabsContent value="info" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderKanban className="h-5 w-5" />
                  {t("projects.info.basic")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("projects.columns.name")}</p>
                    <p className="font-medium">{project.name}</p>
                  </div>
                  {project.name_cn && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t("projects.columns.nameCn")}</p>
                      <p className="font-medium">{project.name_cn}</p>
                    </div>
                  )}

                  {project.probability !== undefined && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t("projects.columns.probability")}</p>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{project.probability}%</span>
                      </div>
                    </div>
                  )}
                  {project.expected_close_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t("projects.columns.expectedClose")}</p>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{new Date(project.expected_close_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {locale === 'zh' ? '客户信息' : 'Customer'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {customer ? (
                  <div className="space-y-2">
                    <p className="font-medium">{locale === 'zh' && customer.name_cn ? customer.name_cn : customer.name}</p>
                    <p className="text-sm text-muted-foreground font-mono">{customer.code}</p>
                    <Button variant="link" className="p-0 h-auto" onClick={() => router.push(`/customers/${customer.id}`)}>
                      {t("common.view")}
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground">{t("common.noData")}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {(project.description || project.description_cn) && (
            <Card>
              <CardHeader>
                <CardTitle>{t("projects.info.description")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.description && <p className="whitespace-pre-wrap">{project.description}</p>}
                {project.description_cn && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t("projects.columns.descriptionCn")}</p>
                    <p className="whitespace-pre-wrap">{project.description_cn}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="timeline">
          <ProjectTimeline events={timelineEvents} />
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t("projects.products.title")}
              </CardTitle>
              <CardDescription>{t("projects.products.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg bg-muted/20">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {locale === 'zh' ? '开始添加产品' : 'Start Adding Products'}
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {locale === 'zh'
                      ? '产品是项目的核心。添加产品后，您可以创建询价、报价和订单。'
                      : 'Products are the core of your project. Add products to start creating RFQs, quotations, and orders.'}
                  </p>
                  <div className="flex justify-center gap-3">
                    <Button variant="outline" size="lg" onClick={() => setImportDialogOpen(true)}>
                      <Upload className="mr-2 h-4 w-4" />
                      {locale === 'zh' ? '从产品库导入' : 'Import from Library'}
                    </Button>
                    <Button size="lg" onClick={() => router.push(`/products/new?project=${id}`)}>
                      <Plus className="mr-2 h-4 w-4" />
                      {locale === 'zh' ? '创建新产品' : 'Create New Product'}
                    </Button>
                  </div>
                </div>
              ) : (
                <DataTable
                  columns={productColumns}
                  data={products.filter(pp => pp.expand?.product).map(pp => ({
                    id: pp.id,
                    productId: pp.expand?.product?.id || '',
                    code: pp.expand?.product?.code || '',
                    part_number: pp.expand?.product?.part_number || '',
                    name: pp.expand?.product?.name || '',
                    name_cn: pp.expand?.product?.name_cn || '',
                    description: pp.expand?.product?.description || '',
                    description_cn: pp.expand?.product?.description_cn || '',
                    category: pp.expand?.product?.category || '',
                    unit: pp.expand?.product?.unit || '',
                    hs_code: pp.expand?.product?.hs_code || '',
                  })) as {
                    id: string
                    productId: string
                    code: string
                    part_number: string
                    name: string
                    name_cn: string
                    description: string
                    description_cn: string
                    category: string
                    unit: string
                    hs_code: string
                  }[]}
                  searchKey="name"
                  actions={
                    <>
                      <Button variant="outline" size="sm" className="h-8" onClick={() => setImportDialogOpen(true)}>
                        <Upload className="mr-2 h-4 w-4" />
                        {locale === 'zh' ? '从产品库导入' : 'Import'}
                      </Button>
                      <Button size="sm" className="h-8" onClick={() => router.push(`/products/new?project=${id}`)}>
                        <Plus className="mr-2 h-4 w-4" />
                        {locale === 'zh' ? '添加产品' : 'Add Product'}
                      </Button>
                    </>
                  }
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rfqs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("projects.rfqs.title")}</CardTitle>
                <CardDescription>{t("projects.rfqs.description")}</CardDescription>
              </div>
              <div className="flex gap-2">
                {selectedRfqIds.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setMergeDialogOpen(true)}
                  >
                    <Layers className="mr-2 h-4 w-4" />
                    {locale === 'zh' ? `合并转报价 (${selectedRfqIds.length})` : `Merge to Quotation (${selectedRfqIds.length})`}
                  </Button>
                )}

                <Button onClick={() => router.push(`/rfqs/new?project=${id}`)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {locale === 'zh' ? '新建询价' : 'New RFQ'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {rfqs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">{t("projects.rfqs.empty")}</p>
              ) : (
                <DataTable
                  columns={rfqColumns}
                  data={rfqs}
                  searchKey="code"
                  onRowClick={(row) => router.push(`/rfqs/${row.id}?project=${id}`)}
                  onRowSelectionChange={(rows) => setSelectedRfqIds(rows.map(r => r.id))}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("projects.quotations.title")}</CardTitle>
                <CardDescription>{t("projects.quotations.description")}</CardDescription>
              </div>
              <Button onClick={() => router.push(`/quotations/new?project=${id}`)}>
                <Plus className="mr-2 h-4 w-4" />
                {locale === 'zh' ? '新建报价' : 'New Quotation'}
              </Button>
            </CardHeader>
            <CardContent>
              {quotations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">{t("projects.quotations.empty")}</p>
              ) : (
                <DataTable
                  columns={quotationColumns}
                  data={quotations}
                  searchKey="code"
                  onRowClick={(row) => router.push(`/quotations/${row.id}?project=${id}`)}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>




      </Tabs>

      {/* Product Import Dialog */}
      <ProductImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImportProducts}
        excludeProductIds={products.map(pp => pp.product)}
      />

      {/* Merge RFQs to Quotation Dialog */}
      <MergeToQuotationDialog
        open={mergeDialogOpen}
        onOpenChange={setMergeDialogOpen}
        rfqIds={selectedRfqIds}
        onSuccess={(quotationId) => {
          setSelectedRfqIds([])
          loadData()
          router.push(`/quotations/${quotationId}?project=${id}`)
        }}
      />
    </div>
  )
}
