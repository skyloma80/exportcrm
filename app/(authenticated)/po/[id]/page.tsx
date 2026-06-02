"use client"

import React, { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Edit, FileSpreadsheet, Copy, Loader2, Trash2, Building2, Calendar, Hash, Banknote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { poService, FlatPO } from "@/lib/pocketbase/services/po"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { format } from "date-fns"
import { UNITS } from "@/lib/constants/trade-standards"
import { CURRENCIES } from "@/lib/constants/currencies"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function PODetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { toast } = useToast()
  const { setItems: setBreadcrumb } = useBreadcrumb()
  
  const unwrappedParams = use(params)
  const poId = unwrappedParams.id
  const [po, setPo] = useState<FlatPO | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [copying, setCopying] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      console.log("Loading PO details for ID:", poId)
      try {
        const data = await poService.getOne(poId)
        console.log("Loaded PO data:", data)
        setPo(data as FlatPO)
        
        // Set breadcrumb with PO code
        if (data) {
          setBreadcrumb([
            { label: '采购订单', href: '/po' },
            { label: (data as any).code },
          ])
        }
      } catch (err: any) {
        console.error("Failed to load PO:", err)
        toast({
          title: "加载失败",
          description: String(err),
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }
    if (poId) {
      loadData()
    }
    return () => setBreadcrumb([])
  }, [poId, toast, setBreadcrumb])

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await fetch(`/api/po/${poId}/export-excel`, {
        method: "GET",
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const timestamp = format(new Date(), 'yyyyMMdd');
      a.download = `${timestamp} ${po?.code || 'PO'}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      console.error("Export error:", error)
      toast({
        title: "导出失败",
        description: String(error),
        variant: "destructive"
      })
    } finally {
      setExporting(false)
    }
  }

  const handleCopy = async () => {
    if (!po) return
    setCopying(true)
    try {
      const response = await fetch(`/api/po/${po.id}/copy`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to copy')
      }
      toast({
        title: "复制成功",
        description: `已复制到 ${data.order.code}`,
      })
      router.push(`/po/${data.order.id}`)
    } catch (error: any) {
      console.error('Copy error:', error)
      toast({
        title: "复制失败",
        description: String(error),
        variant: 'destructive',
      })
    } finally {
      setCopying(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`确定要删除采购订单 ${po?.code} 吗？此操作无法撤销。`)) {
      return
    }
    setDeleting(true)
    try {
      await poService.delete(poId)
      toast({ title: "删除成功" })
      router.push('/po')
    } catch (error: any) {
      toast({
        title: "删除失败",
        description: String(error),
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="p-6 flex justify-center">加载中...</div>
  if (!po) return <div className="p-6 flex justify-center">找不到采购订单</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/po')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{po.code}</h1>
            <p className="text-muted-foreground">{po.status.toUpperCase()}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopy} disabled={copying}>
            {copying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Copy className="w-4 h-4 mr-2" />}
            复制
          </Button>
          <Button variant="outline" onClick={() => router.push(`/po/${po.id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            编辑
          </Button>
          <Button variant="default" onClick={handleExport} disabled={exporting}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            {exporting ? '导出中...' : '导出 Excel'}
          </Button>
          {po.status === 'draft' && (
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              删除
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1.5">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  供应商
                </div>
                <div className="font-semibold text-base">{po.supplier_name}</div>
              </div>
              
              <div className="space-y-1.5">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  发货交货日期
                </div>
                <div className="font-semibold">
                  {po.expected_delivery_date ? format(new Date(po.expected_delivery_date), 'yyyy-MM-dd') : '-'}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5" />
                  订单号 (PO Code)
                </div>
                <div className="font-mono font-semibold">{po.code}</div>
              </div>

              <div className="space-y-1.5">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Banknote className="h-3.5 w-3.5" />
                  总金额
                </div>
                <div className="font-bold text-lg text-primary">
                  {CURRENCIES[po.currency]?.symbol || po.currency}{po.total_amount?.toFixed(2) || '0.00'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">产品明细</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">零件号</TableHead>
                    <TableHead className="w-[150px]">英文描述</TableHead>
                    <TableHead className="w-[150px]">中文描述</TableHead>
                    <TableHead className="w-[80px]">数量</TableHead>
                    <TableHead className="w-[80px]">单位</TableHead>
                    <TableHead className="w-[100px]">单价</TableHead>
                    <TableHead className="w-[100px]">总额</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {po.items && po.items.length > 0 ? (
                    po.items.map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{item.part_number || item.product_code}</TableCell>
                        <TableCell className="whitespace-pre-wrap">{item.description_en}</TableCell>
                        <TableCell className="whitespace-pre-wrap">{item.description_cn}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{UNITS[item.unit]?.name_cn || item.unit}</TableCell>
                        <TableCell>{CURRENCIES[po.currency]?.symbol || po.currency}{Number(item.unit_price).toFixed(2)}</TableCell>
                        <TableCell className="font-mono font-medium">{CURRENCIES[po.currency]?.symbol || po.currency}{item.amount?.toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">暂无产品明细</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">备注</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap p-4 bg-muted/30 rounded-lg min-h-[100px] border">
              {po.remarks || <span className="text-muted-foreground italic">无备注</span>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

