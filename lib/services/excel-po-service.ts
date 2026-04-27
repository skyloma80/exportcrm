import ExcelJS from 'exceljs';
import path from 'path';
import { format } from 'date-fns';
import type { PurchaseOrderWithExpand } from '@/lib/pocketbase/services/purchase-orders';
import { purchaseOrderItemService } from '@/lib/pocketbase/services/purchase-orders';

/**
 * PO Excel Export Service
 * 采购订单 Excel 导出服务
 */
export class ExcelPoService {
  /**
   * Generate PO Excel buffer
   */
  async generatePoExcel(po: PurchaseOrderWithExpand): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    // Using absolute path for the template
    const templatePath = path.join(process.cwd(), 'excel-template', 'PO.xlsx');
    
    // Check if template exists, if not we might need to handle it
    // But we'll assume it exists like PI.xlsx
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0];

    // 1. Fill Header Info
    // PO No.: G4 (Assumed same as PI for now)
    worksheet.getCell('G4').value = po.code;
    // Date: G5
    worksheet.getCell('G5').value = format(new Date(po.created), 'MMM dd, yyyy');

    // 2. Fill Supplier Info
    const supplier = po.expand?.supplier;
    // TO: B6 (Assumed supplier name goes here in PO)
    worksheet.getCell('B6').value = supplier?.name || supplier?.name_cn || '';
    // Add.: B7
    worksheet.getCell('B7').value = (supplier as any)?.address || (supplier as any)?.address_cn || '';

    // 3. Fill Items Table
    // Get items from DB
    const items = await purchaseOrderItemService.getByPO(po.id);
    const startRow = 11;
    const templateRows = 2; 

    if (items.length > templateRows) {
      const rowsToInsert = items.length - templateRows;
      worksheet.insertRow(startRow + templateRows, [], 'i');
      for (let i = 0; i < rowsToInsert; i++) {
        const newRow = worksheet.getRow(startRow + templateRows + i);
        const sourceRow = worksheet.getRow(startRow);
        newRow.height = sourceRow.height;
        sourceRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const targetCell = newRow.getCell(colNumber);
          targetCell.style = cell.style;
        });
      }
    }

    // Fill the items
    items.forEach((item: any, index) => {
      const rowNumber = startRow + index;
      const row = worksheet.getRow(rowNumber);
      const product = item.expand?.product;

      // No.: A
      row.getCell(1).value = index + 1;
      // Part Number: B
      row.getCell(2).value = product?.part_number || product?.code || '';
      // Description: D
      row.getCell(4).value = product?.name || '';
      // Quantity: E
      row.getCell(5).value = item.quantity;
      // Unit: F
      row.getCell(6).value = product?.unit || 'PCS';
      // Unit Price: G
      row.getCell(7).value = item.unit_price;
      // Amount: H
      row.getCell(8).value = item.amount;
    });

    // 4. Fill Total
    const totalRowIndex = 15 + (items.length > templateRows ? items.length - templateRows : 0);
    const totalCell = worksheet.getRow(totalRowIndex).getCell(8);
    totalCell.value = {
        formula: `SUM(H${startRow}:H${startRow + items.length - 1})`,
        result: po.total_amount
    };

    const buffer = await workbook.xlsx.writeBuffer() as unknown as Buffer;
    return buffer;
  }
}

export const excelPoService = new ExcelPoService();
