const ExcelJS = require('exceljs');
const path = require('path');

async function cleanTemplate() {
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(__dirname, 'excel-template', 'PI.xlsx');
    
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0];
    
    // 清空 Row 11-12 的数据内容，只保留格式
    // Row 11: 第一个产品行模板
    const row11 = worksheet.getRow(11);
    row11.getCell(1).value = '';  // No.
    row11.getCell(2).value = '{{items.partNumber}}';
    row11.getCell(3).value = '{{items.partNumber}}';
    row11.getCell(4).value = '{{items.description}}';
    row11.getCell(5).value = '{{items.quantity}}';
    row11.getCell(6).value = '{{items.unit}}';
    row11.getCell(7).value = '{{items.price}}';
    row11.getCell(8).value = '{{items.amount}}';
    
    // 删除 Row 12 (多余的样本行)
    worksheet.spliceRows(12, 1);
    
    // Row 15-16: TOTAL 行，保持原样
    
    await workbook.xlsx.writeFile(templatePath);
    console.log('✅ Template cleaned!');
    
    // Show result
    console.log('\nItems area:');
    for (let r = 10; r <= 13; r++) {
        const row = worksheet.getRow(r);
        console.log(`Row ${r}: C1=${row.getCell(1).value} | C2=${row.getCell(2).value} | C4=${row.getCell(4).value} | C5=${row.getCell(5).value}`);
    }
}

cleanTemplate().catch(console.error);