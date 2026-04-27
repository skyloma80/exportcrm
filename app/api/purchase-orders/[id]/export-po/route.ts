import { NextRequest, NextResponse } from 'next/server';
import { getPocketBase } from '@/lib/pocketbase/auth';
import { purchaseOrderService } from '@/lib/pocketbase/services/purchase-orders';
import { excelPoService } from '@/lib/services/excel-po-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pb = getPocketBase();
    
    // Check auth
    if (!pb.authStore.isValid) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get the PO with details
    const po = await purchaseOrderService.getWithDetails(id);
    if (!po) {
      return new NextResponse('Purchase Order not found', { status: 404 });
    }

    // Generate Excel
    const buffer = await excelPoService.generatePoExcel(po);

    // Create response with appropriate headers
    const filename = `PO_${po.code}_${formatFilename(new Date())}.xlsx`;
    
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting PO:', error);
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}

function formatFilename(date: Date): string {
  return date.toISOString().split('T')[0];
}
