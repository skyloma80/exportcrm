"use client"

import React, { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Edit, FileSpreadsheet, Download, Copy, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { poService, FlatPO } from "@/lib/pocketbase/services/po"
import { format } from "date-fns"
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
  
  const unwrappedParams = use(params)
  const poId = unwrappedParams.id
  const [po, setPo] = useState<FlatPO | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [copying, setCopying] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      console.log("Loading PO details for ID:", poId)
      try {
        const data = await poService.getOne(poId)
        console.log("Loaded PO data:", data)
        setPo(data as FlatPO)
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
  }, [poId, toast])

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
      a.download = `${po?.code || 'PO'}.xlsx`
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

  if (loading) return <div className="p-6 flex justify-center">加载中...</div>
  if (!po) return <div className="p-6 flex justify-center">找不到采购订单</div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
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
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">订单号 (PO Code)</div>
                <div className="font-medium text-lg">{po.code}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">币种</div>
                <div className="font-medium">{po.currency}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">供应商</div>
                <div className="font-medium">{po.supplier_name}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">总金额</div>
                <div className="font-medium text-lg text-primary">{po.currency} {po.total_amount?.toFixed(2) || '0.00'}</div>
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
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>{item.unit_price}</TableCell>
                        <TableCell className="font-mono">{item.amount?.toFixed(2)}</TableCell>
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
            <CardTitle className="text-base">交货与备注</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">交货日期</div>
                <div className="font-medium">
                  {po.expected_delivery_date ? format(new Date(po.expected_delivery_date), 'yyyy-MM-dd') : '-'}
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">备注</div>
              <div className="whitespace-pre-wrap mt-1 p-3 bg-muted/30 rounded-md min-h-[60px]">
                {po.remarks || <span className="text-muted-foreground italic">无备注</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

