/**
 * 发货向导步骤快照管理
 * 用于保存每个已完成步骤的数据副本，支持回退查看但不可修改
 */

import { ShipmentStatus } from './wizard-config';

export interface StepSnapshot {
  /** 步骤ID */
  stepId: string;
  /** 步骤状态 */
  status: ShipmentStatus;
  /** 完成时间 */
  completedAt: string;
  /** 步骤数据快照 */
  data: Record<string, any>;
  /** 操作人 */
  completedBy?: string;
}

export interface ShipmentStepHistory {
  /** 发货单ID */
  shipmentId: string;
  /** 当前活动步骤索引 */
  currentStepIndex: number;
  /** 已完成步骤的快照列表 */
  snapshots: StepSnapshot[];
  /** 最后更新时间 */
  updatedAt: string;
}

/**
 * 创建步骤快照
 */
export function createStepSnapshot(
  stepId: string,
  status: ShipmentStatus,
  data: Record<string, any>,
  completedBy?: string
): StepSnapshot {
  return {
    stepId,
    status,
    completedAt: new Date().toISOString(),
    data: JSON.parse(JSON.stringify(data)), // 深拷贝
    completedBy,
  };
}

/**
 * 保存步骤快照到发货单
 */
export async function saveStepSnapshot(
  shipmentId: string,
  snapshot: StepSnapshot
): Promise<void> {
  const response = await fetch(`/api/shipments/${shipmentId}/snapshots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  });

  if (!response.ok) {
    throw new Error('Failed to save step snapshot');
  }
}

/**
 * 获取发货单的步骤历史
 */
export async function getStepHistory(
  shipmentId: string
): Promise<ShipmentStepHistory | null> {
  try {
    const response = await fetch(`/api/shipments/${shipmentId}/snapshots`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to get step history:', error);
    return null;
  }
}

/**
 * 获取特定步骤的快照
 */
export function getStepSnapshotById(
  history: ShipmentStepHistory,
  stepId: string
): StepSnapshot | null {
  return history.snapshots.find(s => s.stepId === stepId) || null;
}

/**
 * 检查步骤是否已完成（有快照）
 */
export function isStepCompleted(
  history: ShipmentStepHistory | null,
  stepId: string
): boolean {
  if (!history) return false;
  return history.snapshots.some(s => s.stepId === stepId);
}

/**
 * 检查是否可以查看步骤（已完成或当前步骤）
 */
export function canViewStep(
  history: ShipmentStepHistory | null,
  stepIndex: number,
  currentStepIndex: number
): boolean {
  // 可以查看：已完成的步骤 或 当前步骤
  return stepIndex <= currentStepIndex;
}

/**
 * 检查步骤是否为只读模式
 */
export function isStepReadOnly(
  stepIndex: number,
  currentStepIndex: number
): boolean {
  // 只读：不是当前步骤
  return stepIndex < currentStepIndex;
}
