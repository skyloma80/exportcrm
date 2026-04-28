const ExcelJS = require('exceljs');

async function testWithTemplate() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');

  // Create template row 11 with merged cells B11:C11
  worksheet.mergeCells('B11:C11');
  worksheet.getCell('B11').value = 'Template';
  
  console.log('模板行11已合并');
  
  // Duplicate row 11 using spliceRows at position 12
  worksheet.spliceRows(12, 0, worksheet.getRow(11).values);
  
  console.log('复制行11到行12');
  
  // Check if merged before merging
  const cellB12 = worksheet.getCell('B12');
  console.log('B12 isMerged:', cellB12.isMerged);
  
  // Try to merge B12:C12
  try {
    worksheet.mergeCells('B12:C12');
    console.log('成功合并 B12:C12');
  } catch (e) {
    console.log('合并失败:', e.message);
  }
  
  // Save file
  await workbook.xlsx.writeFile('test-merge.xlsx');
  console.log('文件已保存');
}

testWithTemplate();
