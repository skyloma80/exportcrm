'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useI18n } from '@/lib/i18n/use-i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InputPanel, type CalculatorConfig } from './input-panel'
import { SummaryPanel } from './summary-panel'
import { 
  calculateStackingPlan, 
  calculateEffectiveHeight,
  type StackingPlan,
  type ParseResult,
  PALLET_SPECS,
  PALLET_MATERIALS
} from '@/lib/pallet-calculator'
import { Box, ExternalLink } from 'lucide-react'

// 动态导入3D组件
const PalletViewer3D = dynamic(
  () => import('./pallet-viewer-3d'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[300px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">加载3D场景...</div>
      </div>
    )
  }
)

export function PalletCalculatorTab() {
  const { t } = useI18n()
  
  const [isCalculating, setIsCalculating] = useState(false)
  const [stackingPlan, setStackingPlan] = useState<StackingPlan | null>(null)
  const [config, setConfig] = useState<CalculatorConfig | null>(null)
  const [selectedPalletIndex, setSelectedPalletIndex] = useState(0)
  const [palletBreakdown, setPalletBreakdown] = useState<Array<{ spec: { code: string; name_cn: string; length: number; width: number }; count: number }> | undefined>()
  const [volumeSaved, setVolumeSaved] = useState<number | undefined>()
  
  const handleCalculate = useCallback(async (newConfig: CalculatorConfig, parseResult: ParseResult) => {
    setIsCalculating(true)
    setConfig(newConfig)
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    try {
      // 如果有智能计算结果，直接使用
      if (newConfig.smartResult) {
        setStackingPlan(newConfig.smartResult.plan)
        setPalletBreakdown(newConfig.smartResult.palletBreakdown)
        setVolumeSaved(newConfig.smartResult.volumeSaved)
        setSelectedPalletIndex(0)
      } else {
        // 否则使用单一托盘规格计算
        const effectiveHeight = calculateEffectiveHeight(
          newConfig.maxHeight,
          newConfig.palletSpec.height
        )
        
        const plan = calculateStackingPlan(parseResult.boxes, {
          palletLength: newConfig.palletSpec.length,
          palletWidth: newConfig.palletSpec.width,
          palletHeight: newConfig.palletSpec.height,
          effectiveHeight,
          overhangTolerance: newConfig.overhangTolerance,
          heightTolerance: newConfig.heightTolerance,
          prioritizeFullLayers: newConfig.prioritizeFullLayers,
          averageBoxWeight: newConfig.averageBoxWeight
        })
        
        setStackingPlan(plan)
        setPalletBreakdown(undefined)
        setVolumeSaved(undefined)
        setSelectedPalletIndex(0)
      }
    } catch (error) {
      console.error('Calculation error:', error)
    } finally {
      setIsCalculating(false)
    }
  }, [])
  
  const defaultPalletSpec = config?.palletSpec || PALLET_SPECS[4]
  const defaultMaterial = config?.material || PALLET_MATERIALS[1]
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: 3D Viewer */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Box className="h-4 w-4" />
              {t('palletCalculator.viewer.title') || '3D预览'}
              {stackingPlan && stackingPlan.pallets.length > 1 && (
                <span className="text-sm font-normal text-muted-foreground">
                  - {t('palletCalculator.summary.pallet') || '托盘'} {selectedPalletIndex + 1}/{stackingPlan.pallets.length}
                </span>
              )}
              <a
                href="http://42.194.150.84:3005"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                智能托盘优化
              </a>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <PalletViewer3D
                stackingPlan={stackingPlan}
                palletSpec={defaultPalletSpec}
                material={defaultMaterial}
                activePalletIndex={selectedPalletIndex}
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Summary Panel */}
        <SummaryPanel
          stackingPlan={stackingPlan}
          palletSpec={defaultPalletSpec}
          material={defaultMaterial}
          averageBoxWeight={config?.averageBoxWeight || 15}
          selectedPalletIndex={selectedPalletIndex}
          onPalletSelect={setSelectedPalletIndex}
          palletBreakdown={palletBreakdown}
          volumeSaved={volumeSaved}
        />
      </div>
      
      {/* Right: Input Panel */}
      <div>
        <InputPanel
          onCalculate={handleCalculate}
          isCalculating={isCalculating}
        />
      </div>
    </div>
  )
}

export default PalletCalculatorTab
