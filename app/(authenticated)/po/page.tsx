"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Eye, FileSpreadsheet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Card } from "@/components/ui/card"
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

export default function POListPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [pos, setPos] = useState<FlatPO[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await poService.getList({ page: 1, perPage: 50, sort: '-created' })
        setPos(data.items as FlatPO[])
      } catch (err: any) {
        toast({
          title: "加载失败",
          description: String(err),
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [toast])

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">采购订单</h1>
          <p className="text-muted-foreground mt-1">
            管理所有采购订单 (扁平化架构)
          </p>
        </div>
        <Button onClick={() => router.push('/po/new')}>
          <Plus className="w-4 h-4 mr-2" />
          新建订单
        </Button>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>订单号</TableHead>
                <TableHead>供应商</TableHead>
                <TableHead>总金额</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>交货期</TableHead>
                <TableHead className="w-[150px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">加载中...</TableCell>
                </TableRow>
              ) : pos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">暂无采购订单</TableCell>
                </TableRow>
              ) : (
                pos.map(po => (
                  <TableRow key={po.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/po/${po.id}`)}>
                    <TableCell className="font-medium">{po.code}</TableCell>
                    <TableCell>{po.supplier_name}</TableCell>
                    <TableCell className="font-mono">{po.currency} {po.total_amount?.toFixed(2)}</TableCell>
                    <TableCell>{po.status}</TableCell>
                    <TableCell>{po.expected_delivery_date ? format(new Date(po.expected_delivery_date), 'yyyy-MM-dd') : '-'}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => router.push(`/po/${po.id}`)}>
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
