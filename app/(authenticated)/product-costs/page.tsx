"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DataTable,
  DataTableColumnHeader,
} from "@/components/data-table"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { useI18n } from "@/lib/i18n/use-i18n"
import { DollarSign, Star, Package, Factory } from "lucide-react"
import { ProductCostWithExpand } from "@/lib/pocketbase/services/product-costs"

export default function ProductCostsPage() {
  const router = useRouter()
  const { t, locale } = useI18n()

  const [data, setData] = useState<ProductCostWithExpand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const pb = getPocketBase()
      const all = await pb.collection("product_costs").getFullList<ProductCostWithExpand>({
        sort: "-valid_from",
        expand: "product,supplier",
      })
      // 每个产品+供应商组合取最新的一条
      const latestMap = new Map<string, ProductCostWithExpand>()
      for (const r of all) {
        const key = `${r.product}|${r.supplier}`
        if (!latestMap.has(key)) latestMap.set(key, r)
      }
      setData(Array.from(latestMap.values()))
    } catch (err: any) {
      console.error("Error loading product costs:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const getDisplayName = (obj: { name: string; name_cn?: string } | undefined) => {
    if (!obj) return "-"
    return locale === "zh" && obj.name_cn ? obj.name_cn : obj.name
  }

  const currencySymbol = (c?: string) => {
    if (c === "CNY") return "¥"
    if (c === "EUR") return "€"
    return "$"
  }

  const getTierSummary = (tiers?: { minQty: number; unitPrice: number }[], currency?: string) => {
    if (!tiers || tiers.length === 0) return "-"
    const active = tiers.filter((t) => t.unitPrice > 0)
    if (active.length === 0) return "-"
    const sym = currencySymbol(currency)
    if (active.length === 1 && active[0].minQty <= 1) return `${sym}${active[0].unitPrice.toFixed(2)}`
    return active.map((t) => `${t.minQty}+ = ${sym}${t.unitPrice.toFixed(2)}`).join(", ")
  }

  const columns: ColumnDef<ProductCostWithExpand>[] = useMemo(() => [
    {
      accessorKey: "product",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.columns.name")} />,
      cell: ({ row }) => {
        const p = row.original.expand?.product
        return (
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{getDisplayName(p)}</span>
            {p?.code && <span className="text-xs text-muted-foreground font-mono">{p.code}</span>}
          </div>
        )
      },
    },
    {
      accessorKey: "supplier",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.costs.supplier")} />,
      cell: ({ row }) => {
        const s = row.original.expand?.supplier
        return (
          <div className="flex items-center gap-2">
            <Factory className="h-4 w-4 text-muted-foreground" />
            <span>{getDisplayName(s)}</span>
          </div>
        )
      },
    },
    {
      id: "price",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.costs.unitPrice")} />,
      cell: ({ row }) => <span className="max-w-[200px] truncate block">{getTierSummary(row.original.tiers, row.original.currency)}</span>,
    },
    {
      accessorKey: "moq",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.costs.moq")} />,
      cell: ({ row }) => <span className="text-right">{row.original.moq || "-"}</span>,
    },
    {
      accessorKey: "lead_time_days",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.costs.leadTime")} />,
      cell: ({ row }) => <span>{row.original.lead_time_days ? `${row.original.lead_time_days}d` : "-"}</span>,
    },
    {
      id: "preferred",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.costs.preferred")} />,
      cell: ({ row }) =>
        row.original.is_preferred ? (
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
  ], [t, locale])

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-3xl font-bold">{t("nav.productCosts")}</h1>
            <p className="text-muted-foreground mt-1">{t("products.costs.title")}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {(() => {
        const uniqueProducts = new Set(data.map(d => d.product)).size
        const uniqueSuppliers = new Set(data.map(d => d.supplier)).size
        const preferredCount = data.filter(d => d.is_preferred).length
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {locale === "zh" ? "有报价的产品" : "Products with Costs"}
                </CardDescription>
                <CardTitle className="text-3xl">{uniqueProducts}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Factory className="h-3 w-3" />
                  {locale === "zh" ? "供应商数" : "Suppliers"}
                </CardDescription>
                <CardTitle className="text-3xl">{uniqueSuppliers}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {locale === "zh" ? "首选供应商" : "Preferred"}
                </CardDescription>
                <CardTitle className="text-3xl">{preferredCount}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        )
      })()}

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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-muted-foreground mt-2">{t("common.loading")}</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data}
          searchKey="product"
          filterableColumns={[]}
          onRowClick={(record) => router.push(`/products/${record.product}`)}
        />
      )}
    </div>
  )
}
