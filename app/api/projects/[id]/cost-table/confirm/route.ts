/**
 * Project Cost Table Confirm API
 * 确认成本表 API
 *
 * POST: 确认成本表（检查完成度）
 *
 * Requirements: 6.1, 6.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { setServerPB } from '@/lib/pocketbase/base-service';
import { projectCostTableService } from '@/lib/pocketbase/services/project-cost-table';

/**
 * POST /api/projects/[id]/cost-table/confirm
 * 确认成本表
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // 设置带认证的 PocketBase 实例
    const pb = await createServerPocketBase();
    setServerPB(pb);

    // 检查完成度
    const completion = await projectCostTableService.checkCompletion(projectId);

    if (!completion.complete) {
      return NextResponse.json(
        {
          error: 'Cost table is not complete',
          completion,
        },
        { status: 400 }
      );
    }

    // 确认成本表
    const costTable = await projectCostTableService.confirm(projectId);

    return NextResponse.json({
      costTable,
      completion,
    });
  } catch (error: any) {
    console.error('Error confirming cost table:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to confirm cost table' },
      { status: 500 }
    );
  }
}
