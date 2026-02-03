/**
 * Item 表单验证工具函数
 * 
 * 提取验证逻辑以便于测试
 */

export interface ItemFormData {
  name: string
  description: string
  status: 'active' | 'inactive' | 'pending'
}

export interface ValidationErrors {
  name?: string
  description?: string
  status?: string
}

/**
 * 验证 name 字段
 */
export function validateName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return "Name is required"
  }
  if (name.length > 100) {
    return "Name must be less than 100 characters"
  }
  return null
}

/**
 * 验证 description 字段
 */
export function validateDescription(description: string): string | null {
  if (description && description.length > 500) {
    return "Description must be less than 500 characters"
  }
  return null
}

/**
 * 验证 status 字段
 */
export function validateStatus(status: string): string | null {
  if (!['active', 'inactive', 'pending'].includes(status)) {
    return "Invalid status"
  }
  return null
}

/**
 * 验证完整的表单数据
 */
export function validateItemForm(data: ItemFormData): ValidationErrors {
  const errors: ValidationErrors = {}
  
  const nameError = validateName(data.name)
  if (nameError) errors.name = nameError
  
  const descriptionError = validateDescription(data.description)
  if (descriptionError) errors.description = descriptionError
  
  const statusError = validateStatus(data.status)
  if (statusError) errors.status = statusError
  
  return errors
}

/**
 * 检查是否有验证错误
 */
export function hasValidationErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0
}

/**
 * 生成搜索过滤字符串
 */
export function buildSearchFilter(searchTerm: string, fields: string[]): string | undefined {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return undefined
  }
  const conditions = fields.map(f => `${f} ~ "${searchTerm}"`).join(" || ")
  return `(${conditions})`
}

/**
 * 生成排序字符串
 */
export function buildSortString(field: string, direction: 'asc' | 'desc'): string {
  return direction === "asc" ? field : `-${field}`
}

/**
 * 计算总页数
 */
export function calculateTotalPages(totalCount: number, pageSize: number): number {
  if (totalCount <= 0 || pageSize <= 0) return 0
  return Math.ceil(totalCount / pageSize)
}
