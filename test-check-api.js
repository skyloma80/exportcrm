const ExcelJS = require('exceljs');

async function test() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  
  // 手动合并 B11:C11
  ws.mergeCells('B11:C11');
  ws.getCell('B11').value = 'Template';
  
  console.log('合并后工作表状态:');
  console.log('- mergedCells:', ws.mergedCells);
  console.log('- mergedCells 类型:', typeof ws.mergedCells);
  console.log('- mergedCells toString:', String(ws.mergedCells));
  
  // 尝试获取 mergedCells 属性
  const worksheet = ws;
  for (const key in worksheet) {
    if (key.includes('merge')) {
      console.log('- 属性', key, ':', worksheet[key]);
    }
  }
}

test();
