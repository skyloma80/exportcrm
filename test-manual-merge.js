const ExcelJS = require('exceljs');

async function test() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  
  // 手动合并 B11:C11
  ws.mergeCells('B11:C11');
  ws.getCell('B11').value = 'Template';
  
  console.log('合并后 mergedCells:', ws.mergedCells);
  
  // 复制行
  const row11Values = ws.getRow(11).values;
  console.log('行11值:', row11Values);
  
  ws.spliceRows(12, 0, row11Values);
  
  console.log('复制后 mergedCells:', ws.mergedCells);
  
  const b12 = ws.getCell('B12');
  const c12 = ws.getCell('C12');
  console.log('B12 mergedCell属性:', b12.mergedCell);
  console.log('C12 mergedCell属性:', c12.mergedCell);
  
  // 检查单元格范围
  console.log('B12.isMerged:', b12.isMerged);
  console.log('C12.isMerged:', c12.isMerged);
  
  try {
    ws.mergeCells('B12:C12');
    console.log('成功合并 B12:C12');
  } catch (e) {
    console.log('合并失败:', e.message);
  }
  
  await wb.xlsx.writeFile('manual-merge.xlsx');
}

test();
