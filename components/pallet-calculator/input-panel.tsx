'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useI18n } from '@/lib/i18n/use-i18n'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calculator, AlertCircle, Package, Sparkles, Plus, Trash2 } from 'lucide-react'
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

const CUSTOM_SPECS_STORAGE_KEY = 'custom_pallet_specs'

interface CustomPalletSpec {
  id: string
  name: string
  dimensions: string
}

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
  const { toast } = useToast()
  
  // Custom pallet specs state
  const [customSpecs, setCustomSpecs] = useState<CustomPalletSpec[]>([])
  
  // Dialog state for custom spec
  const [showCustomSpecDialog, setShowCustomSpecDialog] = useState(false)
  const [customSpecForm, setCustomSpecForm] = useState({
    length: 1200,
    width: 1200,
    height: 150
  })
  
  // Form state
  const [palletSpecCode, setPalletSpecCode] = useState<string>(PALLET_SPECS[4].code) // CN12 default
  const [materialCode, setMaterialCode] = useState<string>(PALLET_MATERIALS[1].code) // 免熏蒸 default
  const [maxHeight, setMaxHeight] = useState(DEFAULT_CONFIG.maxHeight)
  const [overhangTolerance, setOverhangTolerance] = useState(DEFAULT_CONFIG.overhangTolerance)
  const [heightTolerance, setHeightTolerance] = useState(DEFAULT_CONFIG.heightTolerance)
  const [boxDimensionsText, setBoxDimensionsText] = useState('')
  const [averageBoxWeight, setAverageBoxWeight] = useState(15)
  
  // Load custom specs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_SPECS_STORAGE_KEY)
      if (stored) {
        setCustomSpecs(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Failed to load custom pallet specs:', error)
    }
  }, [])
  
  // Save custom specs to localStorage
  const saveCustomSpecs = (specs: CustomPalletSpec[]) => {
    try {
      localStorage.setItem(CUSTOM_SPECS_STORAGE_KEY, JSON.stringify(specs))
      setCustomSpecs(specs)
    } catch (error) {
      console.error('Failed to save custom pallet specs:', error)
    }
  }
  
  // Merge preset and custom specs
  const allPalletSpecs = useMemo(() => {
    const presetSpecs = PALLET_SPECS.map(spec => ({
      ...spec,
      isCustom: false
    }))
    
    const customSpecsConverted = customSpecs.map(spec => {
      const parts = spec.dimensions.split(/[×x*]/).map(s => parseInt(s.trim()))
      if (parts.length === 3 && parts.every(p => !isNaN(p) && p > 0)) {
        return {
          code: `CUSTOM_${spec.id}`,
          name: spec.name,
          name_cn: spec.name,
          length: parts[0],
          width: parts[1],
          height: parts[2],
          maxLoad: 1500,
          isCustom: true,
          id: spec.id
        }
      }
      return null
    }).filter(Boolean) as Array<PalletSpec & { isCustom: true; id: string }>
    
    return [...presetSpecs, ...customSpecsConverted]
  }, [customSpecs])
  
  // Get selected specs
  const selectedPalletSpec = useMemo(() => 
    allPalletSpecs.find(p => p.code === palletSpecCode) as PalletSpec & { isCustom?: boolean; id?: string },
    [palletSpecCode, allPalletSpecs]
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
  
  // Add custom pallet spec
  const handleAddCustomSpec = () => {
    if (!customSpecForm.length || !customSpecForm.width || !customSpecForm.height) {
      toast({
        title: t('palletCalculator.customSpec.validationError') || '验证错误',
        description: t('palletCalculator.customSpec.validationErrorDesc') || '请填写所有尺寸',
        variant: 'destructive'
      })
      return
    }
    
    const name = '自定义托盘规格'
    const dimensions = customSpecForm.length + '×' + customSpecForm.width + '×' + customSpecForm.height
    
    const newSpec: CustomPalletSpec = {
      id: 'custom_' + Date.now(),
      name: name + '（' + dimensions + 'mm）',
      dimensions
    }
    
    saveCustomSpecs([...customSpecs, newSpec])
    toast({
      title: t('palletCalculator.customSpec.createSuccess') || '创建成功',
      description: t('palletCalculator.customSpec.createSuccessDesc') || '自定义托盘规格已保存'
    })
    setShowCustomSpecDialog(false)
    setCustomSpecForm({
      length: 1200,
      width: 1200,
      height: 150
    })
  }
  
  // Delete custom pallet spec
  const handleDeleteCustomSpec = (id: string) => {
    const updated = customSpecs.filter(s => s.id !== id)
    saveCustomSpecs(updated)
    toast({
      title: t('palletCalculator.customSpec.deleteSuccess') || '删除成功'
    })
  }

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
          <div className="flex items-center justify-between">
            <Label>{t('palletCalculator.palletSpec') || '托盘规格'}</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowCustomSpecDialog(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              {t('palletCalculator.customSpec.addButton') || '自定义'}
            </Button>
          </div>
          <Select value={palletSpecCode} onValueChange={setPalletSpecCode}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allPalletSpecs.map(spec => (
                <SelectItem key={spec.code} value={spec.code}>
                  {spec.isCustom 
                    ? spec.name_cn 
                    : `${spec.name_cn} (${spec.length}×${spec.width}×${spec.height}mm)`
                  }
                  {spec.isCustom && <span className="text-blue-500 ml-1">[自定义]</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPalletSpec?.isCustom && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-red-500 hover:text-red-700"
              onClick={() => handleDeleteCustomSpec(selectedPalletSpec.id!)}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              {t('common.delete') || '删除'}
            </Button>
          )}
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

      {/* Custom Pallet Spec Dialog */}
      <Dialog open={showCustomSpecDialog} onOpenChange={setShowCustomSpecDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('palletCalculator.customSpec.title') || '添加自定义托盘规格'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>{t('palletCalculator.customSpec.length') || '长'} (mm)</Label>
                <Input
                  type="number"
                  value={customSpecForm.length}
                  onChange={(e) => setCustomSpecForm({ ...customSpecForm, length: Number(e.target.value) })}
                  min={100}
                  max={3000}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('palletCalculator.customSpec.width') || '宽'} (mm)</Label>
                <Input
                  type="number"
                  value={customSpecForm.width}
                  onChange={(e) => setCustomSpecForm({ ...customSpecForm, width: Number(e.target.value) })}
                  min={100}
                  max={3000}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('palletCalculator.customSpec.height') || '高'} (mm)</Label>
                <Input
                  type="number"
                  value={customSpecForm.height}
                  onChange={(e) => setCustomSpecForm({ ...customSpecForm, height: Number(e.target.value) })}
                  min={50}
                  max={500}
                />
              </div>
            </div>
            <div className="bg-muted rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>预览:</span>
                <span className="font-medium text-foreground">
                  自定义托盘规格（{customSpecForm.length}×{customSpecForm.width}×{customSpecForm.height}）
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomSpecDialog(false)}>
              {t('common.cancel') || '取消'}
            </Button>
            <Button onClick={handleAddCustomSpec}>
              {t('common.save') || '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default InputPanel
