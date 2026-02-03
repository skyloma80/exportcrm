/**
 * Order Status Prerequisite Checker
 * 订单状态推进前置条件检查服务
 */

import { getPocketBase } from '@/lib/pocketbase/auth'
import type { OrderStatus, PrerequisiteCheck, PrerequisiteResult } from './types'

/**
 * 检查 draft → confirmed 的前置条件
 */
async function checkDraftToConfirmed(orderId: string): Promise<PrerequisiteCheck[]> {
  const pb = getPocketBase()
  const checks: PrerequisiteCheck[] = []
  
  // 检查1: 订单必须有产品
  try {
    const items = await pb.collection('order_items').getList(1, 1, {
      filter: `order = "${orderId}"`,
    })
    checks.push({
      id: 'has_items',
      name: 'orders.workflow.checks.hasItems',
      description: 'orders.workflow.checks.hasItemsDesc',
      passed: items.totalItems > 0,
      required: true,
      errorMessage: items.totalItems === 0 ? 'orders.workflow.errors.noItems' : undefined,
    })
  } catch {
    checks.push({
      id: 'has_items',
      name: 'orders.workflow.checks.hasItems',
      description: 'orders.workflow.checks.hasItemsDesc',
      passed: false,
      required: true,
      errorMessage: 'orders.workflow.errors.checkFailed',
    })
  }
  
  // 检查2: 总金额必须大于0
  try {
    const order = await pb.collection('orders').getOne(orderId)
    const hasAmount = order.total_amount > 0
    checks.push({
      id: 'has_amount',
      name: 'orders.workflow.checks.hasAmount',
      description: 'orders.workflow.checks.hasAmountDesc',
      passed: hasAmount,
      required: true,
      errorMessage: !hasAmount ? 'orders.workflow.errors.zeroAmount' : undefined,
    })
  } catch {
    checks.push({
      id: 'has_amount',
      name: 'orders.workflow.checks.hasAmount',
      description: 'orders.workflow.checks.hasAmountDesc',
      passed: false,
      required: true,
      errorMessage: 'orders.workflow.errors.checkFailed',
    })
  }
  
  return checks
}

/**
 * 检查 confirmed → in_production 的前置条件
 */
async function checkConfirmedToInProduction(orderId: string): Promise<PrerequisiteCheck[]> {
  const pb = getPocketBase()
  const checks: PrerequisiteCheck[] = []
  
  // 检查: 必须有已审批的收款（定金）
  try {
    const payments = await pb.collection('order_payments').getList(1, 1, {
      filter: `order = "${orderId}" && status = "approved"`,
    })
    checks.push({
      id: 'has_deposit',
      name: 'orders.workflow.checks.hasDeposit',
      description: 'orders.workflow.checks.hasDepositDesc',
      passed: payments.totalItems > 0,
      required: true,
      errorMessage: payments.totalItems === 0 ? 'orders.workflow.errors.noDeposit' : undefined,
    })
  } catch {
    checks.push({
      id: 'has_deposit',
      name: 'orders.workflow.checks.hasDeposit',
      description: 'orders.workflow.checks.hasDepositDesc',
      passed: false,
      required: true,
      errorMessage: 'orders.workflow.errors.checkFailed',
    })
  }
  
  return checks
}

/**
 * 检查 in_production → ready_to_ship 的前置条件
 */
async function checkInProductionToReadyToShip(_orderId: string): Promise<PrerequisiteCheck[]> {
  // 这个检查是可选的，因为生产完成状态可能由外部系统管理
  return [{
    id: 'production_complete',
    name: 'orders.workflow.checks.productionComplete',
    description: 'orders.workflow.checks.productionCompleteDesc',
    passed: true,  // 默认通过，用户可以手动确认
    required: false,  // 非必须
  }]
}

/**
 * 检查 ready_to_ship → shipped 的前置条件
 */
async function checkReadyToShipToShipped(orderId: string): Promise<PrerequisiteCheck[]> {
  const pb = getPocketBase()
  const checks: PrerequisiteCheck[] = []
  
  // 检查: 必须有发货记录
  try {
    const shipments = await pb.collection('shipments').getList(1, 1, {
      filter: `order = "${orderId}"`,
    })
    checks.push({
      id: 'has_shipment',
      name: 'orders.workflow.checks.hasShipment',
      description: 'orders.workflow.checks.hasShipmentDesc',
      passed: shipments.totalItems > 0,
      required: true,
      errorMessage: shipments.totalItems === 0 ? 'orders.workflow.errors.noShipment' : undefined,
    })
  } catch {
    checks.push({
      id: 'has_shipment',
      name: 'orders.workflow.checks.hasShipment',
      description: 'orders.workflow.checks.hasShipmentDesc',
      passed: false,
      required: true,
      errorMessage: 'orders.workflow.errors.checkFailed',
    })
  }
  
  return checks
}

