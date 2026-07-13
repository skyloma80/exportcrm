/**
 * Volume Calculator Utility
 * 体积和重量计算工具
 */

import type { BoxDimension } from './box-parser'
import type { StackingPlan, PalletPlan } from './stacking-algorithm'

/**
 * 计算单个箱子体积 (立方毫米)
 */
export function calculateBoxVolumeMM3(box: BoxDimension): number {
  return box.length * box.width * box.height
}

/**
 * 计算单个箱子体积 (CBM - 立方米)
 */
export function calculateBoxVolumeCBM(box: BoxDimension): number {
  return calculateBoxVolumeMM3(box) / 1_000_000_000
}

/**
 * 计算多个箱子总体积 (CBM)
 */
export function calculateTotalVolumeCBM(boxes: BoxDimension[]): number {
  return boxes.reduce((sum, box) => sum + calculateBoxVolumeCBM(box), 0)
}

/**
 * 计算托盘可用空间体积 (CBM)
 */
export function calculatePalletSpaceCBM(
  palletLength: number,
  palletWidth: number,
  effectiveHeight: number
): number {
  return (palletLength * palletWidth * effectiveHeight) / 1_000_000_000
}

/**
 * 计算空间利用率 (百分比)
 */
export function calculateUtilization(
  usedVolumeCBM: number,
  availableVolumeCBM: number
): number {
  if (availableVolumeCBM <= 0) return 0
  return (usedVolumeCBM / availableVolumeCBM) * 100
}

/**
 * 计算堆放方案的空间利用率
 */
export function calculatePlanUtilization(
  plan: StackingPlan,
  palletLength: number,
  palletWidth: number,
  effectiveHeight: number
): number {
  if (plan.pallets.length === 0) return 0
  
  const totalAvailable = plan.pallets.length * calculatePalletSpaceCBM(
    palletLength,
    palletWidth,
    effectiveHeight
  )
  
  return calculateUtilization(plan.totalVolume, totalAvailable)
}

/**
 * 估算毛重 (kg)
 */
export function estimateGrossWeight(boxCount: number, averageBoxWeight: number): number {
  return boxCount * averageBoxWeight
}

/**
 * 计算单个托盘的统计数据
 */
export function calculatePalletStats(pallet: PalletPlan): {
  boxCount: number
  layerCount: number
  totalHeight: number
  volumeCBM: number
} {
  const boxes = pallet.placedBoxes.map(pb => pb.dimension)
  
  return {
    boxCount: pallet.boxCount,
    layerCount: pallet.layers.length,
    totalHeight: pallet.totalHeight,
    volumeCBM: calculateTotalVolumeCBM(boxes)
  }
}

/**
 * 格式化体积显示
 */
export function formatVolumeCBM(volumeCBM: number, decimals: number = 3): string {
  return volumeCBM.toFixed(decimals)
}

/**
 * 格式化尺寸显示 (mm -> cm 或 m)
 */
export function formatDimension(mm: number, unit: 'mm' | 'cm' | 'm' = 'mm'): string {
  switch (unit) {
    case 'cm':
      return (mm / 10).toFixed(1)
    case 'm':
      return (mm / 1000).toFixed(3)
    default:
      return mm.toString()
  }
}

/**
 * 格式化尺寸为字符串 (L x W x H)
 */
export function formatDimensions(
  length: number,
  width: number,
  height: number,
  unit: 'mm' | 'cm' | 'm' = 'mm'
): string {
  const l = formatDimension(length, unit)
  const w = formatDimension(width, unit)
  const h = formatDimension(height, unit)
  return `${l} × ${w} × ${h} ${unit}`
}

export default {
  calculateBoxVolumeMM3,
  calculateBoxVolumeCBM,
  calculateTotalVolumeCBM,
  calculatePalletSpaceCBM,
  calculateUtilization,
  calculatePlanUtilization,
  estimateGrossWeight,
  calculatePalletStats,
  formatVolumeCBM,
  formatDimension,
  formatDimensions
}
