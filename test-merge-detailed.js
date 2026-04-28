const ExcelJS = require('exceljs');

async function test() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('excel-template/PI-template.xlsx');
  const ws = wb.worksheets[0];
  
  // 检查行 11 的合并状态
  const row11 = ws.getRow(11);
  console.log('行 11 值:', row11.values);
  
  // 使用getCell检查B11和C11
  const b11 = ws.getCell('B11');
  const c11 = ws.getCell('C11');
  console.log('B11 mergedCell:', b11.mergedCell);
  console.log('C11 mergedCell:', c11.mergedCell);
  
  // 复制行
  const newRowValues = row11.values;
  console.log('复制的值:', newRowValues);
  
  ws.spliceRows(12, 0, newRowValues);
  
  // 检查行 12
  const row12 = ws.getRow(12);
  console.log('行 12 值:', row12.values);
  
  const b12 = ws.getCell('B12');
  const c12 = ws.getCell('C12');
  console.log('B12 mergedCell:', b12.mergedCell);
  console.log('C12 mergedCell:', c12.mergedCell);
  
  console.log('合并区域:', ws.mergedCells);
}

test();
