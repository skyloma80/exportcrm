import { NextResponse } from 'next/server';
import { soService } from '@/lib/pocketbase/services/so';
import { InvoicePDF, type InvoicePDFData } from '@/lib/pdf/invoice-template';
import { renderToBuffer } from '@react-pdf/renderer';
import { brandingService } from '@/lib/services/branding-service';
import React from 'react';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const so = await soService.getOne(id);
    if (!so) {
      return new NextResponse('SO not found', { status: 404 });
    }

    // Get branding
    const branding = await brandingService.getDocumentBranding('customer');

    // Prepare PI data
    const items = Array.isArray(so.items) ? so.items : [];
    const piData: InvoicePDFData = {
      code: so.code || '',
      issue_date: so.created || new Date().toISOString(),
      currency: so.currency || 'USD',
      total_amount: so.total_amount || 0,
      order: {
      code: so.code || '',
        incoterm: so.incoterm,
        port_of_loading: so.port_of_loading,
        port_of_destination: so.port_of_destination,
        payment_terms: so.payment_terms,
        estimated_shipping_date: so.estimated_shipping_date,
        customer_po: so.customer_po,
        vendor_code: so.vendor_code,
        mode_of_shipment: so.mode_of_shipment,
      },
      customer: {
        name: so.customer_name || '',
        address: so.customer_address,
        tax_id: so.customer_tax_id,
        contact_person: so.customer_contact,
        phone: so.customer_phone,
        email: so.customer_email,
        country: so.customer_country,
      },
      items: items.map((item: any) => ({
        part_number: item.part_number || item.product_code,
        product_name: item.product_name || item.description_en,
        description: item.description_en,
        quantity: item.quantity || 0,
        unit: item.unit || 'PCS',
        unit_price: item.unit_price || 0,
        amount: item.amount || 0,
      })),
      bank_info: so.bank_info || '',
      terms: {
        payment: so.payment_terms,
        price_term: so.incoterm,
        country_of_origin: so.country_of_origin,
        country_of_destination: so.country_of_destination,
        port_of_loading: so.port_of_loading,
        port_of_discharge: so.port_of_destination,
        mode_of_shipment: so.mode_of_shipment,
        time_of_delivery: so.estimated_shipping_date,
      },
      remarks: so.remarks,
      branding,
    };

    // Render PDF using React.createElement instead of JSX
    const element = React.createElement(InvoicePDF, { data: piData });
    const pdfBuffer = await renderToBuffer(element as any);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="PI_${so.code}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating PI PDF:', error);
    return new NextResponse(`Error generating PI PDF: ${error.message}`, { status: 500 });
  }
}
