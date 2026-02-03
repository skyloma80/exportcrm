"use client"

/**
 * Purchase Order Form Component
 * 采购订单表单组件
 * 
 * 强制项目上下文：项目信息从 URL 参数获取，项目选择器已隐藏
 * Requirements: 3.1
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useProjectContext } from "@/hooks/use-project-context"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { CURRENCY_LIST } from "@/lib/constants/currencies"
import type { PurchaseOrder, POCreateInput } from "@/lib/pocketbase/services/purchase-orders"

interface Supplier {
  id: string
  code: string
  name: string
  name_cn?: string
}

interface Order {
  id: string
  code: string
  project: string
}

interface RFQ {
  id: string
  code: string
  project: string
}

export interface PurchaseOrderFormProps {
  initialData?: Partial<PurchaseOrder>
  onSubmit: (data: POCreateInput) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  /** 是否锁定项目字段（强制项目上下文，项目信息已在面包屑中展示） */
  projectLocked?: boolean
}

export function PurchaseOrderForm({ initialData, onSubmit, onCancel, isLoading }: PurchaseOrderFormProps) {
  const { t, locale } = useI18n()
  
  // 使用项目上下文 Hook - 项目信息从 URL 参数获取 (Requirements: 3.1)
  const { project: contextProject } = useProjectContext()
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  
  const [formData, setFormData] = useState({
    project: initialData?.project || "",
    supplier: initialData?.supplier || "",
    order: initialData?.order || "",
    rfq: initialData?.rfq || "",
    currency: initialData?.currency || "CNY", // 采购订单默认人民币
    total_amount: initialData?.total_amount || 0,
    expected_delivery_date: initialData?.expected_delivery_date || "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load suppliers only (项目从上下文获取)
  useEffect(() => {
    const loadData = async () => {
      try {
        const pb = getPocketBase()
        const suppliersRes = await pb.collection("suppliers").getFullList<Supplier>({ sort: "name" })
        setSuppliers(suppliersRes)
      } catch (err) {
        console.error("Error loading data:", err)
      }
    }
    loadData()
  }, [])

  // 当项目上下文加载完成时，更新表单数据并加载关联数据 (Requirements: 3.1)
  useEffect(() => {
    if (contextProject && !initialData?.project) {
      setFormData(prev => ({
        ...prev,
        project: contextProject.id,
      }))
      // 加载该项目的订单和询价单
      loadRelatedData(contextProject.id)
    } else if (initialData?.project) {
      // 编辑模式：加载初始项目的关联数据
      loadRelatedData(initialData.project)
    }
  }, [contextProject, initialData?.project])

  // Load orders and RFQs for a project
  const loadRelatedData = async (projectId: string) => {
    try {
      const pb = getPocketBase()
      const [ordersRes, rfqsRes] = await Promise.all([
        pb.collection("orders").getFullList<Order>({
          filter: `project = "${projectId}"`,
          sort: "-created",
        }),
        pb.collection("rfqs").getFullList<RFQ>({
          filter: `project = "${projectId}"`,
          sort: "-created",
        }),
      ])
      setOrders(ordersRes)
      setRfqs(rfqsRes)
    } catch (err) {
      console.error("Error loading related data:", err)
      setOrders([])
      setRfqs([])
    }
  }

  const getDisplayName = (item: { name: string; name_cn?: string }) => {
    return locale === 'zh' && item.name_cn ? item.name_cn : item.name
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.supplier) newErrors.supplier = t("validation.required")
    if (!formData.currency) newErrors.currency = t("validation.required")
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    
    await onSubmit({
      project: formData.project || undefined,
      supplier: formData.supplier,
      order: formData.order || undefined,
      rfq: formData.rfq || undefined,
      currency: formData.currency,
      total_amount: formData.total_amount,
      expected_delivery_date: formData.expected_delivery_date || undefined,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("purchaseOrders.info.basic")}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Supplier - 项目信息已在面包屑中展示，移除项目选择器 (Requirements: 3.1) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">{t("purchaseOrders.columns.supplier")} *</Label>
              <Select 
                value={formData.supplier} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, supplier: v }))}
              >
                <SelectTrigger className={errors.supplier ? "border-destructive" : ""}>
                  <SelectValue placeholder={t("purchaseOrders.placeholders.supplier")} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.code} - {getDisplayName(supplier)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.supplier && <p className="text-sm text-destructive">{errors.supplier}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">{t("purchaseOrders.columns.currency")} *</Label>
              <Select 
                value={formData.currency} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}
              >
                <SelectTrigger className={errors.currency ? "border-destructive" : ""}>
                  <SelectValue placeholder={t("purchaseOrders.placeholders.currency")} />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_LIST.map(currency => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.code} - {locale === 'zh' ? currency.name_cn : currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.currency && <p className="text-sm text-destructive">{errors.currency}</p>}
            </div>
          </div>

          {/* Related Order & RFQ (项目上下文已确定，显示关联选项) */}
          {formData.project && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order">{t("purchaseOrders.columns.order")}</Label>
                <Select 
                  value={formData.order || "_none_"} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, order: v === "_none_" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("purchaseOrders.placeholders.order")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">{locale === 'zh' ? '不关联销售订单' : 'No sales order'}</SelectItem>
                    {orders.map(order => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rfq">{t("purchaseOrders.columns.rfq")}</Label>
                <Select 
                  value={formData.rfq || "_none_"} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, rfq: v === "_none_" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("purchaseOrders.placeholders.rfq")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">{locale === 'zh' ? '不关联询价单' : 'No RFQ'}</SelectItem>
                    {rfqs.map(rfq => (
                      <SelectItem key={rfq.id} value={rfq.id}>
                        {rfq.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Amount & Delivery Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_amount">{t("purchaseOrders.columns.totalAmount")}</Label>
              <Input
                id="total_amount"
                type="number"
                step="0.01"
                min={0}
                value={formData.total_amount || ""}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  total_amount: e.target.value ? parseFloat(e.target.value) : 0 
                }))}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                {locale === 'zh' ? '添加产品明细后会自动计算' : 'Will be calculated after adding items'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_delivery_date">{t("purchaseOrders.columns.expectedDelivery")}</Label>
              <Input
                id="expected_delivery_date"
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("common.cancel")}
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t("common.loading") : t("common.save")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

export default PurchaseOrderForm
