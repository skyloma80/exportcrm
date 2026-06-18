'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useI18n } from '@/lib/i18n/use-i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InputPanel, type CalculatorConfig } from '@/components/pallet-calculator/input-panel'
import { SummaryPanel } from '@/components/pallet-calculator/summary-panel'
import { 
  calculateStackingPlan, 
  calculateEffectiveHeight,
  type StackingPlan,
  type ParseResult,
  PALLET_SPECS,
  PALLET_MATERIALS
} from '@/lib/pallet-calculator'
import { Calculator, Box, Layers, LayoutGrid } from 'lucide-react'

// 动态导入3D组件以避免SSR问题
const PalletViewer3D = dynamic(
  () => import('@/components/pallet-calculator/pallet-viewer-3d'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">加载3D场景...</div>
      </div>
    )
  }
)

export default function PalletCalculatorPage() {
  const { t } = useI18n()
  
  const [isCalculating, setIsCalculating] = useState(false)
  const [stackingPlan, setStackingPlan] = useState<StackingPlan | null>(null)
  const [config, setConfig] = useState<CalculatorConfig | null>(null)
  const [selectedPalletIndex, setSelectedPalletIndex] = useState(0)
  const [showAllPallets, setShowAllPallets] = useState(true) // 默认显示所有托盘
  
  const handleCalculate = useCallback(async (newConfig: CalculatorConfig, parseResult: ParseResult) => {
    setIsCalculating(true)
    setConfig(newConfig)
    
    // 模拟异步计算（实际计算很快，但给用户反馈）
    await new Promise(resolve => setTimeout(resolve, 100))
    
    try {
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
      setSelectedPalletIndex(0)
    } catch (error) {
      console.error('Calculation error:', error)
    } finally {
      setIsCalculating(false)
    }
  }, [])
  
  // 默认托盘规格和材质（用于初始3D显示）
  const defaultPalletSpec = config?.palletSpec || PALLET_SPECS[4] // CN12
  const defaultMaterial = config?.material || PALLET_MATERIALS[1] // 免熏蒸
  
  return (
    <div className="p-6 h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Calculator className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">
              {t('palletCalculator.title') || '托盘打包计算器'}
            </h1>
            <p className="text-muted-foreground">
              {t('palletCalculator.description') || '计算箱子在托盘上的最优堆放方案，支持3D可视化预览'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Left: 3D Viewer */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Box className="h-4 w-4" />
                  {t('palletCalculator.viewer.title') || '3D预览'}
                  {stackingPlan && stackingPlan.pallets.length > 1 && !showAllPallets && (
                    <span className="text-sm font-normal text-muted-foreground">
                      - {t('palletCalculator.summary.pallet') || '托盘'} {selectedPalletIndex + 1}/{stackingPlan.pallets.length}
                    </span>
                  )}
                </CardTitle>
                
                {/* 视图切换按钮 */}
                {stackingPlan && stackingPlan.pallets.length > 1 && (
                  <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                    <Button
                      variant={showAllPallets ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setShowAllPallets(true)}
                    >
                      <LayoutGrid className="h-4 w-4 mr-1" />
                      全部
                    </Button>
                    <Button
                      variant={!showAllPallets ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setShowAllPallets(false)}
                    >
                      <Layers className="h-4 w-4 mr-1" />
                      单个
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="h-[calc(100%-60px)]">
              <PalletViewer3D
                stackingPlan={stackingPlan}
                palletSpec={defaultPalletSpec}
                material={defaultMaterial}
                activePalletIndex={selectedPalletIndex}
                showAllPallets={showAllPallets}
              />
            </CardContent>
          </Card>
          
          {/* Summary Panel (below 3D viewer on larger screens) */}
          <div className="hidden lg:block">
            <SummaryPanel
              stackingPlan={stackingPlan}
              palletSpec={defaultPalletSpec}
              material={defaultMaterial}
              averageBoxWeight={config?.averageBoxWeight || 15}
              selectedPalletIndex={selectedPalletIndex}
              onPalletSelect={setSelectedPalletIndex}
            />
          </div>
        </div>
        
        {/* Right: Input Panel */}
        <div className="flex flex-col gap-4">
          <InputPanel
            onCalculate={handleCalculate}
            isCalculating={isCalculating}
          />
          
          {/* Summary Panel (on mobile, below input) */}
          <div className="lg:hidden">
            <SummaryPanel
              stackingPlan={stackingPlan}
              palletSpec={defaultPalletSpec}
              material={defaultMaterial}
              averageBoxWeight={config?.averageBoxWeight || 15}
              selectedPalletIndex={selectedPalletIndex}
              onPalletSelect={setSelectedPalletIndex}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
