/**
 * Order Status Workflow Types
 * 订单状态工作流类型定义
 */

// 订单状态类型
export type OrderStatus = 
  | 'draft' 
  | 'confirmed' 
  | 'in_production' 
  | 'ready_to_ship' 
  | 'shipped' 
  | 'delivered' 
  | 'completed' 
  | 'cancelled'

// 所有有效的订单状态
export const ORDER_STATUSES: OrderStatus[] = [
  'draft',
  'confirmed',
  'in_production',
  'ready_to_ship',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
]

// 前置条件检查结果
export interface PrerequisiteCheck {
  id: string
  name: string
  description: string
  passed: boolean
  required: boolean  // 是否必须通过才能推进
  errorMessage?: string
}

// 前置条件检查总结果
export interface PrerequisiteResult {
  canAdvance: boolean  // 是否可以推进（所有必须条件都通过）
  checks: PrerequisiteCheck[]
}

// 状态变更日志详情
export interface StatusChangeDetails {
  from_status: OrderStatus
  to_status: OrderStatus
  reason?: string  // 取消原因或备注
  skipped_checks?: string[]  // 跳过的非必须检查
}

// 状态变更活动日志
export interface StatusChangeLog {
  entity_type: 'order'
  entity_id: string
  action: 'status_change'
  details: StatusChangeDetails
  user_id: string
  created: string
}

// 状态推进请求
export interface AdvanceStatusRequest {
  orderId: string
  targetStatus: OrderStatus
  skipOptionalChecks?: boolean
  reason?: string
}

// 状态推进响应
export interface AdvanceStatusResponse {
  success: boolean
  order?: {
    id: string
    status: OrderStatus
  }
  error?: string
}
