/**
 * Copy Purchase Order API
 * 复制采购订单接口
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { generatePOCode } from '@/lib/services/code-generator';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pb = await createServerPocketBase();

    // Get original PO
    const original = await pb.collection('po').getOne(id);
    if (!original) {
      return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
    }

    // Generate new PO code
    const newCode = await generatePOCode(pb);

    // Deep copy items
    const copiedItems = (original.items || []).map((item: any) => ({
      ...item,
      id: crypto.randomUUID(),
    }));

    // Create new PO
    const newPO = await pb.collection('po').create({
      code: newCode,
      supplier_id: original.supplier_id,
      supplier_name: original.supplier_name,
      currency: original.currency,
      expected_delivery_date: original.expected_delivery_date,
      remarks: original.remarks ? `[Copied from ${original.code}] ${original.remarks}` : `Copied from ${original.code}`,
      total_amount: original.total_amount || 0.01,
      status: 'draft',
      items: copiedItems,
    });

    return NextResponse.json({
      success: true,
      order: {
        id: newPO.id,
        code: newCode,
      },
      message: 'Purchase Order copied successfully',
    });

  } catch (error: any) {
    console.error('Copy PO error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to copy Purchase Order' },
      { status: 500 }
    );
  }
}