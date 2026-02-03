"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DataTable, DataTableColumnHeader, DataTableRowActions } from "@/components/data-table"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { useI18n } from "@/lib/i18n/use-i18n"
import { Plus, FolderKanban, Building2, Calendar } from "lucide-react"
import { Project, PROJECT_STAGES, ProjectStage } from "@/lib/pocketbase/services/projects"
import { Customer } from "@/lib/pocketbase/services/customers"

export default function ProjectsPage() {
  const router = useRouter()
  const { t, locale } = useI18n()
  
  const [data, setData] = useState<(Project & { expand?: { customer?: Customer } })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const pb = getPocketBase()
      const results = await pb.collection("projects").getList<Project & { expand?: { customer?: Customer } }>(1, 100, { sort: "-created", expand: "customer" })
      setData(results.items || [])
      setTotalCount(results.totalItems || 0)
    } catch (err: any) {
      console.error("Error loading data:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const getDisplayName = (project: Project) => locale === 'zh' && project.name_cn ? project.name_cn : project.name
  const getCustomerName = (customer?: Customer) => {
    if (!customer) return "-"
    return locale === 'zh' && customer.name_cn ? customer.name_cn : customer.name
  }

  const getStageVariant = (stage: ProjectStage) => {
    switch (stage) {
      case 'won': return 'default'
      case 'lost': return 'destructive'
      case 'on_hold': return 'secondary'
      default: return 'outline'
    }
  }


  const columns: ColumnDef<Project & { expand?: { customer?: Customer } }>[] = useMemo(() => [
    {
      accessorKey: "code",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("projects.columns.code")} />,
      cell: ({ row }) => <span className="font-mono text-sm">{row.getValue("code")}</span>,
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("projects.columns.name")} />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{getDisplayName(row.original)}</span>
        </div>
      ),
    },
    {
      accessorKey: "customer",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("projects.columns.customer")} />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span>{getCustomerName(row.original.expand?.customer)}</span>
        </div>
      ),
    },
    {
      accessorKey: "stage",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("projects.columns.stage")} />,
      cell: ({ row }) => {
        const stage = row.getValue("stage") as ProjectStage
        return <Badge variant={getStageVariant(stage)}>{t(`projects.stages.${stage}`)}</Badge>
      },
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: "probability",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("projects.columns.probability")} />,
      cell: ({ row }) => {
        const prob = row.getValue("probability") as number | undefined
        return prob !== undefined ? `${prob}%` : "-"
      },
    },
    {
      accessorKey: "expected_close_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("projects.columns.expectedClose")} />,
      cell: ({ row }) => {
        const date = row.getValue("expected_close_date") as string | undefined
        if (!date) return "-"
        return (
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            {new Date(date).toLocaleDateString()}
          </div>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onView={(item) => router.push(`/projects/${item.id}`)}
          onEdit={(item) => router.push(`/projects/${item.id}/edit`)}
          onDelete={(item) => handleDelete(item)}
        />
      ),
    },
  ], [t, locale, router])


  const handleDelete = async (project: Project) => {
    if (!confirm(t("projects.deleteConfirm"))) return
    try {
      const pb = getPocketBase()
      await pb.collection("projects").delete(project.id)
      loadData()
    } catch (err) {
      console.error("Delete error:", err)
      alert(t("projects.deleteError"))
    }
  }

  // Stats by stage
  const wonCount = data.filter(p => p.stage === 'won').length
  const activeCount = data.filter(p => ['inquiry', 'quotation', 'negotiation'].includes(p.stage)).length
  const leadCount = data.filter(p => p.stage === 'lead').length

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("projects.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("projects.description")}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => router.push("/projects/new")} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {t("projects.newProject")}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("projects.stats.total")}</CardDescription>
            <CardTitle className="text-3xl">{totalCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("projects.stats.active")}</CardDescription>
            <CardTitle className="text-3xl">{activeCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("projects.stats.won")}</CardDescription>
            <CardTitle className="text-3xl">{wonCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("projects.stats.leads")}</CardDescription>
            <CardTitle className="text-3xl">{leadCount}</CardTitle>
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
          <CardTitle>{t("projects.listTitle")}</CardTitle>
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
              searchKey="name"
              filterableColumns={[
                {
                  id: "stage",
                  title: t("projects.columns.stage"),
                  options: PROJECT_STAGES.map(s => ({ label: t(`projects.stages.${s.value}`), value: s.value })),
                },
              ]}
              onRowClick={(row) => router.push(`/projects/${row.id}`)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
