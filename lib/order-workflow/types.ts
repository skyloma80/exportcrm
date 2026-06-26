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






