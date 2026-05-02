import { NextResponse } from 'next/server';
import { poService } from '@/lib/pocketbase/services/po';
import { excelPoService } from '@/lib/services/excel-po-service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const po = await poService.getOne(id);
    if (!po) {
      return new NextResponse('PO not found', { status: 404 });
    }

    const buffer = await excelPoService.generatePoExcel(po as any);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${po.code}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating Excel:', error);
    return new NextResponse(`Error generating Excel: ${error.message}`, { status: 500 });
  }
}
