'use client'

/**
 * Quotation Items Table Component
 * 报价单明细表格组件
 * **Property 2: Product Addition with Defaults**
 * **Property 3: Line Item Calculation**
 * **Validates: Requirements 1.3, 1.4, 1.5, 2.1, 2.2, 2.4**
 * 
 * 统一列顺序：Part No. | Description | Packaging | Qty | Cost | Margin | Price | Amount
 */

import { useState } from 'react'
import { useI18n } from '@/lib/i18n/use-i18n'
import { formatUnitPrice, formatAmount, formatCostPrice } from '@/lib/utils/currency-formatting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { Plus, Trash2, Package } from 'lucide-react'
import { QuotationItemDialog } from './quotation-item-dialog'
import {
  QuotationItemData,
  calculateLineItemAmount,
  calculateUnitPriceFromMargin,
  calculateSubtotal,
} from '@/lib/quotation/calculations'
import { findCurrencyByCode } from '@/lib/constants/trade-constants'
import {
  PartNoCell,
  DescriptionCell,
  PackagingCell,
  type ProductItemBase
} from '@/components/shared/product-items-columns'

export interface QuotationItemsTableProps {
  items: QuotationItemData[]
  currency: string
  exchangeRate: number
  projectId?: string
  defaultProfitMargin: number
  onItemsChange: (items: QuotationItemData[]) => void
  disabled?: boolean
  costCurrency?: string
  showInternal?: boolean
  /** 从产品库选择产品 */
  onSelectFromLibrary?: () => void
  /** 添加自定义产品（空行） */
  onAddCustomItem?: () => void
  /** 新建产品 */
  onNewProduct?: () => void
}

