/**
 * Project Cost Table API
 * 项目采购成本表 API
 *
 * GET: 获取聚合数据 + 已保存选择
 * POST: 保存选择（创建或更新成本表）
 *
 * Requirements: 1.1, 1.2, 3.1, 3.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { setServerPB } from '@/lib/pocketbase/base-service';
import {
  projectCostTableService,
  CostTableSelection,
} from '@/lib/pocketbase/services/project-cost-table';

/**
 * GET /api/projects/[id]/cost-table
 * 获取项目成本表数据（聚合报价 + 已保存选择）
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // 设置带认证的 PocketBase 实例
    const pb = await createServerPocketBase();
    setServerPB(pb);

    // 1. 获取聚合数据
    const aggregated = await projectCostTableService.aggregateQuotations(projectId);

    // 2. 获取已保存的成本表和选择
    const { costTable, items } = await projectCostTableService.getWithItems(projectId);

    // 3. 将已保存的选择转换为 selections 格式
    const selections: CostTableSelection[] = items.map(item => ({
      productId: item.product,
      supplierId: item.supplier,
      rfqQuotationId: item.rfq_quotation,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      leadTimeDays: item.lead_time_days,
    }));

    // 4. 获取完成度检查
    const completion = await projectCostTableService.checkCompletion(projectId);

    return NextResponse.json({
      aggregated,
      costTable,
      selections,
      completion,
    });
  } catch (error: any) {
    const status = typeof error?.status === 'number' ? error.status : 500;
    console.error('Error getting cost table:', {
      status,
      message: error?.message,
      data: error?.data,
    });
    return NextResponse.json(
      {
        error: error?.message || 'Failed to get cost table',
        details: error?.data || null,
      },
      { status }
    );
  }
}

/**
 * POST /api/projects/[id]/cost-table
 * 保存成本表选择
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();

    const { selections, currency = 'CNY' } = body as {
      selections: CostTableSelection[];
      currency?: string;
    };

    if (!selections || !Array.isArray(selections)) {
      return NextResponse.json(
        { error: 'Invalid selections data' },
        { status: 400 }
      );
    }

    // 设置带认证的 PocketBase 实例
    const pb = await createServerPocketBase();
    setServerPB(pb);

    // Basic validation for selected items (avoid PB throwing 400/500 with unclear message)
    const invalid = selections
      .filter(s => s.supplierId)
      .find(s =>
        !s.productId ||
        !s.supplierId ||
        typeof s.quantity !== 'number' ||
        s.quantity < 1 ||
        typeof s.unitPrice !== 'number' ||
        s.unitPrice < 0
      );

    if (invalid) {
      return NextResponse.json(
        {
          error: 'Invalid selection item (quantity must be >= 1; unitPrice must be >= 0; productId/supplierId required)',
          invalid,
        },
        { status: 400 }
      );
    }

    // 保存选择
    const costTable = await projectCostTableService.saveSelections(
      projectId,
      selections,
      currency
    );

    // 获取更新后的完成度
    const completion = await projectCostTableService.checkCompletion(projectId);

    return NextResponse.json({
      costTable,
      completion,
    });
  } catch (error: any) {
    // PocketBase throws ClientResponseError with { status, data, message }
    const status = typeof error?.status === 'number' ? error.status : 500;

    console.error('Error saving cost table:', {
      status,
      message: error?.message,
      data: error?.data,
    });

    return NextResponse.json(
      {
        error: error?.message || 'Failed to save cost table',
        details: error?.data || null,
      },
      { status }
    );
  }
}
