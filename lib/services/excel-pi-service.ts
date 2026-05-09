import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import path from 'path';
import { format } from 'date-fns';
import fs from 'fs';
import type { FlatSO } from '@/lib/pocketbase/services/so';
import { getCountryInfo } from '@/lib/utils/country-utils';

export class ExcelPiService {
  private templatePath = path.join(process.cwd(), 'excel-template', 'PI-template.xlsx');

  async generatePiExcel(order: FlatSO): Promise<Buffer> {
    // 1. 预先保存模板中的图片和图形关系文件
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

    const items = Array.isArray(order.items) ? order.items : [];
    const templateRow = 11;
    const templateRowCount = 1;
    // 清空模板行占位符
    const row11 = worksheet.getRow(templateRow);
    for (let c = 1; c <= 8; c++) {
      row11.getCell(c).value = '';
    }

    // 填充头部信息
    worksheet.getCell('G2').value = order.vendor_code || '';
    worksheet.getCell('G3').value = order.customer_po || '';
    worksheet.getCell('G4').value = order.code || '';
    worksheet.getCell('G5').value = order.created
      ? format(new Date(order.created), 'MMM dd, yyyy')
      : format(new Date(), 'MMM dd, yyyy');

    worksheet.getCell('B6').value = order.customer_name || '';
    worksheet.getCell('B7').value = order.customer_address || '';
    worksheet.getCell('B8').value = order.customer_tax_id || '';

    // 2. 产品行处理：处理多行合并
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

    // 3. 填充产品数据
    items.forEach((item, index) => {
      const rowNumber = templateRow + index;
      const row = worksheet.getRow(rowNumber);

      const partNumber = item.part_number || (item as any).product_code || '';
      const description = item.description_en   || '';

      row.getCell(1).value = index + 1;
      row.getCell(2).value = partNumber;
      row.getCell(4).value = item.description_en;
      row.getCell(5).value = item.quantity;
      row.getCell(6).value = item.unit || 'PCS';
      row.getCell(7).value = item.unit_price;
      row.getCell(8).value = item.amount;

      // 行高调整
      let lines = 1;
      if (description) lines = Math.ceil(description.length / 40) + 1;
      row.height = Math.max(20, lines * 15);
    });

    for (let i = 0; i < items.length; i++) {
      const rowNumber = templateRow + i;
      if (rowNumber === templateRow) continue;

      try {
        worksheet.mergeCells(`B${rowNumber}:C${rowNumber}`);
      } catch (e) {
        // 已经合并则跳过
      }
    }

    const totalRowIndex = 15 + rowsInserted;
    const totalCell = worksheet.getRow(totalRowIndex).getCell(8);
    totalCell.value = {
      formula: `SUM(H${templateRow}:H${templateRow + items.length - 1})`,
      result: order.total_amount,
    };

    // 5. 贸易条款
    const termsStartRow = 17 + rowsInserted;
    worksheet.getRow(termsStartRow + 1).getCell(3).value = order.payment_terms || '';
    worksheet.getRow(termsStartRow + 2).getCell(3).value = order.incoterm || '';
    const originCountryInfo = getCountryInfo(order.country_of_origin || 'CN');
    const destCountryInfo = getCountryInfo(order.country_of_destination || '');
    worksheet.getRow(termsStartRow + 3).getCell(3).value = originCountryInfo?.label || order.country_of_origin || 'China';
    worksheet.getRow(termsStartRow + 4).getCell(3).value = destCountryInfo?.label || order.country_of_destination || '';
    worksheet.getRow(termsStartRow + 5).getCell(3).value = order.port_of_loading || '';
    worksheet.getRow(termsStartRow + 6).getCell(3).value = order.port_of_destination || '';
    worksheet.getRow(termsStartRow + 7).getCell(3).value = order.mode_of_shipment || '';
    worksheet.getRow(termsStartRow + 8).getCell(3).value = order.estimated_shipping_date
      ? format(new Date(order.estimated_shipping_date), 'yyyy-MM-dd')
      : '';

    // 6. 汇款信息 (Remittance)：保持单行样式，内容带序号和换行
    const remittanceTemplateRow = 28 + rowsInserted;

    // 获取模板样式：即使行移动了，我们也需要确保样式被正确应用
    // 我们可以从偏移后的行重新获取样式，或者在操作前备份
    const bankInfo = order.bank_info || '';
    const bankLines = typeof bankInfo === 'string' ? bankInfo.split('\n').filter(l => l.trim()) : [];

    if (bankLines.length > 0) {
      // 将所有行合并成带序号的单行文本，使用换行符，并在行首添加4个空格
      const formattedBankInfo = bankLines.map((line, idx) => `    ${idx + 1}. ${line}`).join('\n');
      const row = worksheet.getRow(remittanceTemplateRow);
      const cell = row.getCell(1);

      // 直接写入值，ExcelJS 会保留该位置原有的 style (字体、边框、背景)
      cell.value = formattedBankInfo;

      // 增量修改对齐属性，不覆盖整个 style 对象
      if (!cell.alignment) {
        cell.alignment = { horizontal: 'left', vertical: 'top' };
      }
      cell.alignment.wrapText = true;
      cell.alignment.vertical = 'top';
      cell.alignment.horizontal = 'left';

      // 调整行高
      row.height = Math.max(25, bankLines.length * 15);
    }

    // 7. 生成并导出
    const tempPath = path.join(process.cwd(), 'excel-template', `PI-temp-${Date.now()}.xlsx`);
    await workbook.xlsx.writeFile(tempPath);

    const newZip = await JSZip.loadAsync(fs.readFileSync(tempPath));
    for (const [fileName, data] of Object.entries(originalMedia)) newZip.file(fileName, data);
    for (const [fileName, data] of Object.entries(originalDrawings)) newZip.file(fileName, data);
    for (const [fileName, data] of Object.entries(originalDrawingRels)) newZip.file(fileName, data);

    // 关系修复逻辑
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
            const originalSheetRels = originalWorksheetRels[`xl/worksheets/_rels/sheet1.xml.rels`];
            if (originalSheetRels) {
              const sheetNum = sheetFileName.match(/\d+/)?.[0];
              newZip.file(`xl/worksheets/_rels/sheet${sheetNum}.xml.rels`, originalSheetRels);
            }
            const sheetFile = newZip.file(`xl/worksheets/${sheetFileName}`);
            if (sheetFile) {
              let sheetXml = await sheetFile.async('string');
              if (!sheetXml.includes('<drawing')) sheetXml = sheetXml.replace('</worksheet>', '<drawing r:id="rId3"/></worksheet>');
              else sheetXml = sheetXml.replace(/<drawing[^>]*r:id="rId\d+"[^>]*\/>/, '<drawing r:id="rId3"/>');
              newZip.file(`xl/worksheets/${sheetFileName}`, sheetXml);
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

export const excelPiService = new ExcelPiService();