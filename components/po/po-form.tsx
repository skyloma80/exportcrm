"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Package } from "lucide-react"
import type { FlatPO, POCreateInput, POItem } from "@/lib/pocketbase/services/po"
import { SupplierSelect } from "@/components/ui/supplier-select"
import { useToast } from "@/hooks/use-toast"

const COMMON_CURRENCIES = ["USD", "CNY", "EUR", "GBP", "JPY", "AUD", "CAD"]

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { ProductSelectDialog } from "@/components/orders/product-select-dialog"
import { productService } from "@/lib/pocketbase/services/products"

export interface POFormProps {
  initialData?: Partial<FlatPO>
  onSubmit: (data: POCreateInput) => Promise<void>
  isLoading?: boolean
  /** 是否为编辑模式（隐藏code生成按钮，code只读） */
  isEdit?: boolean
}

export function POForm({ initialData, onSubmit, isLoading, isEdit }: POFormProps) {
  const [showProductSearch, setShowProductSearch] = useState(false)
  const { toast } = useToast()

  const formatDateForInput = (dateStr?: string): string => {
    if (!dateStr) return ""
    return dateStr.split(" ")[0].split("T")[0]
  }

  const [formData, setFormData] = useState({
    code: initialData?.code || "",
    supplier_id: initialData?.supplier_id || "",
    supplier_name: initialData?.supplier_name || "",
    currency: initialData?.currency || "CNY",
    expected_delivery_date: formatDateForInput(initialData?.expected_delivery_date),
    remarks: initialData?.remarks || "",
    status: initialData?.status || "draft",
  })

  const [items, setItems] = useState<POItem[]>(initialData?.items || [])

  // 兼容的 UUID 生成函数
  const generateId = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: generateId(),
        part_number: '',
        product_name: '',
        description_en: '',
        description_cn: '',
        quantity: 1,
        unit: 'PCS',
        unit_price: 0,
        amount: 0,
      }
    ])
  }

  const handleAddLibraryProducts = async (productIds: string[]) => {
    const products = await productService.getByIds(productIds)
    setItems(prev => [
      ...prev,
      ...products.map(product => ({
        id: generateId(),
        part_number: product.part_number || product.code || '',
        product_name: product.name || '',
        description_en: product.description_en || product.name || '',
        description_cn: product.description_cn || '',
        quantity: 1,
        unit: product.unit || 'PCS',
        unit_price: product.unit_price || 0,
        amount: product.unit_price || 0,
      }))
    ])
    setShowProductSearch(false)
  }


  const updateItem = (index: number, field: keyof POItem, value: any) => {
    setItems(prev => {
      const newItems = [...prev]
      const item = { ...newItems[index], [field]: value }

      if (field === 'quantity' || field === 'unit_price') {
        item.amount = (item.quantity || 0) * (item.unit_price || 0)
      }

      newItems[index] = item
      return newItems
    })
  }

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Only basic validation
    if (!formData.supplier_name) {
      alert("供应商名称必填")
      return
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0)

    const payload: POCreateInput = {
      code: formData.code || undefined,
      supplier_id: formData.supplier_id || undefined,
      supplier_name: formData.supplier_name,
      currency: formData.currency,
      expected_delivery_date: formData.expected_delivery_date ? new Date(formData.expected_delivery_date).toISOString() : undefined,
      remarks: formData.remarks,
      total_amount: totalAmount,
      status: formData.status as any,
      items: items
    }

    await onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>订单号 (PO Code)</Label>
              <Input
                value={formData.code || "保存时自动生成"}
                placeholder="PO-A2604-001"
                className="flex-1"
                readOnly
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label>币种 *</Label>
              <Select value={formData.currency} onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMMON_CURRENCIES.map(code => (
                    <SelectItem key={code} value={code}>{code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>供应商 *</Label>
              <SupplierSelect
                value={formData.supplier_id}
                onChange={(s) => {
                  setFormData(prev => ({
                    ...prev,
                    supplier_id: s?.id || "",
                    supplier_name: s?.name_cn || s?.name || prev.supplier_name
                  }))
                }}
                placeholder="选择或输入供应商"
              />

            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">产品明细</CardTitle>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowProductSearch(true)}>
              <Package className="w-4 h-4 mr-2" />
              产品库选择
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
              <Plus className="w-4 h-4 mr-2" />
              添加行
            </Button>
          </div>
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
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                      暂无产品明细
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => (
                    <TableRow key={item.id || index}>
                      <TableCell>
                        <Input value={item.part_number || ''} onChange={(e) => updateItem(index, 'part_number', e.target.value)} className="h-8" />
                      </TableCell>
                      <TableCell>
                        <Textarea value={item.description_en || ''} onChange={(e) => updateItem(index, 'description_en', e.target.value)} className="h-8 min-h-[2rem] resize-y" rows={1} />
                      </TableCell>
                      <TableCell>
                        <Textarea value={item.description_cn || ''} onChange={(e) => updateItem(index, 'description_cn', e.target.value)} className="h-8 min-h-[2rem] resize-y" rows={1} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)} className="h-8" />
                      </TableCell>
                      <TableCell>
                        <Input value={item.unit || ''} onChange={(e) => updateItem(index, 'unit', e.target.value)} className="h-8" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)} className="h-8" />
                      </TableCell>
                      <TableCell className="font-mono">
                        {item.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-8 w-8 text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
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
            <div className="space-y-2">
              <Label>交货日期</Label>
              <Input
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>备注</Label>
            <Textarea
              value={formData.remarks}
              onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isLoading} className="w-32">
          {isLoading ? '保存中...' : '保存'}
        </Button>
      </div>

      <ProductSelectDialog
        open={showProductSearch}
        onOpenChange={setShowProductSearch}
        onSelect={handleAddLibraryProducts}
      />
    </form>
  )
}
