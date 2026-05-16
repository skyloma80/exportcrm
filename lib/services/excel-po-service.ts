import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import path from 'path';
import { format } from 'date-fns';
import fs from 'fs';
import type { FlatPO, POItem } from '@/lib/pocketbase/services/po';
import { UNITS } from '@/lib/constants/trade-standards';

/**
 * ExcelPoService - 基于 FlatPO 模型生成采购订单 Excel
 *
 * 模板列结构 (第9行开始为产品行):
 *   A: 序号
 *   B-C: 零件号 (合并单元格)
 *   D: 英文描述
 *   E: 中文描述
 *   F: 数量
 *   G: 单位
 *   H: 单价
 *   I: 金额 (= H * F)
 *
 * 头部单元格:
 *   H2/I2: PO 订单号
 *   I3: 日期
 *   A6 (或 B6): 供应商名称
 */
export class ExcelPoService {
  private templatePath = path.join(process.cwd(), 'excel-template', 'PO-template.xlsx');

  async generatePoExcel(po: FlatPO): Promise<Buffer> {
    // 1. 预先保存模板中的图片和图形关系文件 (ExcelJS 会丢弃这些)
    const originalZip = await JSZip.loadAsync(fs.readFileSync(this.templatePath));
    const originalMedia: Record<string, Buffer> = {};
    const originalDrawings: Record<string, Buffer> = {};
    const originalDrawingRels: Record<string, Buffer> = {};
    const originalWorksheetRels: Record<string, Buffer> = {};

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

    // 2. 用 ExcelJS 读取模板并填充数据
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(this.templatePath);
    const worksheet = workbook.worksheets[0];

    const items: POItem[] = Array.isArray(po.items) ? po.items : [];
    const TEMPLATE_DATA_ROW = 9; // 第一条产品数据行

    // 填充头部信息
    worksheet.getCell('H2').value = po.code || '';
    worksheet.getCell('I2').value = po.code || '';
    worksheet.getCell('I3').value = po.created
      ? format(new Date(po.created), 'yyyy/M/d')
      : format(new Date(), 'yyyy/M/d');

    // 供应商名称 (模板中在 A6，合并到多列)
    worksheet.getCell('A6').value = po.supplier_name || '';

    // 3. 如果产品超过1条，插入额外行
    const extraRows = items.length > 1 ? items.length - 1 : 0;

    if (extraRows > 0) {
      // 先解除模板行 B9:C9 的合并 (如果有)
      try { worksheet.unMergeCells('B9:C9'); } catch (_) {}
      // 在模板行后插入空行，复制样式
      worksheet.spliceRows(TEMPLATE_DATA_ROW + 1, 0, ...Array(extraRows).fill([]));

      const sourceRow = worksheet.getRow(TEMPLATE_DATA_ROW);
      for (let i = 0; i < extraRows; i++) {
        const newRowNum = TEMPLATE_DATA_ROW + 1 + i;
        const newRow = worksheet.getRow(newRowNum);
        newRow.height = sourceRow.height;
        sourceRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const targetCell = newRow.getCell(colNumber);
          targetCell.style = { ...cell.style };
        });
      }
      // 重新合并第9行的 B:C
      worksheet.mergeCells('B9:C9');
    }

    // 4. 逐行填充产品数据
    items.forEach((item, index) => {
      const rowNum = TEMPLATE_DATA_ROW + index;
      const row = worksheet.getRow(rowNum);

      row.getCell(1).value = index + 1;                                  // A: 序号
      row.getCell(2).value = item.part_number || item.product_code || ''; // B: 零件号
      // C 是 B 的合并单元格，不单独写
      row.getCell(4).value = item.description_en || item.product_name || ''; // D: 英文描述
      row.getCell(5).value = item.description_cn || '';                   // E: 中文描述
      row.getCell(6).value = item.quantity ?? 1;                          // F: 数量
      row.getCell(7).value = UNITS[item.unit ?? '']?.name_cn || item.unit || '个'; // G: 单位
      row.getCell(8).value = item.unit_price ?? 0;                        // H: 单价
      row.getCell(9).value = {                                            // I: 金额 (公式)
        formula: `H${rowNum}*F${rowNum}`,
        result: item.amount ?? 0,
      };

      // 行高自适应
      const lineCount = [item.description_en, item.description_cn].filter(Boolean).length;
      row.height = Math.max(20, lineCount * 15);
    });

    // 5. 合并单元格管理 — 参考 PI 实现，偏移底部合并
    const originalMerges = worksheet.model.merges ? [...worksheet.model.merges] : [];

    // 解除所有受插入影响的合并（从产品行往下全部清除）
    if (worksheet.model.merges) {
      const mergesToClear = originalMerges.filter(m => {
        const match = m.match(/(\d+)/);
        return match && parseInt(match[1]) >= TEMPLATE_DATA_ROW;
      });
      mergesToClear.forEach(m => {
        try { worksheet.unMergeCells(m); } catch (e) { }
      });
    }

    // 为所有产品行重建 B:C 合并
    for (let i = 0; i < items.length; i++) {
      const rowNum = TEMPLATE_DATA_ROW + i;
      try { worksheet.mergeCells(`B${rowNum}:C${rowNum}`); } catch (e) { }
    }

    // 偏移还原底部合并（原始行号 >= 13 的合并，即模板中产品区之后的合并）
    const BOTTOM_MERGE_START = 13;
    originalMerges.forEach(m => {
      const match = m.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
      if (match) {
        const [, colStart, rowStartStr, colEnd, rowEndStr] = match;
        const rowStart = parseInt(rowStartStr);
        const rowEnd = parseInt(rowEndStr);
        if (rowStart >= BOTTOM_MERGE_START) {
          try {
            worksheet.mergeCells(`${colStart}${rowStart + extraRows}:${colEnd}${rowEnd + extraRows}`);
          } catch (e) { }
        }
      }
    });

    // 6. 合计行 (在数据区后第4行位置)
    const totalRowIndex = TEMPLATE_DATA_ROW + items.length + 3; // 原模板合计行偏移
    try {
      const totalCell = worksheet.getRow(totalRowIndex).getCell(9);
      totalCell.value = {
        formula: `SUM(I${TEMPLATE_DATA_ROW}:I${TEMPLATE_DATA_ROW + items.length - 1})`,
        result: po.total_amount ?? 0,
      };
    } catch (_) {
      // 若合计行位置不存在，忽略
    }

    // 7. 备注 — 每行文本插入一个 Excel 行，保留模板样式
    const remarks = po.remarks || '';
    const remarkLines = remarks.split('\n'); // 保留空行，维持格式感
    // 备注区首行在模板中为第17行，随产品行数偏移
    const REMARK_TEMPLATE_ROW = 17; // 模板中备注区首行（空行，带样式）
    const remarkStartRow = REMARK_TEMPLATE_ROW + extraRows;
    const TEMPLATE_REMARK_ROWS = 4; // 模板预留的备注行数

    // 先读取模板第一条备注行的样式（用于复制到新行）
    const remarkTemplateRow = worksheet.getRow(remarkStartRow);
    const remarkRowStyleCache: { [col: number]: any } = {};
    remarkTemplateRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      if (colNum <= 9) {
        remarkRowStyleCache[colNum] = JSON.parse(JSON.stringify(cell.style));
      }
    });
    const remarkRowHeight = remarkTemplateRow.height || 24.9;

    // 如果备注行数超过模板预留行数，先插入额外行（插在第1条备注行之后）
    const extraRemarkRows = remarkLines.length > TEMPLATE_REMARK_ROWS
      ? remarkLines.length - TEMPLATE_REMARK_ROWS
      : 0;

    if (extraRemarkRows > 0) {
      // 先解除第一备注行合并，以免 spliceRows 破坏它
      try { worksheet.unMergeCells(`A${remarkStartRow}:I${remarkStartRow}`); } catch (_) {}
      worksheet.spliceRows(remarkStartRow + 1, 0, ...Array(extraRemarkRows).fill([]));
      // 重新合并第一备注行
      worksheet.mergeCells(`A${remarkStartRow}:I${remarkStartRow}`);
      // 为新插入的行复制样式并恢复合并单元格（模板备注行是 A:I 全行合并）
      for (let i = 0; i < extraRemarkRows; i++) {
        const newRowNum = remarkStartRow + 1 + i;
        const newRow = worksheet.getRow(newRowNum);
        newRow.height = remarkRowHeight;
        for (let c = 1; c <= 9; c++) {
          if (remarkRowStyleCache[c]) {
            newRow.getCell(c).style = { ...remarkRowStyleCache[c] };
          }
        }
        // 清除 spliceRows 可能留下的旧合并状态，再重新合并整行
        try { worksheet.unMergeCells(`A${newRowNum}:I${newRowNum}`); } catch (_) {}
        worksheet.mergeCells(`A${newRowNum}:I${newRowNum}`);
      }
    }

    // 逐行填写备注内容（A列，保留原有样式）
    remarkLines.forEach((line, index) => {
      const rowNum = remarkStartRow + index;
      const cell = worksheet.getRow(rowNum).getCell(1);
      // 保留原样式，只写入文本值
      const origStyle = remarkRowStyleCache[1] || {};
      cell.style = { ...origStyle };
      cell.value = line;
    });

    // 若备注行比模板少，清空多余的模板备注行内容（但保留行和样式）
    for (let i = remarkLines.length; i < TEMPLATE_REMARK_ROWS; i++) {
      const rowNum = remarkStartRow + i;
      worksheet.getRow(rowNum).getCell(1).value = '';
    }

    // 确保每条备注行都有 A:I 合并
    const totalRemarkRows = Math.max(remarkLines.length, TEMPLATE_REMARK_ROWS);
    for (let i = 0; i < totalRemarkRows; i++) {
      const rowNum = remarkStartRow + i;
      try { worksheet.unMergeCells(`A${rowNum}:I${rowNum}`); } catch (_) {}
      try { worksheet.mergeCells(`A${rowNum}:I${rowNum}`); } catch (_) {}
    }

    // 8. 写临时文件
    const tempPath = path.join(process.cwd(), 'excel-template', `PO-temp-${Date.now()}.xlsx`);
    await workbook.xlsx.writeFile(tempPath);

    // 9. 用 JSZip 把图片、图形关系还原到输出文件
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

    // 修复 worksheet 与图形文件的关联
    const workbookXmlFile = newZip.file('xl/workbook.xml');
    if (workbookXmlFile) {
      const workbookXml = await workbookXmlFile.async('string');
      const poSheetMatch = workbookXml.match(/<sheet[^>]*name="PO"[^>]*r:id="(rId\d+)"/);

      if (poSheetMatch) {
        const workbookRelsFile = newZip.file('xl/_rels/workbook.xml.rels');
        if (workbookRelsFile) {
          const workbookRels = await workbookRelsFile.async('string');
          const sheetRelMatch = workbookRels.match(
            new RegExp(`Id="${poSheetMatch[1]}"[^>]*Target="worksheets/(sheet\\d+\\.xml)"`)
          );

          if (sheetRelMatch) {
            const sheetFileName = sheetRelMatch[1];
            const sheetNumMatch = sheetFileName.match(/sheet(\d+)\.xml/);
            if (sheetNumMatch) {
              const sheetNum = sheetNumMatch[1];

              // 还原 worksheet rels (包含图形引用)
              const originalSheetRels = originalWorksheetRels[`xl/worksheets/_rels/sheet1.xml.rels`];
              if (originalSheetRels) {
                newZip.file(`xl/worksheets/_rels/sheet${sheetNum}.xml.rels`, originalSheetRels);
              }

              // 确保 worksheet XML 中有 <drawing> 引用
              const sheetFile = newZip.file(`xl/worksheets/${sheetFileName}`);
              if (sheetFile) {
                let sheetXml = await sheetFile.async('string');
                if (!sheetXml.includes('<drawing')) {
                  sheetXml = sheetXml.replace('</worksheet>', '<drawing r:id="rId3"/></worksheet>');
                } else {
                  sheetXml = sheetXml.replace(/<drawing[^>]*r:id="rId\d+"[^>]*\/>/, '<drawing r:id="rId3"/>');
                }
                newZip.file(`xl/worksheets/${sheetFileName}`, sheetXml);
              }
            }
          }
        }
      }
    }

    const outputBuffer = await newZip.generateAsync({ type: 'nodebuffer' });

    // 清理临时文件
    try { fs.unlinkSync(tempPath); } catch (_) {}

    return outputBuffer as unknown as Buffer;
  }
}

export const excelPoService = new ExcelPoService();