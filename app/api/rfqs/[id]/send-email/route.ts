/**
 * RFQ Send Email API Route
 * 询价单发送邮件API
 * 
 * POST /api/rfqs/[id]/send-email
 * Sends RFQ email to selected suppliers with Excel template attachments.
 * 
 * Note: PDF generation temporarily disabled due to Chinese font issues.
 * TODO: Fix RFQ PDF template to match quotation/invoice templates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { createEmailService } from '@/lib/services/email-service';
import * as XLSX from 'xlsx';
import type { RFQWithExpand, RFQItemWithExpand, RFQSupplierWithExpand } from '@/lib/pocketbase/services/rfqs';

interface SendEmailRequest {
  supplierIds: string[];
  attachments?: Array<{
    name: string;
    path: string;
    content?: string;
    type?: string;
    size?: number;
  }>;
  includeTemplate?: boolean;
  templateOptions?: {
    companyName?: string;
    subject?: string;
    greeting?: string;
    intro?: string;
    closing?: string;
    signature?: string;
    footer?: string;
  };
}

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
};


/**
 * Generate quotation template Excel buffer for a specific supplier
 */
async function generateSupplierTemplate(
  supplier: any,
  items: RFQItemWithExpand[],
  rfqRemarks?: string
): Promise<Buffer> {
  const templateData: any[] = [];

  for (const item of items) {
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

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(templateData);

  worksheet['!cols'] = [
    { wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 30 }, { wch: 10 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, '报价表');

  // Build instructions with optional RFQ remarks
  const instructionsData = [
    { '填写说明': '如何填写此模板：' },
    { '填写说明': '' },
    { '填写说明': '1. 在"单价"列填写每个产品的报价单价' },
    { '填写说明': '2. "最小起订量"为可选项，填写最小订购数量' },
    { '填写说明': '3. "交期（天）"填写生产交货天数' },
    { '填写说明': '4. "有效期至"日期格式：YYYY-MM-DD（如：2025-03-31）' },
    { '填写说明': '' },
    { '填写说明': '注意事项：' },
    { '填写说明': '- 请勿修改供应商编码、产品编码等信息' },
    { '填写说明': '- 数量和目标价格仅供参考' },
    { '填写说明': '- 填写完成后请回复此邮件并附上此文件' },
  ];

  // Add RFQ remarks if present
  if (rfqRemarks && rfqRemarks.trim()) {
    instructionsData.push({ '填写说明': '' });
    instructionsData.push({ '填写说明': '【特殊要求】' });
    // Split remarks by newlines and add each line
    const remarkLines = rfqRemarks.split('\n').filter(line => line.trim());
    for (const line of remarkLines) {
      instructionsData.push({ '填写说明': line.trim() });
    }
  }

  const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);
  instructionsSheet['!cols'] = [{ wch: 60 }];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, '填写说明');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rfqId } = await params;
    const pb = await createServerPocketBase();
    
    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = pb.authStore.record?.id;
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body: SendEmailRequest = await request.json();
    const { supplierIds, attachments, includeTemplate = true, templateOptions } = body;

    if (!supplierIds || supplierIds.length === 0) {
      return NextResponse.json({ error: 'No suppliers selected' }, { status: 400 });
    }

    // Get RFQ details
    let rfq: RFQWithExpand;
    try {
      rfq = await pb.collection('rfqs').getOne<RFQWithExpand>(rfqId, {
        expand: 'project,project.customer',
      });
    } catch (e: any) {
      if (e.status === 404) {
        return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
      }
      throw e;
    }

    // Get RFQ items
    const items = await pb.collection('rfq_items').getFullList<RFQItemWithExpand>({
      filter: `rfq = "${rfqId}"`,
      expand: 'product',
    });
    if (items.length === 0) {
      return NextResponse.json({ error: 'RFQ has no items' }, { status: 400 });
    }

    // Get RFQ suppliers
    const rfqSuppliers = await pb.collection('rfq_suppliers').getFullList<RFQSupplierWithExpand>({
      filter: `rfq = "${rfqId}"`,
      expand: 'supplier',
    });
    
    const selectedSuppliers = rfqSuppliers.filter(s => supplierIds.includes(s.supplier));
    if (selectedSuppliers.length === 0) {
      return NextResponse.json({ error: 'No valid suppliers found' }, { status: 400 });
    }

    // Get supplier details with contacts
    const supplierDetails = await Promise.all(
      selectedSuppliers.map(async (rfqSupplier) => {
        try {
          const supplier = await pb.collection('suppliers').getOne(rfqSupplier.supplier);
          const contacts = await pb.collection('supplier_contacts').getFullList({
            filter: `supplier = "${rfqSupplier.supplier}"`,
          });
          const primaryContact = contacts.find((c: any) => c.is_primary) || contacts[0];
          
          return {
            rfqSupplier,
            supplier,
            contact: primaryContact,
            email: primaryContact?.email || null
          };
        } catch (error) {
          console.error(`Failed to get supplier ${rfqSupplier.supplier}:`, error);
          return null;
        }
      })
    );

    const validSuppliers = supplierDetails.filter(s => s && s.email);
    if (validSuppliers.length === 0) {
      return NextResponse.json({ error: 'No suppliers with valid email addresses found' }, { status: 400 });
    }

    // Create email service
    let emailService;
    try {
      emailService = await createEmailService(userId, pb);
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Failed to initialize email service' }, { status: 400 });
    }

    // Get company name and logo URL
    let companyName = '贵公司';
    let logoUrlFromDb: string | undefined;
    try {
      const brandingConfig = await pb.collection('app_config').getFirstListItem('key = "document_branding"');
      if (brandingConfig?.value) {
        companyName = brandingConfig.value.primary_office?.name_cn || 
                      brandingConfig.value.company_name_cn || '贵公司';
        logoUrlFromDb = brandingConfig.value.logo_url;
      }
    } catch (e) {
      console.log('[RFQ Send Email] Branding config not found');
    }


    // Send emails to each supplier
    const results: Array<{
      supplierId: string;
      supplierName: string;
      email: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const supplierData of validSuppliers) {
      if (!supplierData) continue;
      
      const { rfqSupplier, supplier, email } = supplierData;
      
      try {
        const supplierName = supplier.name || supplier.name_cn || '';
        
        type EmailAttachment = {
          name: string;
          path: string;
          content?: string;
          type?: string;
          size?: number;
        };
        
        // Start with user-provided attachments
        const emailAttachments: EmailAttachment[] = [...(attachments || [])];
        
        // Generate and attach Excel template
        if (includeTemplate) {
          try {
            const templateBuffer = await generateSupplierTemplate(supplier, items, rfq.remarks);
            const templateFilename = `询价清单_${rfq.code}_${supplier.code}.xlsx`;
            
            emailAttachments.push({
              name: templateFilename,
              path: '',
              content: Buffer.from(templateBuffer).toString('base64'),
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              size: templateBuffer.length,
            });
            
            console.log(`[RFQ Send Email] Generated template for supplier ${supplier.code}: ${templateFilename}`);
          } catch (templateError) {
            console.error(`[RFQ Send Email] Failed to generate template for ${supplier.code}:`, templateError);
          }
        }

        // Prepare RFQ email data (summary only, no product table)
        // Get project description (prefer Chinese version for supplier emails)
        const projectDescription = rfq.expand?.project?.description_cn || rfq.expand?.project?.description;
        
        const rfqEmailData = {
          rfqNumber: rfq.code,
          issueDate: rfq.created,
          responseDeadline: rfq.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          itemCount: items.length,
          projectDescription,
          specialInstructions: rfq.remarks,
          attachments: emailAttachments
        };
        
        const result = await emailService.sendRfqToSupplier(
          email,
          rfqEmailData,
          { companyName, recipientName: supplierName, ...templateOptions },
          { logoUrl: logoUrlFromDb }
        );

        if (result.success) {
          await pb.collection('rfq_suppliers').update(rfqSupplier.id, {
            status: 'sent',
            sent_at: new Date().toISOString(),
          });
        }

        results.push({
          supplierId: supplier.id,
          supplierName: supplier.name,
          email,
          success: result.success,
          error: result.error
        });
      } catch (error: any) {
        results.push({
          supplierId: supplier.id,
          supplierName: supplier.name,
          email,
          success: false,
          error: error.message || 'Unknown error'
        });
      }
    }

    // Update RFQ status
    const successCount = results.filter(r => r.success).length;
    if (successCount > 0 && rfq.status === 'draft') {
      await pb.collection('rfqs').update(rfqId, { status: 'sent' });
    }

    return NextResponse.json({
      success: successCount > 0,
      totalSent: successCount,
      totalFailed: results.length - successCount,
      results
    });

  } catch (error: any) {
    console.error('[RFQ Send Email] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
