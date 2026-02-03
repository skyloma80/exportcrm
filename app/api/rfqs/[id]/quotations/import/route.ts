/**
 * RFQ Quotation Import API
 * 供应商报价导入 API
 * 
 * POST /api/rfqs/[id]/quotations/import
 * Import supplier quotations from Excel file
 * 
 * Supports both Chinese and English headers for backward compatibility.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import * as XLSX from 'xlsx';

// Header mapping for both Chinese and English headers
const HEADER_MAPPING: Record<string, string> = {
  // Chinese headers
  '供应商编码': 'supplier_code',
  '供应商名称': 'supplier_name',
  '产品编码': 'product_code',
  '产品名称': 'product_name',
  '数量': 'quantity',
  '目标价格': 'target_price',
  '单价': 'unit_price',
  '最小起订量': 'moq',
  '交期（天）': 'lead_time_days',
  '有效期至': 'valid_until',
  '备注': 'remarks',
  '模具类型': 'mold_type',
  '模具费用': 'mold_cost',
  '模具交期（天）': 'mold_lead_time_days',
  '模具寿命': 'mold_lifespan',
  // English headers (backward compatibility)
  'Supplier Code': 'supplier_code',
  'Supplier Name': 'supplier_name',
  'Product Code': 'product_code',
  'Product Name': 'product_name',
  'Quantity': 'quantity',
  'Target Price': 'target_price',
  'Unit Price': 'unit_price',
  'MOQ': 'moq',
  'Lead Time (days)': 'lead_time_days',
  'Valid Until': 'valid_until',
  'Remarks': 'remarks',
  'Mold Type': 'mold_type',
  'Mold Cost': 'mold_cost',
  'Mold Lead Time (days)': 'mold_lead_time_days',
  'Mold Lifespan': 'mold_lifespan',
};

interface NormalizedRow {
  supplier_code?: string;
  supplier_name?: string;
  product_code?: string;
  product_name?: string;
  quantity?: number;
  target_price?: number;
  unit_price?: number;
  moq?: number;
  lead_time_days?: number;
  valid_until?: string;
  remarks?: string;
  mold_type?: string;
  mold_cost?: number;
  mold_lead_time_days?: number;
  mold_lifespan?: number;
}

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  quotationsCreated: number;
  moldQuotationsCreated: number;
  errors: Array<{ row: number; error: string }>;
}

// Normalize row data by mapping headers to standard field names
function normalizeRow(row: Record<string, any>): NormalizedRow {
  const normalized: NormalizedRow = {};
  
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = HEADER_MAPPING[key];
    if (normalizedKey) {
      (normalized as any)[normalizedKey] = value;
    }
  }
  
  return normalized;
}

export async function POST(
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

    // Verify RFQ exists
    let rfq;
    try {
      rfq = await pb.collection('rfqs').getOne(rfqId);
    } catch {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const updateExisting = formData.get('update_existing') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

    if (rawRows.length === 0) {
      return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 });
    }

    // Normalize rows to handle both Chinese and English headers
    const rows = rawRows.map(normalizeRow);

    // Get RFQ items and suppliers for validation
    const rfqItems = await pb.collection('rfq_items').getFullList({
      filter: `rfq = "${rfqId}"`,
      expand: 'product',
    });

    const rfqSuppliers = await pb.collection('rfq_suppliers').getFullList({
      filter: `rfq = "${rfqId}"`,
      expand: 'supplier',
    });

    // Build lookup maps
    const itemsByProductCode = new Map<string, any>();
    const itemsByProductName = new Map<string, any>();
    for (const item of rfqItems) {
      const product = item.expand?.product;
      if (product) {
        itemsByProductCode.set(product.code, item);
        itemsByProductName.set(product.name.toLowerCase(), item);
        if (product.name_cn) {
          itemsByProductName.set(product.name_cn.toLowerCase(), item);
        }
      }
    }

    const suppliersByCode = new Map<string, any>();
    const suppliersByName = new Map<string, any>();
    for (const rs of rfqSuppliers) {
      const supplier = rs.expand?.supplier;
      if (supplier) {
        suppliersByCode.set(supplier.code, supplier);
        suppliersByName.set(supplier.name.toLowerCase(), supplier);
        if (supplier.name_cn) {
          suppliersByName.set(supplier.name_cn.toLowerCase(), supplier);
        }
      }
    }

    // Process rows
    const result: ImportResult = {
      total: rows.length,
      success: 0,
      failed: 0,
      quotationsCreated: 0,
      moldQuotationsCreated: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel row number (1-indexed + header)

      try {
        // Find supplier
        let supplier = null;
        if (row.supplier_code) {
          supplier = suppliersByCode.get(row.supplier_code);
        }
        if (!supplier && row.supplier_name) {
          supplier = suppliersByName.get(row.supplier_name.toLowerCase());
        }

        if (!supplier) {
          throw new Error(`Supplier not found: ${row.supplier_code || row.supplier_name || 'N/A'}`);
        }

        // Check if this is a mold quotation row
        if (row.mold_type && row.mold_cost) {
          // Process mold quotation
          const moldData = {
            rfq: rfqId,
            supplier: supplier.id,
            mold_type: row.mold_type,
            cost: Number(row.mold_cost),
            lead_time_days: row.mold_lead_time_days ? Number(row.mold_lead_time_days) : undefined,
            lifespan: row.mold_lifespan ? Number(row.mold_lifespan) : undefined,
          };

          // Check for existing mold quotation
          if (updateExisting) {
            const existing = await pb.collection('rfq_mold_quotations').getFullList({
              filter: `rfq = "${rfqId}" && supplier = "${supplier.id}" && mold_type = "${moldData.mold_type}"`,
            });

            if (existing.length > 0) {
              await pb.collection('rfq_mold_quotations').update(existing[0].id, moldData);
            } else {
              await pb.collection('rfq_mold_quotations').create(moldData);
            }
          } else {
            await pb.collection('rfq_mold_quotations').create(moldData);
          }

          result.moldQuotationsCreated++;
          result.success++;
          continue;
        }

        // Process product quotation
        // Find RFQ item
        let rfqItem = null;
        if (row.product_code) {
          rfqItem = itemsByProductCode.get(row.product_code);
        }
        if (!rfqItem && row.product_name) {
          rfqItem = itemsByProductName.get(row.product_name.toLowerCase());
        }

        if (!rfqItem) {
          throw new Error(`Product not found in RFQ: ${row.product_code || row.product_name || 'N/A'}`);
        }

        if (!row.unit_price || isNaN(Number(row.unit_price))) {
          throw new Error('Unit Price is required and must be a number');
        }

        const quotationData = {
          rfq: rfqId,
          rfq_item: rfqItem.id,
          supplier: supplier.id,
          unit_price: Number(row.unit_price),
          moq: row.moq ? Number(row.moq) : undefined,
          lead_time_days: row.lead_time_days ? Number(row.lead_time_days) : undefined,
          valid_until: row.valid_until || undefined,
          remarks: row.remarks || undefined,
        };

        // Check for existing quotation
        if (updateExisting) {
          const existing = await pb.collection('rfq_quotations').getFullList({
            filter: `rfq = "${rfqId}" && rfq_item = "${rfqItem.id}" && supplier = "${supplier.id}"`,
          });

          if (existing.length > 0) {
            await pb.collection('rfq_quotations').update(existing[0].id, quotationData);
          } else {
            await pb.collection('rfq_quotations').create(quotationData);
          }
        } else {
          await pb.collection('rfq_quotations').create(quotationData);
        }

        result.quotationsCreated++;
        result.success++;
      } catch (err: any) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          error: err.message || 'Unknown error',
        });
      }
    }

    // Update RFQ supplier status to 'received' if quotations were imported
    if (result.quotationsCreated > 0 || result.moldQuotationsCreated > 0) {
      // Get unique suppliers from imported quotations
      const importedSupplierIds = new Set<string>();
      for (const row of rows) {
        let supplier = null;
        if (row.supplier_code) {
          supplier = suppliersByCode.get(row.supplier_code);
        }
        if (!supplier && row.supplier_name) {
          supplier = suppliersByName.get(row.supplier_name?.toLowerCase() || '');
        }
        if (supplier) {
          importedSupplierIds.add(supplier.id);
        }
      }

      // Update rfq_suppliers status
      for (const rs of rfqSuppliers) {
        if (importedSupplierIds.has(rs.expand?.supplier?.id)) {
          if (rs.status === 'pending' || rs.status === 'sent') {
            await pb.collection('rfq_suppliers').update(rs.id, {
              status: 'received',
              received_at: new Date().toISOString(),
            });
          }
        }
      }

      // Update RFQ status if still in draft or sent
      if (rfq.status === 'draft' || rfq.status === 'sent') {
        await pb.collection('rfqs').update(rfqId, { status: 'received' });
      }
    }

    return NextResponse.json({ results: result });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error.message || 'Import failed' },
      { status: 500 }
    );
  }
}
