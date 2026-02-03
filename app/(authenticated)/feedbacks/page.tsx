"use client"

/**
 * Feedbacks List Page
 * 反馈列表页 - 登录用户可以查看
 */

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  DataTable, 
  DataTableColumnHeader,
} from "@/components/data-table"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useAuth } from "@/components/auth-provider"
import { 
  MessageSquarePlus,
  Bug,
  Lightbulb,
  TrendingUp,
  HelpCircle,
  Eye,
} from "lucide-react"
import { FeedbackWithExpand, FeedbackType, FeedbackStatus } from "@/lib/pocketbase/services/feedbacks"
import { format } from "date-fns"
import { zhCN, enUS } from "date-fns/locale"
import { Button } from "@/components/ui/button"

// Type icons
const TYPE_ICONS = {
  bug: Bug,
  feature: Lightbulb,
  improvement: TrendingUp,
  other: HelpCircle,
} as const

// Status badge variants
const STATUS_VARIANTS: Record<FeedbackStatus, "default" | "secondary" | "destructive" | "outline"> = {
  new: "default",
  in_review: "secondary",
  planned: "outline",
  in_progress: "secondary",
  completed: "default",
  declined: "destructive",
}

// Filter options
const TYPE_OPTIONS = [
  { label: "Bug", value: "bug" },
  { label: "Feature", value: "feature" },
  { label: "Improvement", value: "improvement" },
  { label: "Other", value: "other" },
]

const STATUS_OPTIONS = [
  { label: "New", value: "new" },
  { label: "In Review", value: "in_review" },
  { label: "Planned", value: "planned" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Declined", value: "declined" },
]

export default function FeedbacksPage() {
  const router = useRouter()
  const { t, locale } = useI18n()
  const { user } = useAuth()
  const dateLocale = locale === "zh" ? zhCN : enUS
  
  const isAdmin = user?.role === "admin"

  // State
  const [data, setData] = useState<FeedbackWithExpand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const pb = getPocketBase()
      const results = await pb.collection("feedbacks").getList<FeedbackWithExpand>(1, 100, {
        sort: "-created",
        expand: "user,responded_by",
      })
      setData(results.items || [])
    } catch (err: any) {
      console.error("Error loading feedbacks:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  // Get type label
  const getTypeLabel = (type: FeedbackType) => {
    const labels: Record<FeedbackType, { zh: string; en: string }> = {
      bug: { zh: "Bug 报告", en: "Bug Report" },
      feature: { zh: "功能建议", en: "Feature Request" },
      improvement: { zh: "改进意见", en: "Improvement" },
      other: { zh: "其他", en: "Other" },
    }
    return locale === "zh" ? labels[type].zh : labels[type].en
  }

  // Get status label
  const getStatusLabel = (status: FeedbackStatus) => {
    const labels: Record<FeedbackStatus, { zh: string; en: string }> = {
      new: { zh: "新建", en: "New" },
      in_review: { zh: "审核中", en: "In Review" },
      planned: { zh: "已计划", en: "Planned" },
      in_progress: { zh: "进行中", en: "In Progress" },
      completed: { zh: "已完成", en: "Completed" },
      declined: { zh: "已拒绝", en: "Declined" },
    }
    return locale === "zh" ? labels[status].zh : labels[status].en
  }

  // Column definitions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: ColumnDef<FeedbackWithExpand, any>[] = useMemo(() => [
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={locale === "zh" ? "类型" : "Type"} />
      ),
      cell: ({ row }) => {
        const type = row.getValue("type") as FeedbackType
        const Icon = TYPE_ICONS[type]
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span>{getTypeLabel(type)}</span>
          </div>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={locale === "zh" ? "标题" : "Title"} />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("title") || (locale === "zh" ? "无标题" : "No title")}</span>
      ),
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={locale === "zh" ? "描述" : "Description"} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground truncate max-w-[300px] block">
          {row.getValue("description")}
        </span>
      ),
    },
    {
      id: "submitter",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={locale === "zh" ? "提交者" : "Submitter"} />
      ),
      cell: ({ row }) => {
        const user = row.original.expand?.user
        return (
          <span className="text-muted-foreground">
            {user?.name || user?.email || (locale === "zh" ? "匿名" : "Anonymous")}
          </span>
        )
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={locale === "zh" ? "状态" : "Status"} />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as FeedbackStatus
        return (
          <Badge variant={STATUS_VARIANTS[status]}>
            {getStatusLabel(status)}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "created",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={locale === "zh" ? "创建时间" : "Created"} />
      ),
      cell: ({ row }) => {
        const created = row.getValue("created") as string
        if (!created) return <span className="text-muted-foreground">-</span>
        return (
          <span className="text-muted-foreground">
            {format(new Date(created), "PP", { locale: dateLocale })}
          </span>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/feedbacks/${row.original.id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/feedbacks/${row.original.id}/edit`)}
            >
              {locale === "zh" ? "处理" : "Handle"}
            </Button>
          )}
        </div>
      ),
    },
  ], [locale, dateLocale, router, isAdmin])

  // Stats
  const newCount = data.filter(f => f.status === "new").length
  const inProgressCount = data.filter(f => ["in_review", "planned", "in_progress"].includes(f.status)).length
  const completedCount = data.filter(f => f.status === "completed").length

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquarePlus className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">
                {locale === "zh" ? "用户反馈" : "User Feedback"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {locale === "zh" 
                  ? "查看所有用户提交的反馈和建议" 
                  : "View all user submitted feedback and suggestions"}
              </p>
            </div>
          </div>
          <Button onClick={() => router.push("/feedbacks/new")}>
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            {locale === "zh" ? "新建反馈" : "New Feedback"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{locale === "zh" ? "总反馈数" : "Total"}</CardDescription>
            <CardTitle className="text-3xl">{data.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{locale === "zh" ? "新建" : "New"}</CardDescription>
            <CardTitle className="text-3xl">{newCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{locale === "zh" ? "处理中" : "In Progress"}</CardDescription>
            <CardTitle className="text-3xl">{inProgressCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{locale === "zh" ? "已完成" : "Completed"}</CardDescription>
            <CardTitle className="text-3xl">{completedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Error State */}
      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>{t("common.error")}: {error.message}</p>
              <Button variant="outline" onClick={loadData} className="mt-4">
                {t("common.retry")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DataTable */}
      <Card>
        <CardHeader>
          <CardTitle>{locale === "zh" ? "反馈列表" : "Feedback List"}</CardTitle>
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
              searchKey="title"
              filterableColumns={[
                {
                  id: "type",
                  title: locale === "zh" ? "类型" : "Type",
                  options: TYPE_OPTIONS.map(opt => ({
                    ...opt,
                    label: getTypeLabel(opt.value as FeedbackType),
                  })),
                },
                {
                  id: "status",
                  title: locale === "zh" ? "状态" : "Status",
                  options: STATUS_OPTIONS.map(opt => ({
                    ...opt,
                    label: getStatusLabel(opt.value as FeedbackStatus),
                  })),
                },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
