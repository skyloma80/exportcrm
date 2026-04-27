const ExcelJS = require('exceljs');
const path = require('path');

async function modifyTemplate() {
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(__dirname, 'excel-template', 'PI.xlsx');
    
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0];
    
    // 读取当前状态
    console.log('Current Rows 28-35:');
    for (let r = 28; r <= 35; r++) {
        const row = worksheet.getRow(r);
        console.log(`  Row ${r}: C1=${row.getCell(1).value}`);
    }
    
    // 先把模板改回 {{remittance.items}} (Row 28)
    const row28 = worksheet.getRow(28);
    for (let c = 1; c <= 5; c++) {
        row28.getCell(c).value = '{{remittance.items}}';
    }
    
    // 删除 Row 29-32 (4行) - 使用 spliceRows
    worksheet.spliceRows(29, 4);
    
    // 保存
    await workbook.xlsx.writeFile(templatePath);
    console.log('\n✅ Template modified!');
    console.log('\nNew structure (Rows 28-32):');
    for (let r = 28; r <= 32; r++) {
        const row = worksheet.getRow(r);
        console.log(`  Row ${r}: C1=${row.getCell(1).value}`);
    }
}

modifyTemplate().catch(console.error);