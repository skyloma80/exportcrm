import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import path from 'path';
import { format } from 'date-fns';
import fs from 'fs';
import type { PurchaseOrderWithExpand } from '@/lib/pocketbase/services/purchase-orders';
import { purchaseOrderItemService } from '@/lib/pocketbase/services/purchase-orders';

export class ExcelPoService {
  private templatePath = path.join(process.cwd(), 'excel-template', 'PO-template.xlsx');

  async generatePoExcel(po: PurchaseOrderWithExpand): Promise<Buffer> {
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

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(this.templatePath);
    const worksheet = workbook.worksheets[0];

    const items = await purchaseOrderItemService.getByPO(po.id);
    const supplier = po.expand?.supplier;

    const templateRow = 11;
    const templateRowCount = 1;

    const row11 = worksheet.getRow(templateRow);
    for (let c = 1; c <= 8; c++) {
      row11.getCell(c).value = '';
    }

    worksheet.getCell('G2').value = po.supplier_code || '';
    worksheet.getCell('G3').value = po.our_po || '';
    worksheet.getCell('G4').value = po.code || '';
    worksheet.getCell('G5').value = format(new Date(po.created), 'MMM dd, yyyy');

    worksheet.getCell('B6').value = supplier?.name || supplier?.name_cn || '';
    worksheet.getCell('B7').value = (supplier as any)?.address || (supplier as any)?.address_cn || '';
    worksheet.getCell('B8').value = (supplier as any)?.tax_id || '';

    const rowsInserted = items.length > templateRowCount ? items.length - templateRowCount : 0;

    if (rowsInserted > 0) {
      worksheet.unMergeCells('B11:C11');
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

        const merges = (worksheet as any)._merges;
        if (merges) {
          delete merges[`B${newRowNumber}`];
          delete merges[`C${newRowNumber}`];
        }
      }

      worksheet.mergeCells('B11:C11');
    }

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
      row.getCell(6).value = item.unit || (product as any)?.unit || 'PCS';
      row.getCell(7).value = item.unit_price;
      row.getCell(8).value = item.amount;
    });

    items.forEach((item, index) => {
      const rowNumber = templateRow + index;
      const row = worksheet.getRow(rowNumber);
      const product = item.expand?.product;
      let lines = 1;
      if (item.product_name || product?.name) lines++;
      if ((product as any)?.hs_code) lines++;
      row.height = lines * 15;
    });

    for (let i = 0; i < items.length; i++) {
      const rowNumber = templateRow + i;
      if (rowNumber === templateRow) continue;
      
      try {
        worksheet.mergeCells(`B${rowNumber}:C${rowNumber}`);
      } catch (e) {
      }
    }

    const totalRowIndex = 15 + rowsInserted;
    const totalCell = worksheet.getRow(totalRowIndex).getCell(8);
    totalCell.value = {
      formula: `SUM(H${templateRow}:H${templateRow + items.length - 1})`,
      result: po.total_amount,
    };

    const termsStartRow = 17 + rowsInserted;
    worksheet.getRow(termsStartRow + 1).getCell(3).value = po.payment_terms || '';
    worksheet.getRow(termsStartRow + 2).getCell(3).value = po.incoterm || '';
    worksheet.getRow(termsStartRow + 3).getCell(3).value = po.country_of_origin || 'China';
    worksheet.getRow(termsStartRow + 4).getCell(3).value = po.country_of_destination || '';
    worksheet.getRow(termsStartRow + 5).getCell(3).value = po.port_of_loading || '';
    worksheet.getRow(termsStartRow + 6).getCell(3).value = po.port_of_destination || '';
    worksheet.getRow(termsStartRow + 7).getCell(3).value = po.mode_of_shipment || '';
    worksheet.getRow(termsStartRow + 8).getCell(3).value = po.estimated_shipping_date
      ? format(new Date(po.estimated_shipping_date), 'yyyy-MM-dd')
      : '';

    const remittanceTemplateRow = 28 + rowsInserted;

    for (let c = 1; c <= 8; c++) {
      worksheet.getRow(remittanceTemplateRow).getCell(c).value = '';
    }

    let bankInfoList: string[] = [];
    const rawBankInfo = po.bank_info as any;
    if (rawBankInfo) {
      if (Array.isArray(rawBankInfo)) {
        bankInfoList = rawBankInfo;
      } else if (typeof rawBankInfo === 'string' && rawBankInfo.trim()) {
        try {
          const parsed = JSON.parse(rawBankInfo);
          if (Array.isArray(parsed)) {
            bankInfoList = parsed;
          }
        } catch (e) {
          console.warn('Failed to parse bank_info:', e);
        }
      }
    }
    
    if (bankInfoList.length) {
      console.log('bankInfoList:', bankInfoList);
      const rowsToInsert = bankInfoList.length - 1;
      if (rowsToInsert > 0) {
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
          }
        }
      }

      bankInfoList.forEach((line: string, index: number) => {
        const row = worksheet.getRow(remittanceTemplateRow + index);
        row.getCell(1).value = `${index + 1}. ${line}`;
      });
    }

    const tempPath = path.join(process.cwd(), 'excel-template', 'PO-temp.xlsx');
    await workbook.xlsx.writeFile(tempPath);

    const newZip = await JSZip.loadAsync(fs.readFileSync(tempPath));

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
      const piSheetMatch = workbookXml.match(/<sheet[^>]*name="PO"[^>]*r:id="(rId\d+)"/);

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

    fs.unlinkSync(tempPath);

    return outputBuffer as unknown as Buffer;
  }
}

export const excelPoService = new ExcelPoService();