import { NextResponse } from 'next/server';
import { poService } from '@/lib/pocketbase/services/po';
import { PurchaseOrderPDF, type PurchaseOrderPDFData } from '@/lib/pdf/purchase-order-template';
import { renderToBuffer } from '@react-pdf/renderer';
import { brandingService } from '@/lib/services/branding-service';
import React from 'react';

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

    // Get branding
    const branding = await brandingService.getDocumentBranding('supplier');

    // Prepare PO data
    const items = Array.isArray(po.items) ? po.items : [];
    const poData: PurchaseOrderPDFData = {
      code: po.code || '',
      created: po.created || new Date().toISOString(),
      currency: po.currency || 'CNY',
      total_amount: po.total_amount || 0,
      remarks: po.remarks,
      supplier: {
        name: po.supplier_name || '',
        name_cn: po.supplier_name_cn,
        address: po.supplier_address,
      },
      project: po.project ? {
        name: po.project.name || '',
        name_cn: po.project.name_cn,
        code: po.project.code,
      } : undefined,
      items: items.map((item: any) => ({
        part_number: item.part_number || item.product_code,
        product_name: item.product_name || item.description_en,
        product_name_cn: item.product_name_cn || item.description_cn,
        quantity: item.quantity || 0,
        unit: item.unit || 'PCS',
        unit_price: item.unit_price || 0,
        amount: item.amount || 0,
      })),
      branding,
    };

    // Render PDF using React.createElement instead of JSX
    const element = React.createElement(PurchaseOrderPDF, { data: poData });
    const pdfBuffer = await renderToBuffer(element as any);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${po.code}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating PO PDF:', error);
    return new NextResponse(`Error generating PO PDF: ${error.message}`, { status: 500 });
  }
}
