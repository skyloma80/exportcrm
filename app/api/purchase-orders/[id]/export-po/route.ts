import { NextRequest, NextResponse } from 'next/server';
import { purchaseOrderService } from '@/lib/pocketbase/services/purchase-orders';
import { excelPoService } from '@/lib/services/excel-po-service';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { setServerPB } from '@/lib/pocketbase/base-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const pb = await createServerPocketBase();
    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    setServerPB(pb);

    const { id: poId } = await params;
    const po = await purchaseOrderService.getWithDetails(poId);
    if (!po) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    const buffer = await excelPoService.generatePoExcel(po as any);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="PO_${po.code}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Export PO error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}