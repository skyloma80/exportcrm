'use client'

import { useState, useMemo, useCallback } from 'react'
import { useI18n } from '@/lib/i18n/use-i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calculator, AlertCircle, Package, Sparkles } from 'lucide-react'
import {
  PALLET_SPECS,
  PALLET_MATERIALS,
  parseBoxDimensions,
  DEFAULT_CONFIG,
  validateCalculatorConfig,
  calculateMixedPalletPlan,
  type PalletSpec,
  type PalletMaterial,
  type ParseResult,
  type StackingPlan
} from '@/lib/pallet-calculator'

export interface CalculatorConfig {
  palletSpec: PalletSpec
  material: PalletMaterial
  maxHeight: number
  overhangTolerance: number
  heightTolerance: number
  boxDimensionsText: string
  averageBoxWeight: number
  // 智能计算结果
  smartResult?: {
    plan: StackingPlan
    palletBreakdown: Array<{ spec: { code: string; name_cn: string; length: number; width: number }; count: number }>
    volumeSaved: number
  }
}

interface InputPanelProps {
  onCalculate: (config: CalculatorConfig, parseResult: ParseResult) => void
  isCalculating: boolean
}

export function InputPanel({ onCalculate, isCalculating }: InputPanelProps) {
  const { t } = useI18n()
  
  // Form state
  const [palletSpecCode, setPalletSpecCode] = useState<string>(PALLET_SPECS[4].code) // CN12 default
  const [materialCode, setMaterialCode] = useState<string>(PALLET_MATERIALS[1].code) // 免熏蒸 default
  const [maxHeight, setMaxHeight] = useState(DEFAULT_CONFIG.maxHeight)
  const [overhangTolerance, setOverhangTolerance] = useState(DEFAULT_CONFIG.overhangTolerance)
  const [heightTolerance, setHeightTolerance] = useState(DEFAULT_CONFIG.heightTolerance)
  const [boxDimensionsText, setBoxDimensionsText] = useState('')
  const [averageBoxWeight, setAverageBoxWeight] = useState(15)
  
  // Get selected specs
  const selectedPalletSpec = useMemo(() => 
    PALLET_SPECS.find(p => p.code === palletSpecCode) as PalletSpec,
    [palletSpecCode]
  )
  
  const selectedMaterial = useMemo(() =>
    PALLET_MATERIALS.find(m => m.code === materialCode) as PalletMaterial,
    [materialCode]
  )
  
  // Parse box dimensions in real-time
  const parseResult = useMemo(() => 
    parseBoxDimensions(boxDimensionsText),
    [boxDimensionsText]
  )
  
  // Calculate effective height
  const effectiveHeight = useMemo(() => 
    maxHeight - selectedPalletSpec.height,
    [maxHeight, selectedPalletSpec.height]
  )
  
  // Validation
  const validation = useMemo(() => 
    validateCalculatorConfig({
      maxHeight,
      palletHeight: selectedPalletSpec.height,
      overhangTolerance,
      heightTolerance
    }),
    [maxHeight, selectedPalletSpec.height, overhangTolerance, heightTolerance]
  )
  
  const canCalculate = validation.valid && parseResult.boxes.length > 0
  
  const handleCalculate = useCallback(() => {
    if (!canCalculate) return
    
    onCalculate({
      palletSpec: selectedPalletSpec,
      material: selectedMaterial,
      maxHeight,
      overhangTolerance,
      heightTolerance,
      boxDimensionsText,
      averageBoxWeight
    }, parseResult)
  }, [canCalculate, onCalculate, selectedPalletSpec, selectedMaterial, maxHeight, overhangTolerance, heightTolerance, boxDimensionsText, averageBoxWeight, parseResult])

  // 智能计算最优方案（混合托盘）
  const handleSmartCalculate = useCallback(() => {
    if (parseResult.boxes.length === 0) return
    
    // 使用混合托盘算法
    const result = calculateMixedPalletPlan(
      parseResult.boxes,
      PALLET_SPECS.map(s => ({ code: s.code, name_cn: s.name_cn, length: s.length, width: s.width, height: s.height })),
      {
        effectiveHeight: maxHeight - 150, // 使用平均托盘高度
        overhangTolerance,
        heightTolerance
      }
    )
    
    // 如果有混合托盘，使用第一个托盘的规格作为主规格
    const primarySpecCode = result.palletBreakdown.length > 0 
      ? result.palletBreakdown[0].spec.code 
      : selectedPalletSpec.code
    
    setPalletSpecCode(primarySpecCode)
    
    const primarySpec = PALLET_SPECS.find(s => s.code === primarySpecCode) as PalletSpec
    
    onCalculate({
      palletSpec: primarySpec,
      material: selectedMaterial,
      maxHeight,
      overhangTolerance,
      heightTolerance,
      boxDimensionsText,
      averageBoxWeight,
      smartResult: {
        plan: result.plan,
        palletBreakdown: result.palletBreakdown,
        volumeSaved: result.totalVolumeSaved
      }
    }, parseResult)
  }, [parseResult, maxHeight, overhangTolerance, heightTolerance, selectedMaterial, selectedPalletSpec.code, boxDimensionsText, averageBoxWeight, onCalculate])

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          {t('palletCalculator.inputPanel.title') || '托盘配置'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pallet Specification */}
        <div className="space-y-2">
          <Label>{t('palletCalculator.palletSpec') || '托盘规格'}</Label>
          <Select value={palletSpecCode} onValueChange={setPalletSpecCode}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PALLET_SPECS.map(spec => (
                <SelectItem key={spec.code} value={spec.code}>
                  {spec.name_cn} ({spec.length}×{spec.width}×{spec.height}mm)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Material */}
        <div className="space-y-2">
          <Label>{t('palletCalculator.material') || '托盘材质'}</Label>
          <Select value={materialCode} onValueChange={setMaterialCode}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PALLET_MATERIALS.map(mat => (
                <SelectItem key={mat.code} value={mat.code}>
                  {mat.name_cn} / {mat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Max Height */}
        <div className="space-y-2">
          <Label>{t('palletCalculator.maxHeight') || '最大高度限制 (mm)'}</Label>
          <Input
            type="number"
            value={maxHeight}
            onChange={e => setMaxHeight(Number(e.target.value))}
            min={selectedPalletSpec.height + 1}
          />
          <p className="text-xs text-muted-foreground">
            {t('palletCalculator.effectiveHeight') || '有效堆放高度'}: {effectiveHeight}mm
          </p>
        </div>

        {/* Tolerances */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('palletCalculator.overhangTolerance') || '悬空公差 (mm)'}</Label>
            <Input
              type="number"
              value={overhangTolerance}
              onChange={e => setOverhangTolerance(Number(e.target.value))}
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('palletCalculator.heightTolerance') || '高度公差 (mm)'}</Label>
            <Input
              type="number"
              value={heightTolerance}
              onChange={e => setHeightTolerance(Number(e.target.value))}
              min={0}
            />
          </div>
        </div>

        {/* Average Box Weight */}
        <div className="space-y-2">
          <Label>{t('palletCalculator.avgBoxWeight') || '平均箱重 (kg)'}</Label>
          <Input
            type="number"
            value={averageBoxWeight}
            onChange={e => setAverageBoxWeight(Number(e.target.value))}
            min={0}
            step={0.5}
          />
        </div>

        {/* Box Dimensions Input */}
        <div className="space-y-2">
          <Label className="flex items-center justify-between">
            <span>{t('palletCalculator.boxDimensions') || '箱子尺寸'}</span>
            <span className="text-sm font-normal text-muted-foreground flex items-center gap-1">
              <Package className="h-3 w-3" />
              {parseResult.totalCount} {t('palletCalculator.boxes') || '个箱子'}
            </span>
          </Label>
          <Textarea
            value={boxDimensionsText}
            onChange={e => setBoxDimensionsText(e.target.value)}
            placeholder={`${t('palletCalculator.boxDimensionsPlaceholder') || '每行一个尺寸，格式: 长*宽*高'}\n625*390*450\n500*400*300`}
            className="min-h-[120px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {t('palletCalculator.supportedFormats') || '支持格式: 625*390*450, 625x390x450, 625×390×450'}
          </p>
        </div>

        {/* Parse Errors */}
        {parseResult.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {parseResult.errors.map(err => (
                <div key={err.line} className="text-sm">
                  {t('palletCalculator.lineError') || '第'}{err.line}{t('palletCalculator.lineErrorSuffix') || '行'}: {err.message}
                </div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {/* Validation Errors */}
        {!validation.valid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {validation.errors.map((err, i) => (
                <div key={i} className="text-sm">{err.message}</div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {/* Calculate Button */}
        <Button 
          className="w-full" 
          onClick={handleCalculate}
          disabled={!canCalculate || isCalculating}
        >
          <Calculator className="mr-2 h-4 w-4" />
          {isCalculating 
            ? (t('palletCalculator.calculating') || '计算中...')
            : (t('palletCalculator.calculate') || '计算堆放方案')
          }
        </Button>

        {/* OR Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">OR</span>
          </div>
        </div>

        {/* Smart Calculate Button */}
        <Button 
          className="w-full" 
          variant="secondary"
          onClick={handleSmartCalculate}
          disabled={parseResult.boxes.length === 0 || isCalculating}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {t('palletCalculator.smartCalculate') || '智能计算最优方案'}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          {t('palletCalculator.smartCalculateHint') || '自动选择最优托盘组合（支持混合规格）'}
        </p>
      </CardContent>
    </Card>
  )
}

export default InputPanel