/**
 * 检查 shipped → delivered 的前置条件
 */
async function checkShippedToDelivered(orderId: string): Promise<PrerequisiteCheck[]> {
  const pb = getPocketBase()
  const checks: PrerequisiteCheck[] = []
  
  // 检查: 发货记录有送达确认
  try {
    const shipments = await pb.collection('shipments').getList(1, 1, {
      filter: `order = "${orderId}" && status = "delivered"`,
    })
    checks.push({
      id: 'shipment_delivered',
      name: 'orders.workflow.checks.shipmentDelivered',
      description: 'orders.workflow.checks.shipmentDeliveredDesc',
      passed: shipments.totalItems > 0,
      required: false,  // 非必须，可以手动确认
      errorMessage: shipments.totalItems === 0 ? 'orders.workflow.errors.notDelivered' : undefined,
    })
  } catch {
    checks.push({
      id: 'shipment_delivered',
      name: 'orders.workflow.checks.shipmentDelivered',
      description: 'orders.workflow.checks.shipmentDeliveredDesc',
      passed: false,
      required: false,
      errorMessage: 'orders.workflow.errors.checkFailed',
    })
  }
  
  return checks
}

/**
 * 检查 delivered → completed 的前置条件
 */
async function checkDeliveredToCompleted(orderId: string): Promise<PrerequisiteCheck[]> {
  const pb = getPocketBase()
  const checks: PrerequisiteCheck[] = []
  
  // 检查: 全款已收
  try {
    const order = await pb.collection('orders').getOne(orderId)
    const fullyPaid = order.paid_amount >= order.total_amount
    checks.push({
      id: 'fully_paid',
      name: 'orders.workflow.checks.fullyPaid',
      description: 'orders.workflow.checks.fullyPaidDesc',
      passed: fullyPaid,
      required: true,
      errorMessage: !fullyPaid ? 'orders.workflow.errors.notFullyPaid' : undefined,
    })
  } catch {
    checks.push({
      id: 'fully_paid',
      name: 'orders.workflow.checks.fullyPaid',
      description: 'orders.workflow.checks.fullyPaidDesc',
      passed: false,
      required: true,
      errorMessage: 'orders.workflow.errors.checkFailed',
    })
  }
  
  return checks
}

/**
 * 检查状态推进的所有前置条件
 */
export async function checkPrerequisites(
  orderId: string,
  currentStatus: OrderStatus,
  targetStatus: OrderStatus
): Promise<PrerequisiteResult> {
  let checks: PrerequisiteCheck[] = []
  
  // 根据状态转换获取对应的检查
  if (currentStatus === 'draft' && targetStatus === 'confirmed') {
    checks = await checkDraftToConfirmed(orderId)
  } else if (currentStatus === 'confirmed' && targetStatus === 'in_production') {
    checks = await checkConfirmedToInProduction(orderId)
  } else if (currentStatus === 'in_production' && targetStatus === 'ready_to_ship') {
    checks = await checkInProductionToReadyToShip(orderId)
  } else if (currentStatus === 'ready_to_ship' && targetStatus === 'shipped') {
    checks = await checkReadyToShipToShipped(orderId)
  } else if (currentStatus === 'shipped' && targetStatus === 'delivered') {
    checks = await checkShippedToDelivered(orderId)
  } else if (currentStatus === 'delivered' && targetStatus === 'completed') {
    checks = await checkDeliveredToCompleted(orderId)
  }
  // 取消不需要前置条件检查
  
  // 计算是否可以推进（所有必须条件都通过）
  const canAdvance = checks.every(check => !check.required || check.passed)
  
  return {
    canAdvance,
    checks,
  }
}

/**
 * 执行状态推进
 */
export async function advanceStatus(
  orderId: string,
  targetStatus: OrderStatus,
  userId: string,
  reason?: string
): Promise<void> {
  const pb = getPocketBase()
  
  // 获取当前订单
  const order = await pb.collection('orders').getOne(orderId)
  const fromStatus = order.status as OrderStatus
  
  // 更新订单状态
  await pb.collection('orders').update(orderId, {
    status: targetStatus,
  })
  
  // 记录活动日志
  await pb.collection('activity_logs').create({
    entity_type: 'order',
    entity_id: orderId,
    action: 'status_change',
    details: {
      from_status: fromStatus,
      to_status: targetStatus,
      reason: reason,
    },
    user_id: userId,
  })
  
  // 如果是取消，更新 paid_amount 相关逻辑可以在这里处理
}
