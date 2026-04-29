import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import path from 'path';
import { format } from 'date-fns';
import fs from 'fs';
import { purchaseOrderService, purchaseOrderItemService } from '@/lib/pocketbase/services/purchase-orders';
import { createServerPocketBase } from '@/lib/pocketbase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const pb = await createServerPocketBase();
    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: poId } = await params;
    const po = await purchaseOrderService.getWithDetails(poId);
    if (!po) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    const items = await purchaseOrderItemService.getByPO(poId);

    const templatePath = path.join(process.cwd(), 'excel-template', '采购订单.xlsx');
    
    // Check if template exists
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: "Excel template not found" }, { status: 500 });
    }

    // Load original template media for reconstruction
    const originalZip = await JSZip.loadAsync(fs.readFileSync(templatePath));
    const originalMedia: { [key: string]: Buffer } = {};
    for (const fileName of Object.keys(originalZip.files)) {
      const file = originalZip.file(fileName);
      if (file && fileName.startsWith('xl/media/')) {
        originalMedia[fileName] = await file.async('nodebuffer');
      }
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0];

    const supplier = po.expand?.supplier;

    // Basic info
    worksheet.getCell('G2').value = po.supplier_code || '';
    worksheet.getCell('G3').value = po.our_po || '';
    worksheet.getCell('G4').value = po.code || '';
    worksheet.getCell('G5').value = format(new Date(po.created), 'MMM dd, yyyy');

    // Supplier info
    worksheet.getCell('B6').value = supplier?.name || '';
    worksheet.getCell('B7').value = (supplier as any)?.address || '';
    worksheet.getCell('B8').value = (supplier as any)?.tax_id || '';

    const templateRow = 11;
    const templateRowCount = 1;

    // Clear template row placeholder
    const row11 = worksheet.getRow(templateRow);
    for (let c = 1; c <= 8; c++) {
      row11.getCell(c).value = '';
    }

    const rowsInserted = items.length > templateRowCount ? items.length - templateRowCount : 0;

    if (rowsInserted > 0) {
      try { worksheet.unMergeCells(`B${templateRow}:C${templateRow}`); } catch(e){}
      worksheet.spliceRows(templateRow + templateRowCount, 0, ...Array(rowsInserted).fill([]));

      const sourceRow = worksheet.getRow(templateRow);
      for (let i = 0; i < rowsInserted; i++) {
        const newRowNumber = templateRow + templateRowCount + i;
        const newRow = worksheet.getRow(newRowNumber);
        newRow.height = sourceRow.height;
        sourceRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const targetCell = newRow.getCell(colNumber);
          targetCell.style = { ...cell.style };
        });
        // 清除新行的合并记录，避免与后续 mergeCells 冲突
        const merges = (worksheet as any)._merges;
        if (merges) {
          delete merges[`B${newRowNumber}`];
          delete merges[`C${newRowNumber}`];
        }
      }
      // 重新设置模板行的合并
      worksheet.mergeCells(`B${templateRow}:C${templateRow}`);
    }

    // Fill items
    items.forEach((item, index) => {
      const rowNumber = templateRow + index;
      const row = worksheet.getRow(rowNumber);
      const product = (item as any).expand?.product;

      let description = item.product_name || product?.name || '';
      
      row.getCell(1).value = index + 1;
      row.getCell(2).value = item.product_code || product?.part_number || product?.code || '';
      row.getCell(4).value = description;
      row.getCell(5).value = item.quantity;
      row.getCell(6).value = item.unit || product?.unit || 'PCS';
      row.getCell(7).value = item.unit_price;
      row.getCell(8).value = item.amount;

      // 跳过模板行（已在前面处理）
      if (rowNumber === templateRow) return;
      
      try {
        worksheet.mergeCells(`B${rowNumber}:C${rowNumber}`);
      } catch (e) {}
    });

    const tempPath = path.join(process.cwd(), 'excel-template', 'PO-temp.xlsx');
    await workbook.xlsx.writeFile(tempPath);
    
    // 用 JSZip 恢复原始媒体资源（logo图片等）
    const newZip = await JSZip.loadAsync(fs.readFileSync(tempPath));
    for (const [fileName, content] of Object.entries(originalMedia)) {
      newZip.file(fileName, content);
    }
    const finalBuffer = await newZip.generateAsync({ type: 'nodebuffer' });

    fs.unlinkSync(tempPath);

    return new NextResponse(new Uint8Array(finalBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="PO_${po.code}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Export PO error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
