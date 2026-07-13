"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Package, Save, GripVertical, Building2 } from "lucide-react"
import type { FlatPO, POCreateInput, POItem } from "@/lib/pocketbase/services/po"
import { SupplierSelect } from "@/components/ui/supplier-select"
import { useToast } from "@/hooks/use-toast"
import { QUANTITY_UNITS } from "@/lib/constants/trade-standards"
import { CURRENCIES, COMMON_CURRENCIES } from "@/lib/constants/currencies"
import { getRate } from "@/lib/services/exchange-rate"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { ProductSelectDialog } from "@/components/orders/product-select-dialog"
import { productService } from "@/lib/pocketbase/services/products"

export interface POFormProps {
  initialData?: Partial<FlatPO>
  onSubmit: (data: POCreateInput) => Promise<void>
  isLoading?: boolean
  isEdit?: boolean
}

interface SortableItemProps {
  item: POItem & { _sortId: string }
  index: number
  currency: string
  updateItem: (index: number, field: keyof POItem, value: any) => void
  removeItem: (index: number) => void
}

function SortableItem({ item, index, currency, updateItem, removeItem }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item._sortId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  }

  const subtotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
  const currencySymbol = CURRENCIES[currency]?.symbol || currency

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-[40px]">
        <div {...attributes} {...listeners} className="flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-muted rounded p-1">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className="text-center font-medium text-muted-foreground w-[50px]">
        {index + 1}
      </TableCell>
      <TableCell>
        <Input
          value={item.part_number || ''}
          onChange={(e) => updateItem(index, 'part_number', e.target.value)}
          className="h-8 px-2 font-mono text-sm"
          placeholder="Part No."
        />
      </TableCell>
      <TableCell>
        <Textarea
          value={item.description_en || ''}
          onChange={(e) => updateItem(index, 'description_en', e.target.value)}
          className="min-h-[3rem] h-12 px-2 py-1 text-sm resize-y"
          rows={2}
        />
      </TableCell>
      <TableCell>
        <Textarea
          value={item.description_cn || ''}
          onChange={(e) => updateItem(index, 'description_cn', e.target.value)}
          className="min-h-[3rem] h-12 px-2 py-1 text-sm resize-y"
          rows={2}
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min="0"
          step="any"
          value={item.quantity || ''}
          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
          className="h-8 px-2 text-sm"
        />
      </TableCell>
      <TableCell>
        <Select
          value={item.unit || 'PCS'}
          onValueChange={(value) => updateItem(index, 'unit', value)}
        >
          <SelectTrigger className="h-8 px-2 text-sm">
            <SelectValue placeholder="PCS" />
          </SelectTrigger>
          <SelectContent>
            {QUANTITY_UNITS.map((u) => (
              <SelectItem key={u.code} value={u.code}>
                {u.code} ({u.name_cn})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min="0"
          step="any"
          value={item.unit_price || ''}
          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
          className="h-8 px-2 text-sm"
        />
      </TableCell>
      <TableCell className="text-right whitespace-nowrap font-medium">
        {currencySymbol}{subtotal.toFixed(2)}
      </TableCell>
      <TableCell>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={() => removeItem(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

export function POForm({ initialData, onSubmit, isLoading, isEdit }: POFormProps) {
  const { toast } = useToast()
  const [showProductSearch, setShowProductSearch] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const withSortId = (arr: POItem[]): (POItem & { _sortId: string })[] =>
    arr.map((item, i) => ({
      ...item,
      _sortId: (item as any)._sortId || item.id || `item-${i}-${Date.now()}`,
    }))

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
    vat_rate: initialData?.vat_rate ?? 13,
    remarks: initialData?.remarks || "",
    status: initialData?.status || "draft",
  })

  const [items, setItems] = useState<(POItem & { _sortId: string })[]>(
    withSortId(initialData?.items || [])
  )

  const [currentRate, setCurrentRate] = useState<number | null>(null)
  const [rateLoading, setRateLoading] = useState(false)

  useEffect(() => {
    const loadRate = async () => {
      if (formData.currency === 'CNY') { setCurrentRate(1); return }
      setRateLoading(true)
      try {
        const rate = await getRate(formData.currency, 'CNY')
        setCurrentRate(rate)
      } catch { setCurrentRate(null) }
      finally { setRateLoading(false) }
    }
    loadRate()
  }, [formData.currency])

  const generateId = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    return Math.random().toString(36).substr(2, 9)
  }

  const handleAddItem = () => {
    const _sortId = `new-${Date.now()}`
    setItems(prev => [
      ...prev,
      { _sortId, id: generateId(), part_number: '', product_name: '', description_en: '', description_cn: '', quantity: 1, unit: 'PCS', unit_price: 0, amount: 0 }
    ])
  }

  const handleAddLibraryProducts = async (productIds: string[]) => {
    const products = await productService.getByIds(productIds)
    setItems(prev => [
      ...prev,
      ...products.map((product, i) => ({
        _sortId: `lib-${Date.now()}-${i}`,
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
        item.amount = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
      }
      newItems[index] = item
      return newItems
    })
  }

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setItems(items => {
        const oldIndex = items.findIndex(item => item._sortId === active.id)
        const newIndex = items.findIndex(item => item._sortId === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.supplier_name) {
      toast({ title: "供应商必填", variant: "destructive" })
      return
    }
    const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0)
    const vatAmount = subtotal * ((Number(formData.vat_rate) || 0) / 100)
    const totalAmount = subtotal + vatAmount
    const payload: POCreateInput = {
      code: formData.code || undefined,
      supplier_id: formData.supplier_id || undefined,
      supplier_name: formData.supplier_name,
      currency: formData.currency,
      expected_delivery_date: formData.expected_delivery_date
        ? new Date(formData.expected_delivery_date).toISOString()
        : undefined,
      remarks: formData.remarks,
      vat_rate: Number(formData.vat_rate) || 0,
      subtotal,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      status: formData.status as any,
      items,
    }
    await onSubmit(payload)
  }

  const STATUS_LIST = ["draft", "confirmed", "in_production", "ready_to_ship", "shipped", "delivered", "completed", "cancelled"]
  const STATUS_LABELS: Record<string, string> = {
    draft: '草稿', confirmed: '已确认', in_production: '生产中',
    ready_to_ship: '待发货', shipped: '已发货', delivered: '已交付',
    completed: '已完成', cancelled: '已取消',
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ========== 基本信息（4列） ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            基本信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>供应商 <span className="text-destructive">*</span></Label>
              <SupplierSelect
                value={formData.supplier_id}
                onChange={(s) => setFormData(prev => ({
                  ...prev,
                  supplier_id: s?.id || "",
                  supplier_name: s?.name_cn || s?.name || prev.supplier_name
                }))}
                placeholder="选择或输入供应商"
              />
            </div>
            <div className="space-y-2">
              <Label>交货日期</Label>
              <Input
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>增值税率 (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.vat_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, vat_rate: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_LIST.map(s => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s] || s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>订单号</Label>
              <Input
                value={formData.code || "保存时自动生成"}
                readOnly
                disabled
                className="font-mono"
              />
            </div>
          </div>


        </CardContent>
      </Card>

      {/* ========== 产品明细（可拖动排序） ========== */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">产品明细</CardTitle>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowProductSearch(true)}>
              <Package className="w-4 h-4 mr-2" />
              从库中添加
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
              <Plus className="w-4 h-4 mr-2" />
              添加产品
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[50px] text-center">No.</TableHead>
                    <TableHead className="w-[120px]">零件号</TableHead>
                    <TableHead className="min-w-[120px]">英文描述</TableHead>
                    <TableHead className="min-w-[120px]">中文描述</TableHead>
                    <TableHead className="w-[110px]">数量</TableHead>
                    <TableHead className="w-[110px]">单位</TableHead>
                    <TableHead className="w-[140px]">单价</TableHead>
                    <TableHead className="text-right w-[130px]">小计</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        暂无产品，请点击右上角添加
                      </TableCell>
                    </TableRow>
                  ) : (
                    <SortableContext
                      items={items.map(item => item._sortId)}
                      strategy={verticalListSortingStrategy}
                    >
                      {items.map((item, index) => (
                        <SortableItem
                          key={item._sortId}
                          item={item}
                          index={index}
                          currency={formData.currency}
                          updateItem={updateItem}
                          removeItem={removeItem}
                        />
                      ))}
                    </SortableContext>
                  )}
                </TableBody>
              </Table>
            </DndContext>
          </div>

          {items.length > 0 && (() => {
            const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0)
            const vatRate = Number(formData.vat_rate) || 0
            const vatAmount = subtotal * (vatRate / 100)
            const total = subtotal + vatAmount
            const cs = CURRENCIES[formData.currency]?.symbol || formData.currency
            return (
              <div className="flex justify-end mt-4 pt-4 border-t">
                <div className="w-[280px] space-y-2 text-right">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">不含税金额：</span>
                    <span>{cs}{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">增值税（{vatRate}%）：</span>
                    <span>{cs}{vatAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-muted-foreground">含税总额：</span>
                    <span className="text-lg font-bold text-primary">{cs}{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )
          })()}
        </CardContent>
      </Card>

      {/* ========== 备注 ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">备注</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.remarks}
            onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
            rows={4}
            placeholder="填写备注信息..."
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading} size="lg" className="min-w-[200px]">
          <Save className="mr-2 h-5 w-5" />
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
