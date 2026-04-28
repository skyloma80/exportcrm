const ExcelJS = require('exceljs');

async function testMerge() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');

  // Create template row 1 with merged cells B1:C1
  worksheet.mergeCells('B1:C1');
  worksheet.getCell('B1').value = 'Template';
  
  console.log('原始合并区域:', worksheet.mergedCells);
  
  // Duplicate row 1 using spliceRows (insert at position 2)
  worksheet.spliceRows(2, 0, worksheet.getRow(1).values);
  
  console.log('复制后合并区域:', worksheet.mergedCells);
  
  // Check B2 cell
  const cellB2 = worksheet.getCell('B2');
  console.log('B2 isMerged:', cellB2.isMerged);
  console.log('B2 mergedCell:', cellB2.mergedCell);
  
  // Try to merge B2:C2
  try {
    worksheet.mergeCells('B2:C2');
    console.log('成功合并 B2:C2');
  } catch (e) {
    console.log('合并失败:', e.message);
  }
  
  // Save file
  await workbook.xlsx.writeFile('test-merge.xlsx');
  console.log('文件已保存');
}

testMerge();
