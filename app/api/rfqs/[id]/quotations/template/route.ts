/**
 * RFQ Quotation Template API
 * 供应商报价模板下载 API
 * 
 * GET /api/rfqs/[id]/quotations/template
 * Download Excel template for supplier quotation import
 * 
 * Uses Chinese headers with backward compatibility for English headers during import.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import * as XLSX from 'xlsx';

// Chinese headers for template generation
const CHINESE_HEADERS = {
  supplierCode: '供应商编码',
  supplierName: '供应商名称',
  productCode: '产品编码',
  productName: '产品名称',
  quantity: '数量',
  targetPrice: '目标价格',
  unitPrice: '单价',
  moq: '最小起订量',
  leadTimeDays: '交期（天）',
  validUntil: '有效期至',
  remarks: '备注',
  moldType: '模具类型',
  moldCost: '模具费用',
  moldLeadTime: '模具交期（天）',
  moldLifespan: '模具寿命',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rfqId } = await params;
    const pb = await createServerPocketBase();

    // Check authentication
    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get RFQ with items and suppliers
    let rfq;
    try {
      rfq = await pb.collection('rfqs').getOne(rfqId, {
        expand: 'project',
      });
    } catch {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    // Get RFQ items with product details
    const rfqItems = await pb.collection('rfq_items').getFullList({
      filter: `rfq = "${rfqId}"`,
      expand: 'product',
    });

    // Get RFQ suppliers with supplier details
    const rfqSuppliers = await pb.collection('rfq_suppliers').getFullList({
      filter: `rfq = "${rfqId}"`,
      expand: 'supplier',
    });

    // Create template data with Chinese headers
    const templateData: any[] = [];

    // Generate rows for each supplier-product combination
    for (const rs of rfqSuppliers) {
      const supplier = rs.expand?.supplier;
      if (!supplier) continue;

      for (const item of rfqItems) {
        const product = item.expand?.product;
        if (!product) continue;

        templateData.push({
          [CHINESE_HEADERS.supplierCode]: supplier.code,
          [CHINESE_HEADERS.supplierName]: supplier.name,
          [CHINESE_HEADERS.productCode]: product.code,
          [CHINESE_HEADERS.productName]: product.name,
          [CHINESE_HEADERS.quantity]: item.quantity,
          [CHINESE_HEADERS.targetPrice]: item.target_price || '',
          [CHINESE_HEADERS.unitPrice]: '',
          [CHINESE_HEADERS.moq]: '',
          [CHINESE_HEADERS.leadTimeDays]: '',
          [CHINESE_HEADERS.validUntil]: '',
          [CHINESE_HEADERS.remarks]: '',
        });
      }

      // Add a mold quotation row for each supplier
      templateData.push({
        [CHINESE_HEADERS.supplierCode]: supplier.code,
        [CHINESE_HEADERS.supplierName]: supplier.name,
        [CHINESE_HEADERS.productCode]: '',
        [CHINESE_HEADERS.productName]: '(模具报价)',
        [CHINESE_HEADERS.quantity]: '',
        [CHINESE_HEADERS.targetPrice]: '',
        [CHINESE_HEADERS.unitPrice]: '',
        [CHINESE_HEADERS.moq]: '',
        [CHINESE_HEADERS.leadTimeDays]: '',
        [CHINESE_HEADERS.validUntil]: '',
        [CHINESE_HEADERS.remarks]: '',
        [CHINESE_HEADERS.moldType]: '',
        [CHINESE_HEADERS.moldCost]: '',
        [CHINESE_HEADERS.moldLeadTime]: '',
        [CHINESE_HEADERS.moldLifespan]: '',
      });
    }

    // If no data, create a sample template
    if (templateData.length === 0) {
      templateData.push({
        [CHINESE_HEADERS.supplierCode]: 'S-2025-00001',
        [CHINESE_HEADERS.supplierName]: '示例供应商',
        [CHINESE_HEADERS.productCode]: 'PRD-2025-00001',
        [CHINESE_HEADERS.productName]: '示例产品',
        [CHINESE_HEADERS.quantity]: 1000,
        [CHINESE_HEADERS.targetPrice]: 10.00,
        [CHINESE_HEADERS.unitPrice]: 9.50,
        [CHINESE_HEADERS.moq]: 500,
        [CHINESE_HEADERS.leadTimeDays]: 30,
        [CHINESE_HEADERS.validUntil]: '2025-03-31',
        [CHINESE_HEADERS.remarks]: '',
      });

      // Add mold quotation example
      templateData.push({
        [CHINESE_HEADERS.supplierCode]: 'S-2025-00001',
        [CHINESE_HEADERS.supplierName]: '示例供应商',
        [CHINESE_HEADERS.productCode]: '',
        [CHINESE_HEADERS.productName]: '(模具报价)',
        [CHINESE_HEADERS.quantity]: '',
        [CHINESE_HEADERS.targetPrice]: '',
        [CHINESE_HEADERS.unitPrice]: '',
        [CHINESE_HEADERS.moq]: '',
        [CHINESE_HEADERS.leadTimeDays]: '',
        [CHINESE_HEADERS.validUntil]: '',
        [CHINESE_HEADERS.remarks]: '',
        [CHINESE_HEADERS.moldType]: 'die_casting',
        [CHINESE_HEADERS.moldCost]: 5000,
        [CHINESE_HEADERS.moldLeadTime]: 45,
        [CHINESE_HEADERS.moldLifespan]: 100000,
      });
    }

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 },  // 供应商编码
      { wch: 25 },  // 供应商名称
      { wch: 18 },  // 产品编码
      { wch: 30 },  // 产品名称
      { wch: 10 },  // 数量
      { wch: 12 },  // 目标价格
      { wch: 12 },  // 单价
      { wch: 12 },  // 最小起订量
      { wch: 12 },  // 交期（天）
      { wch: 12 },  // 有效期至
      { wch: 30 },  // 备注
      { wch: 15 },  // 模具类型
      { wch: 12 },  // 模具费用
      { wch: 15 },  // 模具交期
      { wch: 12 },  // 模具寿命
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, '报价表');

    // Add instructions sheet in Chinese
    const instructionsData = [
      { '填写说明': '如何填写此模板：' },
      { '填写说明': '' },
      { '填写说明': '1. 在"单价"列填写每个产品的报价单价' },
      { '填写说明': '2. "最小起订量"为可选项，填写最小订购数量' },
      { '填写说明': '3. "交期（天）"填写生产交货天数' },
      { '填写说明': '4. "有效期至"日期格式：YYYY-MM-DD（如：2025-03-31）' },
      { '填写说明': '' },
      { '填写说明': '模具报价填写说明：' },
      { '填写说明': '- 产品编码和产品名称留空' },
      { '填写说明': '- 填写模具类型、模具费用、模具交期和模具寿命' },
      { '填写说明': '- 模具类型可选值：die_casting(压铸模), stamping(冲压模), injection(注塑模), cnc_fixture(CNC夹具), forging(锻造模), extrusion(挤压模)' },
      { '填写说明': '' },
      { '填写说明': '注意事项：' },
      { '填写说明': '- 供应商编码或供应商名称必须与询价单中的供应商匹配' },
      { '填写说明': '- 产品编码或产品名称必须与询价单中的产品匹配' },
      { '填写说明': '- 数量和目标价格仅供参考（来自询价单）' },
    ];

    const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, '填写说明');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return file
    const filename = `报价模板_${rfq.code}.xlsx`;
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error: any) {
    console.error('Template generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate template' },
      { status: 500 }
    );
  }
}
