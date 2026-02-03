'use client'

import { useMemo } from 'react'
import { useI18n } from '@/lib/i18n/use-i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Copy, Package, CheckCircle, AlertTriangle } from 'lucide-react'
import type { StackingPlan } from '@/lib/pallet-calculator/stacking-algorithm'
import type { PalletSpec, PalletMaterial } from '@/lib/constants/trade-constants'
import { formatVolumeCBM, estimateGrossWeight } from '@/lib/pallet-calculator/volume-calculator'

interface SummaryPanelProps {
  stackingPlan: StackingPlan | null
  palletSpec: PalletSpec
  material: PalletMaterial
  averageBoxWeight: number
  onPalletSelect?: (index: number) => void
  selectedPalletIndex?: number
  palletBreakdown?: Array<{ spec: { code: string; name_cn: string; length: number; width: number }; count: number }>
  volumeSaved?: number
}

export function SummaryPanel({ 
  stackingPlan, 
  palletSpec, 
  material,
  averageBoxWeight,
  onPalletSelect,
  selectedPalletIndex = 0,
  palletBreakdown,
  volumeSaved
}: SummaryPanelProps) {
  const { t } = useI18n()
  const { toast } = useToast()
  
  const summaryText = useMemo(() => {
    if (!stackingPlan || stackingPlan.pallets.length === 0) return ''
    
    const lines = [
      `托盘打包方案`,
      `================`,
      `托盘规格: ${palletSpec.name_cn} (${palletSpec.length}×${palletSpec.width}×${palletSpec.height}mm)`,
      `托盘材质: ${material.name_cn}`,
      ``,
      `总计:`,
      `- 托盘数量: ${stackingPlan.pallets.length}`,
      `- 箱子总数: ${stackingPlan.totalBoxes}`,
      `- 计费体积: ${formatVolumeCBM(stackingPlan.totalVolume)} CBM`,
      `- 净体积: ${formatVolumeCBM(stackingPlan.netVolume)} CBM`,
      `- 空间利用率: ${stackingPlan.utilizationPercent.toFixed(1)}%`,
      `- 预估毛重: ${estimateGrossWeight(stackingPlan.totalBoxes, averageBoxWeight).toFixed(1)} kg`,
      ``
    ]
    
    stackingPlan.pallets.forEach((pallet, index) => {
      lines.push(`托盘 ${index + 1}:`)
      lines.push(`- 箱子数: ${pallet.boxCount}`)
      lines.push(`- 层数: ${pallet.layers.length}`)
      lines.push(`- 堆放高度: ${pallet.totalHeight}mm`)
      lines.push(`- 外形尺寸: ${pallet.grossDimensions.length}×${pallet.grossDimensions.width}×${pallet.grossDimensions.height}mm`)
      lines.push(``)
    })
    
    if (stackingPlan.unplacedBoxes.length > 0) {
      lines.push(`⚠️ 未能放置的箱子: ${stackingPlan.unplacedBoxes.length}`)
    }
    
    return lines.join('\n')
  }, [stackingPlan, palletSpec, material, averageBoxWeight])
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText)
      toast({ title: t('common.copied') || '已复制到剪贴板' })
    } catch (err) {
      toast({ title: t('common.error') || '复制失败', variant: 'destructive' })
    }
  }
  
  if (!stackingPlan || stackingPlan.pallets.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t('palletCalculator.summary.title') || '计算结果'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('palletCalculator.summary.empty') || '请输入箱子尺寸并点击计算'}
          </p>
        </CardContent>
      </Card>
    )
  }
  
  const selectedPallet = stackingPlan.pallets[selectedPalletIndex]
  const grossWeight = estimateGrossWeight(stackingPlan.totalBoxes, averageBoxWeight)
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t('palletCalculator.summary.title') || '计算结果'}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-3 w-3 mr-1" />
            {t('common.copy') || '复制'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 总体统计 - 紧凑布局 */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="p-2 bg-muted rounded text-center">
            <p className="text-muted-foreground text-xs">{t('palletCalculator.summary.totalBoxes') || '箱数'}</p>
            <p className="font-semibold">{stackingPlan.totalBoxes}</p>
          </div>
          <div className="p-2 bg-muted rounded text-center">
            <p className="text-muted-foreground text-xs">{t('palletCalculator.summary.palletCount') || '托盘'}</p>
            <p className="font-semibold">{stackingPlan.pallets.length}</p>
          </div>
          <div className="p-2 bg-muted rounded text-center">
            <p className="text-muted-foreground text-xs">{t('palletCalculator.summary.grossWeight') || '毛重'}</p>
            <p className="font-semibold">{grossWeight.toFixed(0)} kg</p>
          </div>
        </div>
        
        {/* 体积和利用率 - 3列 */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="p-2 bg-muted rounded text-center">
            <p className="text-muted-foreground text-xs">{t('palletCalculator.summary.chargeableVolume') || '计费体积'}</p>
            <p className="font-semibold">{formatVolumeCBM(stackingPlan.totalVolume)}</p>
          </div>
          <div className="p-2 bg-muted rounded text-center">
            <p className="text-muted-foreground text-xs">{t('palletCalculator.summary.netVolume') || '净体积'}</p>
            <p className="font-semibold">{formatVolumeCBM(stackingPlan.netVolume)}</p>
          </div>
          <div className="p-2 bg-muted rounded text-center">
            <p className="text-muted-foreground text-xs">{t('palletCalculator.summary.utilization') || '利用率'}</p>
            <p className="font-semibold">{stackingPlan.utilizationPercent.toFixed(1)}%</p>
          </div>
        </div>
        
        {/* 托盘选择 */}
        {stackingPlan.pallets.length > 1 && (
          <div className="flex flex-wrap gap-1">
            {stackingPlan.pallets.map((pallet, index) => (
              <Button
                key={index}
                variant={selectedPalletIndex === index ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onPalletSelect?.(index)}
              >
                #{index + 1}
                {pallet.palletSpec && (
                  <span className="ml-1 opacity-70">
                    {pallet.palletSpec.length}×{pallet.palletSpec.width}
                  </span>
                )}
              </Button>
            ))}
          </div>
        )}
        
        {/* 混合托盘规格分布 */}
        {palletBreakdown && palletBreakdown.length > 1 && (
          <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm">
            <p className="text-blue-800 font-medium mb-1">{t('palletCalculator.summary.mixedPallets') || '混合托盘方案'}</p>
            <div className="space-y-1">
              {palletBreakdown.map((item, i) => (
                <p key={i} className="text-blue-700 text-xs">
                  {item.spec.name_cn} ({item.spec.length}×{item.spec.width}): {item.count} {t('palletCalculator.summary.pallet') || '个'}
                </p>
              ))}
            </div>
            {volumeSaved !== undefined && volumeSaved > 0 && (
              <p className="text-green-700 text-xs mt-1">
                💰 {t('palletCalculator.summary.volumeSaved') || '节省体积'}: {formatVolumeCBM(volumeSaved)} CBM
              </p>
            )}
          </div>
        )}
        
        {/* 当前托盘详情 */}
        {selectedPallet && (
          <div className="border-t pt-3 space-y-2">
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">{t('palletCalculator.summary.boxCount') || '箱子数'}:</span> {selectedPallet.boxCount}</p>
              <p><span className="text-muted-foreground">{t('palletCalculator.summary.layers') || '层数'}:</span> {selectedPallet.layers.length}</p>
              <p><span className="text-muted-foreground">{t('palletCalculator.summary.stackHeight') || '堆放高度'}:</span> {selectedPallet.totalHeight}mm</p>
              <p>
                <span className="text-muted-foreground">{t('palletCalculator.summary.grossDimensions') || '外形尺寸'}:</span>{' '}
                {selectedPallet.grossDimensions.length}×{selectedPallet.grossDimensions.width}×{selectedPallet.grossDimensions.height}mm
              </p>
            </div>
            
            {/* 稳定性分析 - TODO: 待实现 stability 属性后启用 */}
          </div>
        )}
        
        {/* 状态提示 */}
        {stackingPlan.unplacedBoxes.length > 0 ? (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-xs">
            <AlertTriangle className="h-3 w-3" />
            <span>{stackingPlan.unplacedBoxes.length} {t('palletCalculator.summary.unplacedBoxes') || '个箱子无法放置'}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-green-800 text-xs">
            <CheckCircle className="h-3 w-3" />
            <span>{t('palletCalculator.summary.allPlaced') || '全部放置完成'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SummaryPanel
