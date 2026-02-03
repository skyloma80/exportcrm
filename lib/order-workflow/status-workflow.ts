/**
 * Order Status Workflow Service
 * 订单状态工作流服务
 */

import type { OrderStatus } from './types'

/**
 * 状态工作流定义
 * 定义每个状态的下一个有效状态
 */
export const STATUS_WORKFLOW: Record<OrderStatus, OrderStatus | null> = {
  draft: 'confirmed',
  confirmed: 'in_production',
  in_production: 'ready_to_ship',
  ready_to_ship: 'shipped',
  shipped: 'delivered',
  delivered: 'completed',
  completed: null,  // 终态
  cancelled: null,  // 终态
}

/**
 * 状态显示顺序（用于进度条等）
 */
export const STATUS_ORDER: OrderStatus[] = [
  'draft',
  'confirmed',
  'in_production',
  'ready_to_ship',
  'shipped',
  'delivered',
  'completed',
]

/**
 * 获取状态的 i18n 翻译键
 */
export function getStatusLabelKey(status: OrderStatus): string {
  return `orders.status.${status}`
}

/**
 * 获取状态推进按钮的 i18n 翻译键
 */
export function getAdvanceButtonLabelKey(currentStatus: OrderStatus): string | null {
  const nextStatus = getNextStatus(currentStatus)
  if (!nextStatus) return null
  
  const buttonLabels: Record<OrderStatus, string> = {
    draft: 'orders.actions.confirm',
    confirmed: 'orders.actions.startProduction',
    in_production: 'orders.actions.readyToShip',
    ready_to_ship: 'orders.actions.ship',
    shipped: 'orders.actions.deliver',
    delivered: 'orders.actions.complete',
    completed: '',
    cancelled: '',
  }
  
  return buttonLabels[currentStatus] || null
}

/**
 * 获取下一个状态
 * @param currentStatus 当前状态
 * @returns 下一个状态，如果是终态则返回 null
 */
export function getNextStatus(currentStatus: OrderStatus): OrderStatus | null {
  return STATUS_WORKFLOW[currentStatus]
}

/**
 * 检查状态转换是否有效
 * @param from 当前状态
 * @param to 目标状态
 * @returns 是否是有效的状态转换
 */
export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  // 取消是特殊情况，从任何非终态都可以取消
  if (to === 'cancelled') {
    return canCancel(from)
  }
  
  // 重新激活：从 cancelled 回到 draft
  if (from === 'cancelled' && to === 'draft') {
    return true
  }
  
  // 正常流转：目标状态必须是当前状态的下一个状态
  return STATUS_WORKFLOW[from] === to
}

/**
 * 检查订单是否可以取消
 * @param status 当前状态
 * @returns 是否可以取消
 */
export function canCancel(status: OrderStatus): boolean {
  // 已完成和已取消的订单不能再取消
  return status !== 'completed' && status !== 'cancelled'
}

/**
 * 检查是否是终态
 * @param status 状态
 * @returns 是否是终态
 */
export function isTerminalStatus(status: OrderStatus): boolean {
  return status === 'completed' || status === 'cancelled'
}

/**
 * 检查订单是否可以重新激活
 * @param status 当前状态
 * @returns 是否可以重新激活
 */
export function canReactivate(status: OrderStatus): boolean {
  // 只有已取消的订单可以重新激活
  return status === 'cancelled'
}

/**
 * 获取状态在工作流中的索引位置
 * @param status 状态
 * @returns 索引位置，-1 表示不在正常流程中（如 cancelled）
 */
export function getStatusIndex(status: OrderStatus): number {
  if (status === 'cancelled') return -1
  return STATUS_ORDER.indexOf(status)
}

/**
 * 计算订单完成进度百分比
 * @param status 当前状态
 * @returns 进度百分比 (0-100)
 */
export function getProgressPercentage(status: OrderStatus): number {
  if (status === 'cancelled') return 0
  const index = getStatusIndex(status)
  if (index === -1) return 0
  return Math.round((index / (STATUS_ORDER.length - 1)) * 100)
}
