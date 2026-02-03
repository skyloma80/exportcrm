'use client'

/**
 * New Quotation Page - 一站式报价单创建
 * 
 * 强制项目上下文：必须通过 URL 参数 `project` 传递项目 ID，否则返回 404
 * Requirements: 1.2, 3.1, 3.2, 4.1
 * 
 * **架构参考**: design.md > Architecture > 组件架构
 * 
 * 组件层次结构:
 * QuotationNewPage
 * └── QuotationEditor
 *     ├── ShippingInfoSection (装运港/目的港 + 重量/体积)
 *     ├── GlobalMarginControl (全局利润率)
 *     ├── QuotationItemsTable (产品明细)
 *     ├── CostBreakdownSection (费用分解)
 *     ├── MoldCostsSection (模具费用)
 *     └── TotalSummary (总计汇总)
 * └── ActionButtons (保存草稿/提交)
 */

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { notFound } from 'next/navigation'
import { useI18n } from '@/lib/i18n/use-i18n'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Save, Ship, ClipboardList, Coins } from 'lucide-react'

// 组件导入
import { PortSelect } from '@/components/ui/port-select'
import { PaymentTermsSelect } from '@/components/ui/payment-terms-select'
import { QuotationItemsTable } from '@/components/quotations/quotation-items-table'
import { CostBreakdownSection } from '@/components/quotations/cost-breakdown-section'
import { ImportFromCostTableDialog, ImportedCostItem } from '@/components/quotations/import-from-cost-table-dialog'

// 工具函数导入
import {
  QuotationItemData,
  applyGlobalProfitMargin,
  recalculateItemsWithExchangeRate,
  calculateUnitPriceFromMargin,
} from '@/lib/quotation/calculations'
import { validateQuotationForm } from '@/lib/quotation/validation'
import { createQuotationWithItems } from '@/lib/pocketbase/services/quotations'
import { getPocketBase } from '@/lib/pocketbase/auth'
import { CURRENCIES, COMMON_CURRENCIES } from '@/lib/constants/currencies'
import { getRateWithRefresh } from '@/lib/services/exchange-rate'
import { findCurrencyByCode, INCOTERMS } from '@/lib/constants/trade-constants'
import { useBreadcrumb } from '@/lib/breadcrumb/context'
import { useProjectContext } from '@/hooks/use-project-context'

// 类型定义 (参考 design.md > Components and Interfaces)
interface Project {
  id: string
  code: string
  name: string
  name_cn?: string
  customer: string
  expand?: {
    customer?: Customer
  }
}

interface Customer {
  id: string
  code: string
  name: string
  name_cn?: string
  preferred_currency?: string
}

interface QuotationNewPageState {
  // 基础信息
  projectId: string
  customerId: string
  customerName: string

  // 贸易条款
  incoterm: string
  portOfLoading: string
  portOfDestination: string
  currency: string
  exchangeRate: number
  validityDays: number
  paymentTerms: string

  // 产品明细
  items: QuotationItemData[]

  // 费用分解
  costBreakdown: Record<string, number>

  // 物流信息
  totalWeight: number | null
  totalVolume: number | null
  manualWeight: boolean
  manualVolume: boolean

  // 利润率
  globalProfitMargin: number

  // 交货期和备注
  deliveryTime: string
  remarks: string

  // UI 状态
  loading: boolean
  errors: Record<string, string>
  costCurrency: string
}

