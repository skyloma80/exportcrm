/**
 * API Route: Product Cost Table
 * 
 * GET /api/rfqs/[id]/cost-table
 * Returns product cost summary with supplier quotations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import * as XLSX from 'xlsx';

interface CostTableItem {
  product: {
    id: string;
    code: string;
    name: string;
    name_cn?: string;
    unit: string;
  };
  quantity: number;
  target_price?: number;
  quotations: Array<{
    supplier: {
      id: string;
      code: string;
      name: string;
      name_cn?: string;
      rating?: number;
    };
    unit_price: number;
    moq?: number;
    lead_time_days?: number;
    valid_until?: string;
    remarks?: string;
  }>;
  lowest_price?: number;
  lowest_price_supplier_id?: string;
  average_price?: number;
}

interface MoldCostItem {
  supplier: {
    id: string;
    code: string;
    name: string;
    name_cn?: string;
  };
  mold_type: string;
  cost: number;
  lead_time_days?: number;
  lifespan?: number;
}

interface CostTableResponse {
  rfq: {
    id: string;
    code: string;
    project_name?: string;
    customer_name?: string;
  };
  items: CostTableItem[];
  mold_costs: MoldCostItem[];
  summary: {
    total_items: number;
    total_suppliers: number;
    lowest_total?: number;
    average_total?: number;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rfqId } = await params;
    const pb = await createServerPocketBase();
    
    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get format from query params
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');

    // Get RFQ with project info
    const rfq = await pb.collection('rfqs').getOne(rfqId, {
      expand: 'project,project.customer',
    });

    if (!rfq) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    // Get RFQ items with product info
    const rfqItems = await pb.collection('rfq_items').getFullList({
      filter: `rfq = "${rfqId}"`,
      expand: 'product',
    });

    // Get all quotations
    const quotations = await pb.collection('rfq_quotations').getFullList({
      filter: `rfq = "${rfqId}"`,
    });

    // Get mold quotations
    const moldQuotations = await pb.collection('rfq_mold_quotations').getFullList({
      filter: `rfq = "${rfqId}"`,
    });

    // Get unique supplier IDs
    const supplierIds = new Set<string>();
    quotations.forEach(q => supplierIds.add(q.supplier));
    moldQuotations.forEach(m => supplierIds.add(m.supplier));

    // Get supplier details
    const suppliers = supplierIds.size > 0
      ? await pb.collection('suppliers').getFullList({
          filter: Array.from(supplierIds).map(id => `id = "${id}"`).join(' || '),
        })
      : [];
    const supplierMap = new Map(suppliers.map(s => [s.id, s]));

    // Build cost table items
    const costItems: CostTableItem[] = rfqItems.map(item => {
      const product = item.expand?.product;
      const itemQuotations = quotations.filter(q => q.rfq_item === item.id);
      
      const quotationDetails = itemQuotations.map(q => {
        const supplier = supplierMap.get(q.supplier);
        return {
          supplier: {
            id: q.supplier,
            code: supplier?.code || '',
            name: supplier?.name || '',
            name_cn: supplier?.name_cn,
            rating: supplier?.rating,
          },
          unit_price: q.unit_price,
          moq: q.moq,
          lead_time_days: q.lead_time_days,
          valid_until: q.valid_until,
          remarks: q.remarks,
        };
      });

      // Calculate lowest and average price
      const prices = quotationDetails.map(q => q.unit_price);
      const lowestPrice = prices.length > 0 ? Math.min(...prices) : undefined;
      const averagePrice = prices.length > 0 
        ? prices.reduce((a, b) => a + b, 0) / prices.length 
        : undefined;
      const lowestPriceSupplier = quotationDetails.find(q => q.unit_price === lowestPrice);

      return {
        product: {
          id: product?.id || item.product,
          code: product?.code || '',
          name: product?.name || '',
          name_cn: product?.name_cn,
          unit: product?.unit || 'PCS',
        },
        quantity: item.quantity,
        target_price: item.target_price,
        quotations: quotationDetails,
        lowest_price: lowestPrice,
        lowest_price_supplier_id: lowestPriceSupplier?.supplier.id,
        average_price: averagePrice,
      };
    });

    // Build mold cost items
    const moldCosts: MoldCostItem[] = moldQuotations.map(m => {
      const supplier = supplierMap.get(m.supplier);
      return {
        supplier: {
          id: m.supplier,
          code: supplier?.code || '',
          name: supplier?.name || '',
          name_cn: supplier?.name_cn,
        },
        mold_type: m.mold_type,
        cost: m.cost,
        lead_time_days: m.lead_time_days,
        lifespan: m.lifespan,
      };
    });

    // Calculate summary
    const summary = {
      total_items: costItems.length,
      total_suppliers: supplierIds.size,
      lowest_total: costItems.reduce((sum, item) => {
        if (item.lowest_price) {
          return sum + item.lowest_price * item.quantity;
        }
        return sum;
      }, 0),
      average_total: costItems.reduce((sum, item) => {
        if (item.average_price) {
          return sum + item.average_price * item.quantity;
        }
        return sum;
      }, 0),
    };

    const response: CostTableResponse = {
      rfq: {
        id: rfq.id,
        code: rfq.code,
        project_name: rfq.expand?.project?.name,
        customer_name: rfq.expand?.project?.expand?.customer?.name,
      },
      items: costItems,
      mold_costs: moldCosts,
      summary,
    };

    // Return Excel if requested
    // TODO: Implement Excel export
    // if (format === 'excel') {
    //   const workbook = generateExcel(response, suppliers);
    //   const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    //   
    //   return new NextResponse(buffer, {
    //     headers: {
    //       'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    //       'Content-Disposition': `attachment; filename="cost-table-${rfq.code}.xlsx"`,
    //     },
    //   });
    // }

    return NextResponse.json(response);

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error generating cost table:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate cost table' },
      { status: 500 }
    );
  }
}

function generateExcel(data: CostTableResponse, suppliers: any[]): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Product Cost Comparison
  const comparisonData: any[][] = [];
  
  // Header row
  const headerRow = ['Product Code', 'Product Name', 'Unit', 'Quantity', 'Target Price'];
  suppliers.forEach(s => {
    headerRow.push(`${s.name} - Price`);
    headerRow.push(`${s.name} - MOQ`);
    headerRow.push(`${s.name} - Lead Time`);
  });
  headerRow.push('Lowest Price', 'Average Price', 'Lowest Total');
  comparisonData.push(headerRow);

  // Data rows
  data.items.forEach(item => {
    const row: any[] = [
      item.product.code,
      item.product.name,
      item.product.unit,
      item.quantity,
      item.target_price || '',
    ];

    suppliers.forEach(s => {
      const quotation = item.quotations.find(q => q.supplier.id === s.id);
      row.push(quotation?.unit_price || '');
      row.push(quotation?.moq || '');
      row.push(quotation?.lead_time_days || '');
    });

    row.push(item.lowest_price || '');
    row.push(item.average_price ? item.average_price.toFixed(2) : '');
    row.push(item.lowest_price ? (item.lowest_price * item.quantity).toFixed(2) : '');
    
    comparisonData.push(row);
  });

  // Summary row
  comparisonData.push([]);
  comparisonData.push(['Summary']);
  comparisonData.push(['Total Items', data.summary.total_items]);
  comparisonData.push(['Total Suppliers', data.summary.total_suppliers]);
  comparisonData.push(['Lowest Total', data.summary.lowest_total?.toFixed(2) || '']);
  comparisonData.push(['Average Total', data.summary.average_total?.toFixed(2) || '']);

  const comparisonSheet = XLSX.utils.aoa_to_sheet(comparisonData);
  XLSX.utils.book_append_sheet(workbook, comparisonSheet, 'Cost Comparison');

  // Sheet 2: Mold Costs
  if (data.mold_costs.length > 0) {
    const moldData: any[][] = [
      ['Supplier', 'Mold Type', 'Cost', 'Lead Time (days)', 'Lifespan'],
    ];

    data.mold_costs.forEach(mold => {
      moldData.push([
        mold.supplier.name,
        mold.mold_type,
        mold.cost,
        mold.lead_time_days || '',
        mold.lifespan || '',
      ]);
    });

    const moldSheet = XLSX.utils.aoa_to_sheet(moldData);
    XLSX.utils.book_append_sheet(workbook, moldSheet, 'Mold Costs');
  }

  // Sheet 3: Supplier Details
  const supplierData: any[][] = [
    ['Code', 'Name', 'Name (CN)', 'Rating', 'Type'],
  ];

  suppliers.forEach(s => {
    supplierData.push([
      s.code,
      s.name,
      s.name_cn || '',
      s.rating || '',
      s.type || '',
    ]);
  });

  const supplierSheet = XLSX.utils.aoa_to_sheet(supplierData);
  XLSX.utils.book_append_sheet(workbook, supplierSheet, 'Suppliers');

  return workbook;
}
