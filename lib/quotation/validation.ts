/**
 * 报价单验证工具函数
 * Quotation Validation Utilities
 * **Property 9: Validation Error Display**
 * **Validates: Requirements 5.2, 5.3**
 */

import { QuotationItemData } from './calculations'

export interface QuotationFormData {
  projectId: string
  customerId: string
  incoterm: string
  portOfLoading: string
  portOfDestination: string
  currency: string
  exchangeRate: number
  validityDays: number
  paymentTerms: string
  items: QuotationItemData[]
  costBreakdown: Record<string, number>
  totalWeight?: number
  totalVolume?: number
  notes?: string
}

export interface ValidationError {
  field: string
  message: string
  messageKey: string // i18n key
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  errorsByField: Record<string, string>
}

/**
 * 验证报价单表单数据
 * Validate quotation form data
 */
export function validateQuotationForm(data: Partial<QuotationFormData>): ValidationResult {
  const errors: ValidationError[] = []

  // 项目必填
  if (!data.projectId) {
    errors.push({
      field: 'projectId',
      message: 'Project is required',
      messageKey: 'quotations.validation.projectRequired',
    })
  }

  // 客户必填
  if (!data.customerId) {
    errors.push({
      field: 'customerId',
      message: 'Customer is required',
      messageKey: 'quotations.validation.customerRequired',
    })
  }

  // 贸易术语必填
  if (!data.incoterm) {
    errors.push({
      field: 'incoterm',
      message: 'Incoterm is required',
      messageKey: 'quotations.validation.incotermRequired',
    })
  }

  // 货币必填
  if (!data.currency) {
    errors.push({
      field: 'currency',
      message: 'Currency is required',
      messageKey: 'quotations.validation.currencyRequired',
    })
  }

  // 汇率必须大于0
  if (!data.exchangeRate || data.exchangeRate <= 0) {
    errors.push({
      field: 'exchangeRate',
      message: 'Exchange rate must be greater than 0',
      messageKey: 'quotations.validation.exchangeRateInvalid',
    })
  }



  // 至少需要一个产品
  if (!data.items || data.items.length === 0) {
    errors.push({
      field: 'items',
      message: 'At least one product is required',
      messageKey: 'quotations.validation.itemsRequired',
    })
  } else {
    // 验证每个产品项
    data.items.forEach((item, index) => {
      const itemErrors = validateQuotationItem(item)
      itemErrors.forEach(err => {
        errors.push({
          field: `items[${index}].${err.field}`,
          message: `Item ${index + 1}: ${err.message}`,
          messageKey: err.messageKey,
        })
      })
    })
  }

  // 构建按字段分组的错误
  const errorsByField: Record<string, string> = {}
  errors.forEach(err => {
    if (!errorsByField[err.field]) {
      errorsByField[err.field] = err.message
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    errorsByField,
  }
}

/**
 * 验证报价单明细项
 * Validate quotation item
 */
export function validateQuotationItem(item: Partial<QuotationItemData>): ValidationError[] {
  const errors: ValidationError[] = []

  // 产品ID必填
  if (!item.productId) {
    errors.push({
      field: 'productId',
      message: 'Product is required',
      messageKey: 'quotations.validation.productRequired',
    })
  }

  // 数量必须大于0
  if (!item.quantity || item.quantity <= 0) {
    errors.push({
      field: 'quantity',
      message: 'Quantity must be greater than 0',
      messageKey: 'quotations.validation.quantityInvalid',
    })
  }

  // 单价必须大于等于0
  if (item.unitPrice === undefined || item.unitPrice < 0) {
    errors.push({
      field: 'unitPrice',
      message: 'Unit price must be 0 or greater',
      messageKey: 'quotations.validation.unitPriceInvalid',
    })
  }

  // 利润率必须在合理范围内
  if (item.profitMargin !== undefined && (item.profitMargin < 0 || item.profitMargin > 1000)) {
    errors.push({
      field: 'profitMargin',
      message: 'Profit margin must be between 0 and 1000',
      messageKey: 'quotations.validation.profitMarginInvalid',
    })
  }

  return errors
}

/**
 * 验证草稿保存（宽松验证）
 * Validate for draft save (relaxed validation)
 */
export function validateQuotationDraft(data: Partial<QuotationFormData>): ValidationResult {
  const errors: ValidationError[] = []

  // 草稿只需要项目
  if (!data.projectId) {
    errors.push({
      field: 'projectId',
      message: 'Project is required',
      messageKey: 'quotations.validation.projectRequired',
    })
  }

  const errorsByField: Record<string, string> = {}
  errors.forEach(err => {
    if (!errorsByField[err.field]) {
      errorsByField[err.field] = err.message
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    errorsByField,
  }
}

/**
 * 获取错误数量
 * Get the count of validation errors
 */
export function getErrorCount(result: ValidationResult): number {
  return result.errors.length
}

/**
 * 检查特定字段是否有错误
 * Check if a specific field has an error
 */
export function hasFieldError(result: ValidationResult, field: string): boolean {
  return !!result.errorsByField[field]
}

/**
 * 获取特定字段的错误消息
 * Get error message for a specific field
 */
export function getFieldError(result: ValidationResult, field: string): string | undefined {
  return result.errorsByField[field]
}