export default function NewQuotationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const { setItems: setBreadcrumb } = useBreadcrumb()

  // Get URL parameters for pre-filling from RFQ
  const projectIdFromUrl = searchParams.get('project')
  const fromRfqId = searchParams.get('fromRfq')

  // 强制项目上下文：无项目参数返回 404 (Requirements: 1.2)
  if (!projectIdFromUrl) {
    notFound()
  }

  // 使用项目上下文 Hook 获取面包屑和返回 URL
  const { returnUrl } = useProjectContext({
    documentType: 'quotation',
    currentPageLabel: t("quotations.new")
  })

  // 数据加载状态
  const [rateLoading, setRateLoading] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [hasCostTable, setHasCostTable] = useState(false)

  // 页面状态 (参考 design.md > QuotationNewPageState)
  const [state, setState] = useState<QuotationNewPageState>({
    projectId: '',
    customerId: '',
    customerName: '',
    incoterm: 'FOB',
    portOfLoading: '',
    portOfDestination: '',
    currency: 'USD',
    exchangeRate: 1,
    validityDays: 30,
    paymentTerms: '',
    items: [],
    costBreakdown: {},
    totalWeight: null,
    totalVolume: null,
    manualWeight: false,
    manualVolume: false,
    globalProfitMargin: 20,
    deliveryTime: '',
    remarks: '',
    loading: false,
    errors: {},
    costCurrency: 'CNY',
  })

  // 设置面包屑 (Requirements: 2.1)
  // 注意：只设置当前页面标签，客户和项目信息由 layout 根据 URL 参数自动添加
  useEffect(() => {
    setBreadcrumb([
      { label: t("quotations.new") },
    ])
    return () => setBreadcrumb([])
  }, [setBreadcrumb, t])

  // 加载项目列表
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const pb = getPocketBase()
        const projectsRes = await pb.collection('projects').getFullList<Project>({
          sort: '-id',
          expand: 'customer',
        })

        // Auto-select project from URL parameter (强制项目上下文)
        if (projectIdFromUrl && projectsRes.length > 0) {
          const project = projectsRes.find(p => p.id === projectIdFromUrl)
          if (project) {
            // Directly set state instead of calling handleProjectChange to avoid stale closure
            const customer = project.expand?.customer
            setState(prev => ({
              ...prev,
              projectId: project.id,
              customerId: project.customer,
              customerName: customer ? (locale === 'zh' && customer.name_cn ? customer.name_cn : customer.name) : '',
              currency: customer?.preferred_currency || prev.currency,
            }))

            // Check if project has cost table
            checkCostTable(project.id)

            // If coming from RFQ, show a hint to import from sourcing plan
            if (fromRfqId) {
              toast({
                title: t('rfqs.convertToQuotation.hint'),
                description: t('rfqs.convertToQuotation.hintDesc'),
              })
            }
          }
        }
      } catch (err) {
        console.error('Error loading projects:', err)
      }
    }
    loadProjects()
  }, [projectIdFromUrl, fromRfqId, locale, t, toast])

  // 加载汇率（切换币种时重新计算明细项）
  useEffect(() => {
    const loadExchangeRate = async () => {
      if (state.currency === 'CNY') {
        // 人民币汇率为1，重新计算明细项
        const updatedItems = recalculateItemsWithExchangeRate(state.items, 1)
        setState(prev => ({ ...prev, exchangeRate: 1, items: updatedItems }))
        return
      }

      setRateLoading(true)
      try {
        console.log(`🔄 正在获取汇率: ${state.currency} -> CNY`)
        // 使用 getRateWithRefresh 会自动从API获取汇率（如果数据库中没有或过期）
        const rate = await getRateWithRefresh(state.currency, 'CNY')
        console.log(`✅ 获取到汇率: ${rate}`)
        // 使用新汇率重新计算所有明细项
        const updatedItems = recalculateItemsWithExchangeRate(state.items, rate)
        setState(prev => ({ ...prev, exchangeRate: rate, items: updatedItems }))
      } catch (err) {
        console.error('❌ 加载汇率失败:', err)
        toast({
          title: '汇率加载失败',
          description: '无法获取汇率数据，请检查网络连接',
          variant: 'destructive',
        })
      } finally {
        setRateLoading(false)
      }
    }
    loadExchangeRate()
  }, [state.currency, toast])

  const checkCostTable = async (projectId: string) => {
    try {
      const pb = getPocketBase()
      const costTables = await pb.collection('project_cost_tables').getFullList({
        filter: `project = "${projectId}"`,
      })
      const hasTable = costTables.length > 0
      setHasCostTable(hasTable)
      if (hasTable) {
        setState(prev => ({ ...prev, costCurrency: costTables[0].currency || 'CNY' }))
      }
    } catch (err) {
      console.error('Error checking cost table:', err)
      setHasCostTable(false)
    }
  }

  // Handle import from cost table
  const handleImportFromCostTable = (importedItems: ImportedCostItem[]) => {
    const newItems: QuotationItemData[] = importedItems.map((item, index) => {
      // Calculate unit price from cost price and profit margin
      const unitPrice = calculateUnitPriceFromMargin(item.costPrice, state.globalProfitMargin, state.exchangeRate)

      return {
        id: `imported-${Date.now()}-${index}`,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        productNameCn: item.productNameCn,
        description: item.description,
        descriptionCn: item.descriptionCn,
        partNumber: item.partNumber,
        unit: item.unit || '',
        quantity: item.quantity,
        costPrice: item.costPrice,
        profitMargin: state.globalProfitMargin,
        unitPrice: unitPrice,
        amount: item.quantity * unitPrice,
        // Packaging info
        pcsPerCarton: item.pcsPerCarton,
        cartonDimensions: item.cartonDimensions
          ? `${item.cartonDimensions.length || 0}x${item.cartonDimensions.width || 0}x${item.cartonDimensions.height || 0}`
          : undefined,
        cartonGrossWeight: item.cartonGrossWeight,
      }
    })

    // Merge with existing items, avoiding duplicates
    const existingProductIds = new Set(state.items.map(i => i.productId))
    const itemsToAdd = newItems.filter(item => !existingProductIds.has(item.productId))
    const allItems = [...state.items, ...itemsToAdd]

    // 不自动计算重量和体积，用户需要手动点击"重算"按钮
    setState(prev => ({
      ...prev,
      items: allItems,
    }))

    toast({
      title: t('quotations.import.success'),
      description: t('quotations.import.importedCount', { count: String(itemsToAdd.length) }),
    })
  }

  // 根据产品包装信息计算总重量和总体积
  const calculateWeightAndVolume = (items: QuotationItemData[]) => {
    console.log('🔍 [calculateWeightAndVolume] 开始计算，产品数量:', items.length)
    let totalWeight = 0
    let totalVolume = 0

    for (const item of items) {
      console.log('📦 产品:', {
        productCode: item.productCode,
        productName: item.productName,
        quantity: item.quantity,
        pcsPerCarton: item.pcsPerCarton,
        cartonGrossWeight: item.cartonGrossWeight,
        cartonDimensions: item.cartonDimensions,
      })

      if (item.pcsPerCarton && item.pcsPerCarton > 0) {
        const cartons = Math.ceil(item.quantity / item.pcsPerCarton)
        console.log('  📊 箱数计算:', { quantity: item.quantity, pcsPerCarton: item.pcsPerCarton, cartons })

        // 计算重量 (kg)
        if (item.cartonGrossWeight) {
          const itemWeight = cartons * item.cartonGrossWeight
          totalWeight += itemWeight
          console.log('  ⚖️ 重量:', { cartons, cartonGrossWeight: item.cartonGrossWeight, itemWeight, totalWeight })
        } else {
          console.log('  ⚠️ 缺少 cartonGrossWeight')
        }

        // 计算体积 (m³) - cartonDimensions 格式: "625×450×390" 或 "625x450x390" (mm)
        if (item.cartonDimensions) {
          // 支持多种分隔符: ×, x, X, *, 空格
          const dims = item.cartonDimensions
            .split(/[×xX*\s]+/)
            .map(d => parseFloat(d.trim()))
            .filter(d => !isNaN(d))
          console.log('  📏 尺寸解析:', { raw: item.cartonDimensions, parsed: dims })
          if (dims.length === 3) {
            const volumePerCarton = (dims[0] * dims[1] * dims[2]) / 1000000000
            const itemVolume = cartons * volumePerCarton
            totalVolume += itemVolume
            console.log('  📐 体积:', { dims, volumePerCarton, cartons, itemVolume, totalVolume })
          } else {
            console.log('  ⚠️ 尺寸格式错误，需要3个数字')
          }
        } else {
          console.log('  ⚠️ 缺少 cartonDimensions')
        }
      } else {
        console.log('  ⚠️ pcsPerCarton 无效或为0')
      }
    }

    const result = {
      weight: totalWeight > 0 ? Math.round(totalWeight * 100) / 100 : null,
      volume: totalVolume > 0 ? Math.round(totalVolume * 1000) / 1000 : null,
    }
    console.log('✅ [calculateWeightAndVolume] 计算完成:', result)
    return result
  }

  // 货币信息
  const currencyInfo = findCurrencyByCode(state.currency)
  const currencySymbol = currencyInfo?.symbol || state.currency

  // 处理全局利润率应用 (参考 design.md > Property 5: Global Profit Margin Application)
  const handleApplyGlobalMargin = (margin: number) => {
    const updatedItems = applyGlobalProfitMargin(state.items, margin, state.exchangeRate)
    setState(prev => ({
      ...prev,
      globalProfitMargin: margin,
      items: updatedItems,
    }))
  }

  // 处理产品明细变化
  const handleItemsChange = (items: QuotationItemData[]) => {
    // 不自动计算重量和体积，用户需要手动点击"重算"按钮
    setState(prev => ({
      ...prev,
      items,
    }))
  }

  // 手动重新计算总重量和总体积
  const handleRecalculateWeightVolume = () => {
    console.log('🔄 [handleRecalculateWeightVolume] 点击重算按钮')
    console.log('📋 当前状态:', {
      itemsCount: state.items.length,
      currentWeight: state.totalWeight,
      currentVolume: state.totalVolume,
    })

    const { weight, volume } = calculateWeightAndVolume(state.items)

    console.log('💾 更新状态:', {
      calculatedWeight: weight,
      calculatedVolume: volume,
      willUpdateWeight: weight ?? state.totalWeight,
      willUpdateVolume: volume ?? state.totalVolume,
    })

    setState(prev => ({
      ...prev,
      totalWeight: weight ?? prev.totalWeight,
      totalVolume: volume ?? prev.totalVolume,
    }))
  }

  // 处理费用分解变化
  const handleCostBreakdownChange = (costs: Record<string, number>) => {
    setState(prev => ({ ...prev, costBreakdown: costs }))
  }

  // 保存报价单
  const handleSave = async (status: 'draft' | 'pending' = 'draft') => {
    // 验证表单
    const validationResult = validateQuotationForm({
      projectId: state.projectId,
      customerId: state.customerId,
      incoterm: state.incoterm,
      currency: state.currency,
      exchangeRate: state.exchangeRate,
      validityDays: state.validityDays,
      items: state.items,
    })

    if (!validationResult.isValid) {
      setState(prev => ({ ...prev, errors: validationResult.errorsByField }))
      // 显示具体的验证错误
      const errorMessages = validationResult.errors.map(e => e.message).join(', ')
      toast({
        title: t('quotations.validationError'),
        description: errorMessages || t('quotations.pleaseFixErrors'),
        variant: 'destructive',
      })
      return
    }

    setState(prev => ({ ...prev, loading: true, errors: {} }))

    try {
      const createdQuotation = await createQuotationWithItems({
        project: state.projectId,
        customer: state.customerId,
        incoterm: state.incoterm,
        port_of_loading: state.portOfLoading || undefined,
        port_of_destination: state.portOfDestination || undefined,
        currency: state.currency,
        exchange_rate: state.exchangeRate,
        validity_days: state.validityDays,
        payment_terms: state.paymentTerms || undefined,
        global_profit_margin: state.globalProfitMargin,
        total_weight: state.totalWeight || undefined,
        total_volume: state.totalVolume || undefined,
        cost_breakdown: state.costBreakdown,
        delivery_time: state.deliveryTime || undefined,
        remarks: state.remarks || undefined,
        items: state.items.map((item) => ({
          product: item.productId,
          quantity: item.quantity,
          cost_price: item.costPrice,
          profit_margin: item.profitMargin,
          unit_price: item.unitPrice,
          amount: item.amount,
        })),
      })

      toast({
        title: t('quotations.createSuccess'),
        description: status === 'draft'
          ? t('quotations.savedAsDraft')
          : t('quotations.submitted'),
      })

      // 保存后跳转到报价详情页
      // Note: quotation detail page enforces `?project=` param
      router.push(`/quotations/${createdQuotation.id}?project=${projectIdFromUrl}`)
    } catch (error: any) {
      toast({
        title: t('quotations.createError'),
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  // 返回按钮导航到项目详情页 (Requirements: 4.1)
  const handleBack = () => {
    router.push(returnUrl || `/projects/${projectIdFromUrl}?tab=quotations`)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('quotations.new')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('quotations.newDescription') || 'Create a new quotation with products and costs'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* ========== 0. 从成本表导入提示 ========== */}
        {hasCostTable && state.projectId && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{t('quotations.import.available')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('quotations.import.availableHint')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setImportDialogOpen(true)}
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  {t('quotations.import.importButton')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========== 1. 币种与条款 (Requirements: 2.1) ========== */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              <CardTitle className="text-base">{t('quotations.currencyTerms.title')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>{t('quotations.columns.currency')} <span className="text-destructive">*</span></Label>
                <Select
                  value={state.currency}
                  onValueChange={(v) => setState(prev => ({ ...prev, currency: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_CURRENCIES.map(code => {
                      const currency = CURRENCIES[code]
                      return (
                        <SelectItem key={code} value={code}>
                          {code} - {locale === 'zh' ? currency.name_cn : currency.name}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('quotations.exchangeRate')}</Label>
                <div className="h-10 px-3 py-2 rounded-md border bg-muted text-sm flex items-center">
                  {rateLoading ? (
                    <span className="text-muted-foreground">{t('common.loading')}...</span>
                  ) : (
                    <span>1 {state.currency} = {state.exchangeRate.toFixed(4)} CNY</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('quotations.paymentTerms')}</Label>
                <PaymentTermsSelect
                  value={state.paymentTerms}
                  onChange={(v) => setState(prev => ({ ...prev, paymentTerms: v }))}
                  placeholder={t('quotations.placeholders.paymentTerms')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('quotations.incoterm') || 'Incoterm'}</Label>
                <Select
                  value={state.incoterm}
                  onValueChange={(v) => setState(prev => ({ ...prev, incoterm: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('quotations.placeholders.incoterm') || "Select Incoterm"} />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOTERMS.map(item => (
                      <SelectItem key={item.code} value={item.code}>
                        {item.code} - {locale === 'zh' ? item.name_cn : item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('quotations.validityDays')}</Label>
                <Input
                  type="number"
                  min={1}
                  value={state.validityDays}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    validityDays: parseInt(e.target.value) || 30
                  }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ========== 2. 运输与利润 (Requirements: 2.2, 2.3) ========== */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Ship className="h-5 w-5" />
              <CardTitle className="text-base">{t('quotations.shippingInfo')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <div className="space-y-2">
                <Label>{t('quotations.portOfLoading')}</Label>
                <PortSelect
                  value={state.portOfLoading}
                  onChange={(v) => setState(prev => ({ ...prev, portOfLoading: v }))}
                  placeholder={t('quotations.selectPort')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('quotations.portOfDestination')}</Label>
                <PortSelect
                  value={state.portOfDestination}
                  onChange={(v) => setState(prev => ({ ...prev, portOfDestination: v }))}
                  placeholder={t('quotations.selectPort')}
                  type="destination"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('quotations.deliveryTime')}</Label>
                <Input
                  value={state.deliveryTime}
                  onChange={(e) => setState(prev => ({ ...prev, deliveryTime: e.target.value }))}
                  placeholder={t('quotations.placeholders.deliveryTime')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('quotations.totalWeight')}</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={state.totalWeight ?? ''}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setState(prev => ({
                        ...prev,
                        totalWeight: val === '' ? null : parseFloat(val) || null
                      }))
                    }
                  }}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('quotations.totalVolume')}</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={state.totalVolume ?? ''}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setState(prev => ({
                        ...prev,
                        totalVolume: val === '' ? null : parseFloat(val) || null
                      }))
                    }
                  }}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleRecalculateWeightVolume}
                  disabled={state.items.length === 0}
                  title={locale === 'zh' ? '根据产品包装信息重新计算' : 'Recalculate from product packaging'}
                >
                  {locale === 'zh' ? '重算' : 'Calc'}
                </Button>
              </div>
              <div className="space-y-2">
                <Label>{t('quotations.globalMargin.margin')} (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={state.globalProfitMargin}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    globalProfitMargin: parseFloat(e.target.value) || 0
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleApplyGlobalMargin(state.globalProfitMargin)}
                  disabled={state.items.length === 0}
                >
                  {t('quotations.globalMargin.apply')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ========== 3. QuotationItemsTable ========== */}
        <QuotationItemsTable
          items={state.items}
          currency={state.currency}
          exchangeRate={state.exchangeRate}
          projectId={state.projectId}
          defaultProfitMargin={state.globalProfitMargin}
          onItemsChange={handleItemsChange}
          costCurrency={state.costCurrency}
          showInternal={true}
        />

        {/* ========== 5. CostBreakdownSection ========== */}
        {/* 费用分解功能已隐藏 */}
        {/* <CostBreakdownSection
          incoterm={state.incoterm}
          currency={state.currency}
          costBreakdown={state.costBreakdown}
          onIncotermChange={handleIncotermChange}
          onCostChange={handleCostBreakdownChange}
        /> */}

        {/* ========== 6. ActionButtons ========== */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="remarks">{t('quotations.remarks')}</Label>
              <Textarea
                id="remarks"
                value={state.remarks}
                onChange={(e) => setState(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder={t('quotations.placeholders.remarks')}
                rows={3}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3">
            <Button
              onClick={() => handleSave('draft')}
              disabled={state.loading}
            >
              <Save className="mr-2 h-4 w-4" />
              {t('common.create')}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Import from Cost Table Dialog */}
      <ImportFromCostTableDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        projectId={state.projectId}
        onImport={handleImportFromCostTable}
      />
    </div>
  )
}
