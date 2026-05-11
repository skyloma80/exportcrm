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
    const originalProductRows = 1; // 模板中现在只有 1 个产品行 (第 11 行)
    const totalRowStart = 12;      // 模板中 Total 所在的起始行 (12-13 行)

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

    // 2. 产品行处理：根据需要插入新行并复制样式
    const extraRows = items.length > originalProductRows ? items.length - originalProductRows : 0;

    if (extraRows > 0) {
      // 重要：先解除合计行（12-13行）的合并，防止拉伸冲突
      try { worksheet.unMergeCells('A12:C13'); } catch (e) { }
      try { worksheet.unMergeCells('F12:F13'); } catch (e) { }
      try { worksheet.unMergeCells('G12:G13'); } catch (e) { }
      try { worksheet.unMergeCells('H12:H13'); } catch (e) { }

      // 批量插入行
      worksheet.spliceRows(totalRowStart, 0, ...Array(extraRows).fill([]));

      const sourceRow = worksheet.getRow(templateRow);
      for (let i = 0; i < extraRows; i++) {
        const currentRowNum = totalRowStart + i;
        const currentRow = worksheet.getRow(currentRowNum);
        currentRow.height = sourceRow.height;
        // 复制样式
        for (let c = 1; c <= 8; c++) {
          const sourceCell = sourceRow.getCell(c);
          const targetCell = currentRow.getCell(c);
          targetCell.style = sourceCell.style;
        }
      }
    }

    // 3. 填充产品数据
    const sourceRowStyle = worksheet.getRow(templateRow);
    items.forEach((item, index) => {
      const rowNumber = templateRow + index;
      const row = worksheet.getRow(rowNumber);

      if (rowNumber !== templateRow) {
        for (let c = 1; c <= 8; c++) {
          row.getCell(c).style = sourceRowStyle.getCell(c).style;
        }
      }

      const partNumber = item.part_number || (item as any).product_code || '';
      const description = item.description_en || '';

      row.getCell(1).value = index + 1;
      row.getCell(2).value = partNumber;
      row.getCell(4).value = description;
      row.getCell(5).value = item.quantity;
      row.getCell(6).value = item.unit || 'PCS';
      row.getCell(7).value = item.unit_price;
      row.getCell(8).value = item.amount;

      let lines = 1;
      if (description) lines = Math.ceil(description.length / 40) + 1;
      row.height = Math.max(20, lines * 15);

      const descCell = row.getCell(4);
      if (descCell.alignment) {
        descCell.alignment = { ...descCell.alignment, wrapText: true };
      }
    });

    const totalRowIndex = totalRowStart + extraRows;
    const totalCell = worksheet.getRow(totalRowIndex).getCell(8);
    totalCell.value = {
      formula: `SUM(H${templateRow}:H${templateRow + items.length - 1})`,
      result: order.total_amount,
    };

    // --- 强力合并管理：环境无关方案 ---
    // 1. 收集所有原始合并信息
    const originalMerges = worksheet.model.merges ? [...worksheet.model.merges] : [];

    // 2. 彻底清除插入点及其下方的所有合并，防止冲突
    if (worksheet.model.merges) {
      const mergesToClear = originalMerges.filter(m => {
        const match = m.match(/(\d+)/);
        return match && parseInt(match[1]) >= templateRow;
      });
      mergesToClear.forEach(m => {
        try { worksheet.unMergeCells(m); } catch (e) { }
      });
    }

    // 3. 为每一款产品行重建 B:C 合并
    for (let i = 0; i < items.length; i++) {
      const rowNum = templateRow + i;
      try { worksheet.mergeCells(`B${rowNum}:C${rowNum}`); } catch (e) { }
    }

    // 4. 计算并应用底部所有合并的偏移
    // 逻辑：原行号 >= totalRowStart 的，全部增加 extraRows
    originalMerges.forEach(m => {
      const match = m.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
      if (match) {
        const [, colStart, rowStartStr, colEnd, rowEndStr] = match;
        let rowStart = parseInt(rowStartStr);
        let rowEnd = parseInt(rowEndStr);

        // 如果该合并在插入点或其下方，则进行偏移
        if (rowStart >= totalRowStart) {
          try {
            worksheet.mergeCells(`${colStart}${rowStart + extraRows}:${colEnd}${rowEnd + extraRows}`);
          } catch (e) { }
        }
      }
    });

    // 5. 贸易条款数据填充
    const termsStartRow = 14 + extraRows;
    worksheet.getRow(termsStartRow + 1).getCell(3).value = order.payment_terms || '';
    worksheet.getRow(termsStartRow + 2).getCell(3).value = order.incoterm || '';
    const originCountryInfo = getCountryInfo(order.country_of_origin || 'China');
    const destCountryInfo = getCountryInfo(order.country_of_destination || '');
    worksheet.getRow(termsStartRow + 3).getCell(3).value = originCountryInfo?.label || order.country_of_origin || 'China';
    worksheet.getRow(termsStartRow + 4).getCell(3).value = destCountryInfo?.label || order.country_of_destination || '';
    worksheet.getRow(termsStartRow + 5).getCell(3).value = order.port_of_loading || '';
    worksheet.getRow(termsStartRow + 6).getCell(3).value = order.port_of_destination || '';
    worksheet.getRow(termsStartRow + 7).getCell(3).value = order.mode_of_shipment || '';
    worksheet.getRow(termsStartRow + 8).getCell(3).value = order.estimated_shipping_date
      ? format(new Date(order.estimated_shipping_date), 'yyyy-MM-dd')
      : '';

    // 6. 汇款信息填充
    const remittanceTemplateRow = 25 + extraRows;
    const bankInfo = order.bank_info || '';
    const bankLines = typeof bankInfo === 'string' ? bankInfo.split('\n').filter(l => l.trim()) : [];

    if (bankLines.length > 0) {
      const formattedBankInfo = bankLines.map((line, idx) => `    ${idx + 1}. ${line}`).join('\n');
      const row = worksheet.getRow(remittanceTemplateRow);
      const cell = row.getCell(1);
      cell.value = formattedBankInfo;
      if (!cell.alignment) cell.alignment = { horizontal: 'left', vertical: 'top' };
      cell.alignment.wrapText = true;
      cell.alignment.vertical = 'top';
      cell.alignment.horizontal = 'left';
      row.height = Math.max(25, bankLines.length * 15);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const newZip = await JSZip.loadAsync(buffer);
    for (const [fileName, data] of Object.entries(originalMedia)) newZip.file(fileName, data);
    for (const [fileName, data] of Object.entries(originalDrawings)) newZip.file(fileName, data);
    for (const [fileName, data] of Object.entries(originalDrawingRels)) newZip.file(fileName, data);

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

    return await newZip.generateAsync({ type: 'nodebuffer' }) as Buffer;
  }
}

export const excelPiService = new ExcelPiService();