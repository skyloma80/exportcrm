import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import path from 'path';
import { format } from 'date-fns';
import * as fs from 'fs';
import type { OrderWithExpand } from '@/lib/pocketbase/services/orders';

/**
 * PI Excel Export Service
 * 形式发票 Excel 导出服务
 *
 * 使用 JSZip 手动处理图片，解决 ExcelJS 图片处理 bug
 */
export class ExcelPiService {
  private templatePath = path.join(process.cwd(), 'excel-template', 'PI-template.xlsx');

  async generatePiExcel(order: OrderWithExpand): Promise<Buffer> {
    // ====== 1. 使用 JSZip 保存原始模板中的媒体文件 ======
    const originalZip = await JSZip.loadAsync(fs.readFileSync(this.templatePath));
    const originalMedia: { [key: string]: Buffer } = {};
    const originalDrawings: { [key: string]: Buffer } = {};
    const originalDrawingRels: { [key: string]: Buffer } = {};
    const originalWorksheetRels: { [key: string]: Buffer } = {};

    for (const fileName of Object.keys(originalZip.files)) {
      const file = originalZip.file(fileName);
      if (!file) continue;
      if (fileName.startsWith('xl/media/')) {
        originalMedia[fileName] = await file.async('nodebuffer');
      }
      if (fileName.match(/xl\/drawings\/drawing\d+\.xml$/)) {
        originalDrawings[fileName] = await file.async('nodebuffer');
      }
      if (fileName.match(/xl\/drawings\/_rels\/drawing\d+\.xml\.rels$/)) {
        originalDrawingRels[fileName] = await file.async('nodebuffer');
      }
      if (fileName.match(/xl\/worksheets\/_rels\/sheet\d+\.xml\.rels$/)) {
        originalWorksheetRels[fileName] = await file.async('nodebuffer');
      }
    }

    // ====== 2. 使用 ExcelJS 处理数据 ======
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(this.templatePath);
    const worksheet = workbook.worksheets[0];

    const items = order.expand?.order_items_via_order || [];
    console.log('bank_info type:', typeof order.bank_info);
    console.log('bank_info value:', order.bank_info);
    const remittanceLines = this.extractRemittanceLines(order.bank_info);
    console.log('Remittance lines:', JSON.stringify(remittanceLines, null, 2));
    const customer = order.expand?.customer;

    // ====== 1. 清空Items模板行 ======
    // Row 11 是Items模板行，清空数据但保留样式
    const templateRow = 11;
    const templateRowCount = 1;

    const row11 = worksheet.getRow(templateRow);
    for (let c = 1; c <= 8; c++) {
      row11.getCell(c).value = '';
    }

    // ====== 2. Header Info (Row 2-5) ======
    worksheet.getCell('G2').value = order.vendor_code || '';
    worksheet.getCell('G3').value = order.customer_po || '';
    worksheet.getCell('G4').value = order.code || '';
    worksheet.getCell('G5').value = format(new Date(order.created), 'MMM dd, yyyy');

    // ====== 3. Customer Info (Row 6-8) ======
    worksheet.getCell('B6').value = customer?.name || '';
    worksheet.getCell('B7').value = (customer as any)?.address || '';
    worksheet.getCell('B8').value = (customer as any)?.tax_id || '';

    // ====== 4. Items Table - 动态插入行并复制模板行格式 ======
    const rowsInserted = items.length > templateRowCount ? items.length - templateRowCount : 0;

    if (rowsInserted > 0) {
      // 先清除模板行的 B:C 合并，避免 spliceRows 自动复制
      worksheet.unMergeCells('B11:C11');

      // 插入新行
      worksheet.spliceRows(templateRow + templateRowCount, 0, ...Array(rowsInserted).fill([]));

      // 复制模板行样式到新行
      const sourceRow = worksheet.getRow(templateRow);
      for (let i = 0; i < rowsInserted; i++) {
        const newRowNumber = templateRow + templateRowCount + i;
        const newRow = worksheet.getRow(newRowNumber);
        newRow.height = sourceRow.height;
        
        // 复制样式
        sourceRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const targetCell = newRow.getCell(colNumber);
          targetCell.style = { ...cell.style };
        });
      }

