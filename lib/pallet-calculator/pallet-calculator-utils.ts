/**
 * Pallet Calculator Utilities
 * 托盘计算工具函数
 */

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * 计算有效堆放高度
 * @param maxHeight 最大高度限制 (mm)
 * @param palletHeight 托盘本身高度 (mm)
 * @returns 有效堆放高度 (mm)
 */
export function calculateEffectiveHeight(maxHeight: number, palletHeight: number): number {
  return maxHeight - palletHeight
}

/**
 * 验证最大高度是否有效
 * @param maxHeight 最大高度限制 (mm)
 * @param palletHeight 托盘本身高度 (mm)
 * @returns 验证结果
 */
export function validateMaxHeight(maxHeight: number, palletHeight: number): ValidationResult {
  const errors: ValidationError[] = []
  
  if (maxHeight <= 0) {
    errors.push({
      field: 'maxHeight',
      message: '最大高度必须大于0'
    })
  }
  
  if (maxHeight <= palletHeight) {
    errors.push({
      field: 'maxHeight',
      message: `最大高度必须大于托盘高度 (${palletHeight}mm)`
    })
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 验证公差值是否有效
 * @param tolerance 公差值 (mm)
 * @param fieldName 字段名称
 * @returns 验证结果
 */
export function validateTolerance(tolerance: number, fieldName: string): ValidationResult {
  const errors: ValidationError[] = []
  
  if (tolerance < 0) {
    errors.push({
      field: fieldName,
      message: '公差值不能为负数'
    })
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 验证所有计算器配置
 */
export function validateCalculatorConfig(config: {
  maxHeight: number
  palletHeight: number
  overhangTolerance: number
  heightTolerance: number
}): ValidationResult {
  const allErrors: ValidationError[] = []
  
  const maxHeightResult = validateMaxHeight(config.maxHeight, config.palletHeight)
  allErrors.push(...maxHeightResult.errors)
  
  const overhangResult = validateTolerance(config.overhangTolerance, 'overhangTolerance')
  allErrors.push(...overhangResult.errors)
  
  const heightToleranceResult = validateTolerance(config.heightTolerance, 'heightTolerance')
  allErrors.push(...heightToleranceResult.errors)
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors
  }
}

/**
 * 默认配置值
 */
export const DEFAULT_CONFIG = {
  maxHeight: 1600,        // mm
  overhangTolerance: 50,  // mm
  heightTolerance: 50,    // mm
}

export default {
  calculateEffectiveHeight,
  validateMaxHeight,
  validateTolerance,
  validateCalculatorConfig,
  DEFAULT_CONFIG
}
