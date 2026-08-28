import { NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { setServerPB } from '@/lib/pocketbase/base-service';
import { soService } from '@/lib/pocketbase/services/so';
import { excelPiService } from '@/lib/services/excel-pi-service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const pb = await createServerPocketBase();
    if (!pb.authStore.isValid) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    setServerPB(pb);

    const so = await soService.getOne(id);
    if (!so) {
      return new NextResponse('SO not found', { status: 404 });
    }

    const buffer = await excelPiService.generatePiExcel(so);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="PI_${so.code}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating PI Excel:', error);
    return new NextResponse(`Error generating PI Excel: ${error.message}`, { status: 500 });
  }
}
