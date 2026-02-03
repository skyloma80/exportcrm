'use client'

/**
 * Unified Product Items Columns
 * 统一的产品明细列定义
 * 
 * 用于报价单、订单等业务单据中产品明细的统一显示
 * 前三列统一为：Part No. | Description | Packaging
 */

import { useI18n } from '@/lib/i18n/use-i18n'

export interface ProductItemBase {
  id: string
  // 产品基本信息
  partNumber?: string
  productCode?: string
  productName?: string
  productNameCn?: string
  description?: string
  descriptionCn?: string
  unit?: string
  // 包装信息
  pcsPerCarton?: number
  cartonDimensions?: string
  cartonGrossWeight?: number
  // 数量和价格
  quantity: number
  unitPrice: number
  amount: number
}

/**
 * 获取产品描述（支持中英文）
 */
export function getProductDescription(
  item: ProductItemBase,
  locale: string
): string {
  // 优先使用描述字段
  if (locale === 'zh' && item.descriptionCn) return item.descriptionCn
  if (item.description) return item.description
  // fallback to name
  if (locale === 'zh' && item.productNameCn) return item.productNameCn
  return item.productName || '-'
}

/**
 * 格式化包装信息
 */
export function formatPackaging(item: ProductItemBase): {
  hasPackaging: boolean
  lines: string[]
} {
  const lines: string[] = []
  
  if (item.pcsPerCarton) {
    lines.push(`${item.pcsPerCarton} pcs/ctn`)
  }
  if (item.cartonDimensions) {
    lines.push(item.cartonDimensions)
  }
  if (item.cartonGrossWeight) {
    lines.push(`G.W: ${item.cartonGrossWeight} kg/ctn`)
  }
  
  return {
    hasPackaging: lines.length > 0,
    lines,
  }
}

/**
 * Part No. 列渲染
 */
export function PartNoCell({ value }: { value?: string }) {
  return (
    <span className="text-sm font-mono">{value || '-'}</span>
  )
}

/**
 * Description 列渲染
 */
export function DescriptionCell({ 
  item, 
  locale 
}: { 
  item: ProductItemBase
  locale: string 
}) {
  const description = getProductDescription(item, locale)
  return (
    <div>
      <p className="text-sm">{description}</p>
      {item.productCode && (
        <p className="text-xs text-muted-foreground font-mono">{item.productCode}</p>
      )}
    </div>
  )
}

/**
 * Packaging 列渲染
 */
export function PackagingCell({ item }: { item: ProductItemBase }) {
  const { hasPackaging, lines } = formatPackaging(item)
  
  if (!hasPackaging) {
    return <span className="text-xs text-muted-foreground">-</span>
  }
  
  return (
    <p className="text-xs text-muted-foreground">
      {lines.map((line, i) => (
        <span key={i}>
          {line}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </p>
  )
}

/**
 * 统一的表头标签
 */
export const COLUMN_HEADERS = {
  partNo: 'Part No.',
  description: 'Description',
  packaging: 'Packaging',
  quantity: 'Qty',
  unitPrice: 'Unit Price',
  amount: 'Amount',
} as const