      // 重新设置模板行的 B:C 合并
      worksheet.mergeCells('B11:C11');
    }

    // 填充Items数据
    items.forEach((item, index) => {
      const rowNumber = templateRow + index;
      const row = worksheet.getRow(rowNumber);
      const product = item.expand?.product;

      let description = item.product_name || product?.name || '';
      if ((product as any)?.hs_code) {
        description += `\nHS code: ${(product as any).hs_code}`;
      }

      row.getCell(1).value = index + 1;
      row.getCell(2).value = item.product_code || (product as any)?.part_number || product?.code || '';
      row.getCell(4).value = description;
      row.getCell(5).value = item.quantity;
      row.getCell(6).value = (product as any)?.unit || 'PCS';
      row.getCell(7).value = item.unit_price;
      row.getCell(8).value = item.amount;
    });

    // 动态调整行高
    items.forEach((item, index) => {
      const rowNumber = templateRow + index;
      const row = worksheet.getRow(rowNumber);
      const product = item.expand?.product;
      let lines = 1;
      if (item.product_name || product?.name) lines++;
      if ((product as any)?.hs_code) lines++;
      row.height = lines * 15;
    });

    // 填充数据后设置 B列:C列合并（必须在填充数据之后）
    for (let i = 0; i < items.length; i++) {
      const rowNumber = templateRow + i;
      try {
        worksheet.mergeCells(`B${rowNumber}:C${rowNumber}`);
      } catch (e) {
        // 已经合并则跳过
      }
    }

    // ====== 5. Total ======
    const totalRowIndex = 15 + rowsInserted;

    const totalCell = worksheet.getRow(totalRowIndex).getCell(8);
    totalCell.value = {
      formula: `SUM(H${templateRow}:H${templateRow + items.length - 1})`,
      result: order.total_amount,
    };

    // ====== 6. Terms and Conditions ======
    const termsStartRow = 17 + rowsInserted;
    worksheet.getRow(termsStartRow + 1).getCell(3).value = order.payment_terms || '';
    worksheet.getRow(termsStartRow + 2).getCell(3).value = order.incoterm || '';
    worksheet.getRow(termsStartRow + 3).getCell(3).value = order.country_of_origin || 'China';
    worksheet.getRow(termsStartRow + 4).getCell(3).value = order.country_of_destination || '';
    worksheet.getRow(termsStartRow + 5).getCell(3).value = order.port_of_loading || '';
    worksheet.getRow(termsStartRow + 6).getCell(3).value = order.port_of_destination || '';
    worksheet.getRow(termsStartRow + 7).getCell(3).value = order.mode_of_shipment || '';
    worksheet.getRow(termsStartRow + 8).getCell(3).value = order.estimated_shipping_date
      ? format(new Date(order.estimated_shipping_date), 'yyyy-MM-dd')
      : '';

    // ====== 7. Remittance Instructions ======
    const remittanceTemplateRow = 28 + rowsInserted;

    for (let c = 1; c <= 8; c++) {
      worksheet.getRow(remittanceTemplateRow).getCell(c).value = '';
    }

    if (remittanceLines.length > 0) {
      if (remittanceLines.length > 1) {
        const rowsToInsert = remittanceLines.length - 1;
        worksheet.spliceRows(remittanceTemplateRow + 1, 0, ...Array(rowsToInsert).fill([]));

        const sourceRow = worksheet.getRow(remittanceTemplateRow);
        for (let i = 0; i < rowsToInsert; i++) {
          const newRowNumber = remittanceTemplateRow + 1 + i;
          const newRow = worksheet.getRow(newRowNumber);
          newRow.height = sourceRow.height;
          sourceRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const targetCell = newRow.getCell(colNumber);
            targetCell.style = { ...cell.style };
          });
          try {
            worksheet.mergeCells(`A${newRowNumber}:H${newRowNumber}`);
          } catch (e) {
            // 可能已经存在
          }
        }
      }

      remittanceLines.forEach((line, index) => {
        const row = worksheet.getRow(remittanceTemplateRow + index);
        const numberedLine = `${index + 1}. ${line}`;
        row.getCell(1).value = numberedLine;
      });
    }

    // ====== 8. 写出临时文件 ======
    const tempOutputPath = path.join(process.cwd(), 'excel-template', 'PI-output-temp.xlsx');
    await workbook.xlsx.writeFile(tempOutputPath);

    // ====== 9. 使用 JSZip 恢复原始媒体文件 ======
    const newZip = await JSZip.loadAsync(fs.readFileSync(tempOutputPath));

    for (const [fileName, data] of Object.entries(originalMedia)) {
      newZip.file(fileName, data);
    }
    for (const [fileName, data] of Object.entries(originalDrawings)) {
      newZip.file(fileName, data);
    }
    for (const [fileName, data] of Object.entries(originalDrawingRels)) {
      newZip.file(fileName, data);
    }

    const workbookXmlFile = newZip.file('xl/workbook.xml');
    if (workbookXmlFile) {
      const workbookXml = await workbookXmlFile.async('string');
      const piSheetMatch = workbookXml.match(/<sheet[^>]*name="PI"[^>]*r:id="(rId\d+)"/);

      if (piSheetMatch) {
        const workbookRelsFile = newZip.file('xl/_rels/workbook.xml.rels');
        if (workbookRelsFile) {
          const workbookRels = await workbookRelsFile.async('string');
          const sheetRelMatch = workbookRels.match(new RegExp(`Id="${piSheetMatch[1]}"[^>]*Target="worksheets/(sheet\\d+\\.xml)"`));

          if (sheetRelMatch) {
            const sheetFileName = sheetRelMatch[1];
            const sheetNumMatch = sheetFileName.match(/sheet(\d+)\.xml/);
            if (sheetNumMatch) {
              const sheetNum = sheetNumMatch[1];

              const originalSheetRels = originalWorksheetRels[`xl/worksheets/_rels/sheet1.xml.rels`];
              if (originalSheetRels) {
                newZip.file(`xl/worksheets/_rels/sheet${sheetNum}.xml.rels`, originalSheetRels);
              }

              const sheetFile = newZip.file(`xl/worksheets/${sheetFileName}`);
              if (sheetFile) {
                const sheetXml = await sheetFile.async('string');
                if (!sheetXml.includes('<drawing')) {
                  const sheetWithDrawing = sheetXml.replace('</worksheet>', '<drawing r:id="rId3"/></worksheet>');
                  newZip.file(`xl/worksheets/${sheetFileName}`, sheetWithDrawing);
                } else {
                  const fixedSheetXml = sheetXml.replace(/<drawing[^>]*r:id="rId\d+"[^>]*\/>/, '<drawing r:id="rId3"/>');
                  newZip.file(`xl/worksheets/${sheetFileName}`, fixedSheetXml);
                }
              }
            }
          }
        }
      }
    }

    const outputBuffer = await newZip.generateAsync({ type: 'nodebuffer' });

    fs.unlinkSync(tempOutputPath);

    return outputBuffer as unknown as Buffer;
  }

  private extractRemittanceLines(bankInfo: any): string[] {
    if (!bankInfo) return [];

    if (typeof bankInfo === 'string') {
      try {
        const parsed = JSON.parse(bankInfo);
        if (Array.isArray(parsed)) {
          return parsed.filter((line: string) => line && line.trim());
        }
      } catch (e) {
        // 不是 JSON，继续按普通字符串处理
      }
      return bankInfo.split('\n').filter((line: string) => line.trim());
    }

    if (Array.isArray(bankInfo)) {
      try {
        const jsonString = bankInfo.join('\n');
        const parsed = JSON.parse(jsonString);
        if (Array.isArray(parsed)) {
          return parsed.filter((line: string) => line && line.trim());
        }
      } catch (e) {
        // 不是 JSON，按普通字符串数组处理
      }
      return bankInfo.filter((line: string) => line && line.trim());
    }

    return [];
  }
}

export const excelPiService = new ExcelPiService();
