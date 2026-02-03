/**
 * RFQ PDF Generation API
 * 询价单 PDF 生成 API
 * 
 * GET /api/rfqs/[id]/pdf
 * Generates PDF for RFQ document (Chinese, for suppliers)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { RFQPDF, RFQPDFData } from '@/lib/pdf/rfq-template';
import { brandingService } from '@/lib/services/branding-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const pb = await createServerPocketBase();

    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get RFQ with related data
    const rfq = await pb.collection('rfqs').getOne(id, {
      expand: 'project,project.customer',
    });

    // Get RFQ items
    const rfqItems = await pb.collection('rfq_items').getFullList({
      filter: `rfq = "${id}"`,
      expand: 'product',
    });

    // Get branding for supplier documents (Chinese)
    brandingService.clearCache();
    const branding = await brandingService.getDocumentBranding('supplier');

    // Build PDF data
    const pdfData: RFQPDFData = {
      code: rfq.code,
      issue_date: rfq.created,
      deadline: rfq.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      remarks: rfq.remarks,
      project: rfq.expand?.project ? {
        name: rfq.expand.project.name,
        code: rfq.expand.project.code,
      } : undefined,
      items: rfqItems.map(item => ({
        part_number: item.expand?.product?.code || '',
        product_name: item.expand?.product?.name || item.expand?.product?.name_cn || '',
        quantity: item.quantity,
        unit: item.expand?.product?.unit || 'PCS',
        remarks: item.remarks || '',
      })),
      branding,
    };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(<RFQPDF data={pdfData} />);

    // Return PDF
    const filename = `${rfq.code}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error: any) {
    console.error('[RFQ PDF] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
