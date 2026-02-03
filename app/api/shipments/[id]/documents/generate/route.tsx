/**
 * 发货单据生成 API
 * 
 * POST: 生成装箱单(PL)或商业发票(CI) PDF
 * Body: { docType: 'PL' | 'CI' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { createStorage } from '@/lib/s3/storage';
import { renderToBuffer } from '@react-pdf/renderer';
import { PackingListPDF, PackingListPDFData } from '@/lib/pdf/packing-list-template';
import { CommercialInvoicePDF, CommercialInvoicePDFData } from '@/lib/pdf/commercial-invoice-template';
import { brandingService } from '@/lib/services/branding-service';
import {
  getShipmentDocumentPath,
  extractOrderPathInfo,
} from '@/lib/services/shipment-document-path';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { docType } = body;

    if (!docType || !['PL', 'CI'].includes(docType)) {
      return NextResponse.json({ error: 'Invalid document type. Must be PL or CI' }, { status: 400 });
    }

    const pb = await createServerPocketBase();

    // 获取发货记录详情
    let shipment;
    try {
      shipment = await pb.collection('shipments').getOne(id, {
        expand: 'order,order.customer,order.project',
      });
    } catch (e: any) {
      if (e.status === 404) {
        return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
      }
      throw e;
    }

    const order = shipment.expand?.order;
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const customer = order.expand?.customer;
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const pathInfo = extractOrderPathInfo(order);
    if (!pathInfo) {
      return NextResponse.json({ error: 'Missing customer or project info' }, { status: 400 });
    }

    // 获取发货序号
    const allShipments = await pb.collection('shipments').getFullList({
      filter: `order = "${order.id}"`,
      sort: 'created',
    });
    const shipmentIndex = allShipments.findIndex(s => s.id === id) + 1;

    // 获取发货明细
    const shipmentItems = await pb.collection('shipment_items').getFullList({
      filter: `shipment = "${id}"`,
      expand: 'order_item,order_item.product',
    });

    // 获取品牌配置
    const branding = await brandingService.getDocumentBranding('customer');

    // 生成 PDF
    let pdfBuffer: Buffer;
    let fileName: string;

    if (docType === 'PL') {
      // 生成装箱单
      const plData: PackingListPDFData = {
        code: `PL-${shipment.code}`,
        shipment_date: shipment.etd || new Date().toISOString().split('T')[0],
        shipment: {
          code: shipment.code,
          vessel_name: shipment.vessel_name,
          voyage_number: shipment.voyage_number,
          container_number: shipment.container_number,
          container_type: shipment.container_type,
          bl_number: shipment.bl_number,
        },
        order: {
          code: order.code,
        },
        shipper: {
          name: branding?.primaryOffice?.name || 'Company Name',
          address: branding?.primaryOffice?.address,
        },
        consignee: {
          name: customer.name,
          address: customer.address,
        },
        items: shipmentItems.map(item => {
          const orderItem = item.expand?.order_item;
          const product = orderItem?.expand?.product;
          return {
            product_code: product?.code || '',
            product_name: product?.name || '',
            part_number: product?.part_number || orderItem?.part_number,
            quantity: item.quantity || 0,
            unit: product?.unit || 'PCS',
            packages: item.packages || 1,
            gross_weight: item.gross_weight || 0,
            net_weight: item.net_weight || 0,
            dimensions: item.dimensions ? {
              length: item.dimensions.length || 0,
              width: item.dimensions.width || 0,
              height: item.dimensions.height || 0,
            } : undefined,
            volume: item.volume,
          };
        }),
        totals: {
          total_packages: shipmentItems.reduce((sum, item) => sum + (item.packages || 1), 0),
          total_gross_weight: shipmentItems.reduce((sum, item) => sum + (item.gross_weight || 0), 0),
          total_net_weight: shipmentItems.reduce((sum, item) => sum + (item.net_weight || 0), 0),
          total_volume: shipmentItems.reduce((sum, item) => sum + (item.volume || 0), 0) || undefined,
        },
        remarks: shipment.remarks,
        branding,
      };

      pdfBuffer = await renderToBuffer(<PackingListPDF data={plData} />);
      fileName = `PL-${shipment.code}.pdf`;
    } else {
      // TODO: Commercial Invoice generation not yet implemented
      return NextResponse.json(
        { error: 'Commercial Invoice generation is not yet implemented' },
        { status: 501 }
      );
    }

    // 上传到存储
    const storage = createStorage();
    const uploadPath = `${getShipmentDocumentPath(pathInfo, shipmentIndex, docType)}${fileName}`;

    const { data, error } = await storage.upload(uploadPath, pdfBuffer, {
      contentType: 'application/pdf',
    });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: 'Failed to upload generated PDF' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      path: data?.path,
      url: `/api/disk/download?path=${encodeURIComponent(data?.path || '')}`,
      fileName,
    });
  } catch (error) {
    console.error('Error generating document:', error);
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
  }
}
