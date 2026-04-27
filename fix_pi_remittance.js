const ExcelJS = require('exceljs');
const path = require('path');

async function fixTemplate() {
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(__dirname, 'excel-template', 'PI.xlsx');
    
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0];
    
    // 查看当前30-40行
    console.log('Current structure (rows 27-40):');
    for (let r = 27; r <= 40; r++) {
        const row = worksheet.getRow(r);
        const c1 = row.getCell(1).value;
        if (c1) console.log(`  Row ${r}: ${String(c1).substring(0, 60)}`);
    }
    
    // 需要修复的结构：
    // Row 27: Remittance Instructions (标题) - 保留
    // Row 28: {{remittance.items}} (模板行) - 保留
    // Row 29-32: 空行（用于动态插入）- 需要添加
    // Row 33: 空行 
    // Row 34: Signed by
    // Row 35-37: 公司信息
    
    // 在 Row 28 后插入4个空行
    worksheet.spliceRows(29, 0, [], [], [], []);
    
    // 保存
    await workbook.xlsx.writeFile(templatePath);
    console.log('\n✅ Fixed! New structure (rows 27-40):');
    for (let r = 27; r <= 40; r++) {
        const row = worksheet.getRow(r);
        const c1 = row.getCell(1).value;
        if (c1) console.log(`  Row ${r}: ${String(c1).substring(0, 60)}`);
    }
}

fixTemplate().catch(console.error);