export function QuotationItemsTable({
  items,
  currency,
  exchangeRate,
  projectId,
  defaultProfitMargin,
  onItemsChange,
  disabled = false,
  costCurrency = 'CNY',
  showInternal = false,
  onSelectFromLibrary,
  onAddCustomItem,
  onNewProduct,
}: QuotationItemsTableProps) {
  const { t, locale } = useI18n()
  const [dialogOpen, setDialogOpen] = useState(false)

  const currencyInfo = findCurrencyByCode(currency)
  const currencySymbol = currencyInfo?.symbol || currency

  const costCurrencyInfo = findCurrencyByCode(costCurrency)
  const costCurrencySymbol = costCurrencyInfo?.symbol || costCurrency

  const subtotal = calculateSubtotal(items)

  // 获取已添加的产品ID列表
  const excludeProductIds = items.map(item => item.productId)

  // 处理添加产品
  const handleAddProducts = async (newItems: Array<{
    product: string
    productCode: string
    productName: string
    productNameCn?: string
    description?: string
    descriptionCn?: string
    unit: string
    partNumber?: string
    quantity: number
    cost_price: number
    profit_margin: number
    unit_price: number
    amount: number
    // 包装信息
    pcsPerCarton?: number
    cartonDimensions?: string
    cartonGrossWeight?: number
  }>) => {
    const addedItems: QuotationItemData[] = newItems.map((item, index) => ({
      id: `temp-${Date.now()}-${index}`,
      productId: item.product,
      productCode: item.productCode,
      productName: item.productName,
      productNameCn: item.productNameCn,
      description: item.description,
      descriptionCn: item.descriptionCn,
      partNumber: item.partNumber,
      unit: item.unit,
      quantity: item.quantity,
      costPrice: item.cost_price,
      profitMargin: item.profit_margin,
      unitPrice: item.unit_price,
      amount: item.amount,
      // 包装信息
      pcsPerCarton: item.pcsPerCarton,
      cartonDimensions: item.cartonDimensions,
      cartonGrossWeight: item.cartonGrossWeight,
    }))

    onItemsChange([...items, ...addedItems])
  }

  // 处理删除产品
  const handleRemoveItem = (itemId: string) => {
    onItemsChange(items.filter(item => item.id !== itemId))
  }

  // 处理 Part No. 变化
  const handlePartNumberChange = (itemId: string, value: string) => {
    onItemsChange(
      items.map(item => {
        if (item.id === itemId) {
          return { ...item, partNumber: value }
        }
        return item
      })
    )
  }

  // 处理描述变化（英文）
  const handleDescriptionChange = (itemId: string, value: string) => {
    onItemsChange(
      items.map(item => {
        if (item.id === itemId) {
          return { ...item, description: value }
        }
        return item
      })
    )
  }

  // 处理描述变化（中文）
  const handleDescriptionCnChange = (itemId: string, value: string) => {
    onItemsChange(
      items.map(item => {
        if (item.id === itemId) {
          return { ...item, descriptionCn: value }
        }
        return item
      })
    )
  }

  // 处理包装信息变化（简化为单个文本字段）
  const handlePackagingChange = (itemId: string, value: string) => {
    // 尝试解析文本格式: "50 pcs/ctn" 或 "50 pcs/ctn, 40x30x20 cm" 或 "G.W.: 12 kg"
    const pcsMatch = value.match(/(\d+)\s*pcs[\/\\-]?ctn?/i)
    const dimsMatch = value.match(/(\d+)\s*[x×X]\s*(\d+)\s*[x×X]\s*(\d+)\s*(cm|m)?/i)
    const weightMatch = value.match(/(?:g\.?w\.?|weight)[:\s]*(\d+(?:\.\d+)?)\s*(kg|lbs?)?/i)

    let pcsPerCarton: number | undefined
    let cartonDimensions: string | undefined
    let cartonGrossWeight: number | undefined

    if (pcsMatch) {
      pcsPerCarton = parseInt(pcsMatch[1])
    }
    if (dimsMatch) {
      cartonDimensions = `${dimsMatch[1]}×${dimsMatch[2]}×${dimsMatch[3]}`
    }
    if (weightMatch) {
      cartonGrossWeight = parseFloat(weightMatch[1])
    }

    // 如果解析失败，直接保存原始文本到 cartonDimensions
    if (!pcsMatch && !dimsMatch && !weightMatch && value.trim()) {
      cartonDimensions = value
    }

    onItemsChange(
      items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            pcsPerCarton: pcsPerCarton ?? item.pcsPerCarton,
            cartonDimensions: cartonDimensions ?? item.cartonDimensions,
            cartonGrossWeight: cartonGrossWeight ?? item.cartonGrossWeight,
          }
        }
        return item
      })
    )
  }

  // 处理数量变化
  const handleQuantityChange = (itemId: string, value: string) => {
    onItemsChange(
      items.map(item => {
        if (item.id === itemId) {
          // 允许空字符串（用户正在输入）
          if (value === '') {
            return { ...item, quantity: 0, amount: 0 }
          }
          // 只允许正整数
          const quantity = parseInt(value)
          if (isNaN(quantity) || quantity < 0) {
            return item
          }
          const newQuantity = Math.max(0, quantity)
          const newAmount = calculateLineItemAmount(newQuantity, item.unitPrice)
          return { ...item, quantity: newQuantity, amount: newAmount }
        }
        return item
      })
    )
  }

  // 处理成本价变化
  const handleCostPriceChange = (itemId: string, costPrice: number) => {
    onItemsChange(
      items.map(item => {
        if (item.id === itemId) {
          const newCostPrice = Math.max(0, costPrice)
          const newUnitPrice = newCostPrice > 0
            ? calculateUnitPriceFromMargin(newCostPrice, item.profitMargin, exchangeRate)
            : item.unitPrice
          const newAmount = calculateLineItemAmount(item.quantity, newUnitPrice)
          return { ...item, costPrice: newCostPrice, unitPrice: newUnitPrice, amount: newAmount }
        }
        return item
      })
    )
  }

  // 处理利润率变化
  const handleProfitMarginChange = (itemId: string, profitMargin: number) => {
    onItemsChange(
      items.map(item => {
        if (item.id === itemId) {
          const newMargin = Math.max(0, profitMargin)
          const newUnitPrice = item.costPrice > 0
            ? calculateUnitPriceFromMargin(item.costPrice, newMargin, exchangeRate)
            : item.unitPrice
          const newAmount = calculateLineItemAmount(item.quantity, newUnitPrice)
          return { ...item, profitMargin: newMargin, unitPrice: newUnitPrice, amount: newAmount }
        }
        return item
      })
    )
  }

  // 处理单价变化（手动输入）
  const handleUnitPriceChange = (itemId: string, unitPrice: number) => {
    onItemsChange(
      items.map(item => {
        if (item.id === itemId) {
          const newUnitPrice = Math.max(0, unitPrice)
          const newAmount = calculateLineItemAmount(item.quantity, newUnitPrice)
          // 如果有成本价，反算利润率（需要考虑汇率）
          let newMargin = item.profitMargin
          if (item.costPrice > 0) {
            const costInTargetCurrency = item.costPrice / exchangeRate
            newMargin = costInTargetCurrency > 0
              ? ((newUnitPrice / costInTargetCurrency) - 1) * 100
              : item.profitMargin
          }
          return { ...item, unitPrice: newUnitPrice, profitMargin: Math.max(0, newMargin), amount: newAmount }
        }
        return item
      })
    )
  }

  const formatCurrency = (value: number) => {
    return formatAmount(value, currency);
  }

  const formatCostCurrency = (value: number) => {
    return formatCostPrice(value);
  }

  // 转换为统一的 ProductItemBase 格式
  const toProductItemBase = (item: QuotationItemData): ProductItemBase => ({
    id: item.id,
    partNumber: item.partNumber,
    productCode: item.productCode,
    productName: item.productName,
    productNameCn: item.productNameCn,
    description: item.description,
    descriptionCn: item.descriptionCn,
    unit: item.unit,
    pcsPerCarton: item.pcsPerCarton,
    cartonDimensions: item.cartonDimensions,
    cartonGrossWeight: item.cartonGrossWeight,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    amount: item.amount,
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <CardTitle className="text-base">
              {t('quotations.items.title') || 'Products'}
            </CardTitle>
          </div>
          {/* 产品操作按钮 */}
          {!disabled && (onSelectFromLibrary || onAddCustomItem || onNewProduct) && (
            <div className="flex gap-2">
              {onAddCustomItem && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAddCustomItem}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  自定义产品
                </Button>
              )}

              {onSelectFromLibrary && (
                <Button
                  size="sm"
                  onClick={onSelectFromLibrary}
                >
                  <Package className="mr-2 h-4 w-4" />
                  {t('productSelect.selectFromLibrary') || 'Select Product'}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-1">
              {t('quotations.items.empty') || 'No products added'}
            </p>
            <p className="text-sm">
              {t('quotations.items.emptyHint') || 'Click "Add Product" to select products from the library'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[120px] pl-6">Part No.</TableHead>
                  <TableHead className="w-[180px]">
                    {t('quotations.items.descriptionColumn') || 'Description'}
                  </TableHead>
                  <TableHead className="w-[180px]">
                    {t('quotations.items.packaging') || 'Packaging'}
                  </TableHead>
                  <TableHead className="w-[90px] text-center">
                    {t('quotations.items.quantity') || 'Qty'}
                  </TableHead>
                  {showInternal && (
                    <>
                      <TableHead className="w-[120px] text-center">
                        {t('quotations.items.costPrice') || 'Cost'} ({costCurrency})
                      </TableHead>
                      <TableHead className="w-[100px] text-center">
                        {t('quotations.items.profitMargin') || 'Margin'}(%)
                      </TableHead>
                    </>
                  )}
                  <TableHead className="w-[120px] text-center">
                    {t('quotations.items.unitPrice') || 'Price'} ({currency})
                  </TableHead>
                  <TableHead className="w-[110px] text-right">
                    {t('quotations.items.amount') || 'Amount'}
                  </TableHead>
                  {!disabled && <TableHead className="w-10 pr-6"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="pl-6">
                      {disabled ? (
                        <PartNoCell value={item.partNumber} />
                      ) : (
                        <Input
                          value={item.partNumber || ''}
                          onChange={(e) => handlePartNumberChange(item.id, e.target.value)}
                          className="h-9 text-sm font-mono"
                          placeholder="Part No."
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {disabled ? (
                        <DescriptionCell item={toProductItemBase(item)} locale={locale} />
                      ) : (
                        <Input
                          value={item.description || ''}
                          onChange={(e) => handleDescriptionChange(item.id, e.target.value)}
                          className="h-9 text-sm"
                          placeholder="Description"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {disabled ? (
                        <PackagingCell item={toProductItemBase(item)} />
                      ) : (
                        <Input
                          value={item.cartonDimensions || ''}
                          onChange={(e) => handlePackagingChange(item.id, e.target.value)}
                          className="h-9 text-sm"
                          placeholder="e.g. 50 pcs/ctn"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={item.quantity || ''}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                        disabled={disabled}
                        className="w-full text-center h-9"
                      />
                    </TableCell>
                    {showInternal && (
                      <>
                        <TableCell className="text-center">
                          <div className="h-9 px-3 flex items-center justify-center text-sm bg-muted/50 rounded-md border">
                            {item.costPrice ? formatCostCurrency(item.costPrice) : '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="relative">
                            <Input
                              type="number"
                              min={0}
                              max={1000}
                              value={item.profitMargin || ''}
                              onChange={(e) => handleProfitMarginChange(item.id, parseFloat(e.target.value) || 0)}
                              disabled={disabled || item.costPrice <= 0}
                              className="w-full text-center h-9 pr-6"
                              placeholder="0"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">%</span>
                          </div>
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unitPrice || ''}
                        onChange={(e) => handleUnitPriceChange(item.id, parseFloat(e.target.value) || 0)}
                        disabled={disabled}
                        className="w-full text-center h-9"
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium pr-6 whitespace-nowrap">
                      {formatCurrency(item.amount)}
                    </TableCell>
                    {!disabled && (
                      <TableCell className="pr-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={showInternal ? (disabled ? 7 : 8) : (disabled ? 5 : 6)} className="text-right font-medium">
                    {t('quotations.items.subtotal') || 'Subtotal'}
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg whitespace-nowrap">
                    {formatCurrency(subtotal)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}

        {/* 产品选择对话框 */}
        <QuotationItemDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onAdd={handleAddProducts}
          projectId={projectId}
          excludeProductIds={excludeProductIds}
          defaultProfitMargin={defaultProfitMargin}
          exchangeRate={exchangeRate}
        />
      </CardContent>
    </Card>
  )
}

export default QuotationItemsTable
