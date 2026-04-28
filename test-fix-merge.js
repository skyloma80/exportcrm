const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function generatePiExcel() {
  const templatePath = path.join(process.cwd(), 'excel-template', 'PI-template.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const worksheet = workbook.worksheets[0];

  // ====== 模拟数据 ======
  const templateRow = 11;
  const templateRowCount = 1;
  const items = [
    { product_name: 'Item 1', quantity: 10, unit_price: 100 },
    { product_name: 'Item 2', quantity: 20, unit_price: 200 },
    { product_name: 'Item 3', quantity: 30, unit_price: 300 }
  ];

  const rowsInserted = items.length > templateRowCount ? items.length - templateRowCount : 0;

  if (rowsInserted > 0) {
    // 先清除模板行的 B:C 合并
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

      // 清除新行的合并记录
      const merges = worksheet._merges;
      if (merges) {
        delete merges[`B${newRowNumber}`];
        delete merges[`C${newRowNumber}`];
      }
    }

    // 重新设置模板行的 B:C 合并
    worksheet.mergeCells('B11:C11');
  }

  // 填充Items数据
  items.forEach((item, index) => {
    const rowNumber = templateRow + index;
    const row = worksheet.getRow(rowNumber);
    
    row.getCell(2).value = item.product_name;
    row.getCell(5).value = item.quantity;
    row.getCell(7).value = item.unit_price;
    row.getCell(8).value = item.quantity * item.unit_price;
  });

  // 填充数据后设置 B列:C列合并
  for (let i = 0; i < items.length; i++) {
    const rowNumber = templateRow + i;
    // 跳过模板行
    if (rowNumber === templateRow) continue;
    
    try {
      worksheet.mergeCells(`B${rowNumber}:C${rowNumber}`);
      console.log('合并 B' + rowNumber + ':C' + rowNumber + ' 成功');
    } catch (e) {
      console.log('合并 B' + rowNumber + ':C' + rowNumber + ' 失败:', e.message);
    }
  }

  // 保存文件
  const outputPath = path.join(process.cwd(), 'excel-template', 'PI-output-temp.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log('文件已保存到:', outputPath);
}

generatePiExcel();
