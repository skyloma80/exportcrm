import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { StepSnapshot, ShipmentStepHistory } from '@/lib/shipment/step-snapshot';

/**
 * GET /api/shipments/[id]/snapshots
 * 获取发货单的步骤历史快照
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const pb = await createServerPocketBase();
    const { id: shipmentId } = await params;

    // 获取发货单
    const shipment = await pb.collection('shipments').getOne(shipmentId);

    // 从 step_snapshots 字段获取快照数据
    const snapshots: StepSnapshot[] = shipment.step_snapshots || [];
    
    // 计算当前步骤索引（基于状态）
    const currentStepIndex = snapshots.length;

    const history: ShipmentStepHistory = {
      shipmentId,
      currentStepIndex,
      snapshots,
      updatedAt: shipment.updated,
    };

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching step history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch step history' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/shipments/[id]/snapshots
 * 保存步骤快照
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const pb = await createServerPocketBase();
    const { id: shipmentId } = await params;
    const snapshot: StepSnapshot = await request.json();

    // 获取当前发货单
    const shipment = await pb.collection('shipments').getOne(shipmentId);
    const existingSnapshots: StepSnapshot[] = shipment.step_snapshots || [];

    // 检查是否已存在该步骤的快照，如果存在则更新，否则添加
    const existingIndex = existingSnapshots.findIndex(
      s => s.stepId === snapshot.stepId
    );

    let updatedSnapshots: StepSnapshot[];
    if (existingIndex >= 0) {
      // 更新现有快照
      updatedSnapshots = [...existingSnapshots];
      updatedSnapshots[existingIndex] = snapshot;
    } else {
      // 添加新快照
      updatedSnapshots = [...existingSnapshots, snapshot];
    }

    // 更新发货单
    await pb.collection('shipments').update(shipmentId, {
      step_snapshots: updatedSnapshots,
    });

    return NextResponse.json({ success: true, snapshot });
  } catch (error) {
    console.error('Error saving step snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to save step snapshot' },
      { status: 500 }
    );
  }
}
