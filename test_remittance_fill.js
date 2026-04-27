const ExcelJS = require('exceljs');
const path = require('path');

async function testRemittance() {
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(__dirname, 'excel-template', 'PI.xlsx');
    
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0];
    
    // 模拟代码中的逻辑
    const templateRow = 11;
    const templateRowCount = 1;
    const items = [1,2,3]; // 模拟3个items
    const rowsInserted = items.length > templateRowCount ? items.length - templateRowCount : 0;
    
    console.log('rowsInserted:', rowsInserted);
    
    // remittanceTemplateRow = 28 + rowsInserted
    const remittanceTemplateRow = 28 + rowsInserted;
    console.log('remittanceTemplateRow:', remittanceTemplateRow);
    
    // 查看当前行27-35的结构
    console.log('\n--- Current rows 27-35 ---');
    for (let r = 27; r <= 35; r++) {
        const row = worksheet.getRow(r);
        const c1 = row.getCell(1).value;
        const c2 = row.getCell(2).value;
        if (c1 || c2) {
            console.log(`Row ${r}: C1=${String(c1||'').substring(0,40)} | C2=${String(c2||'').substring(0,40)}`);
        }
    }
    
    // 测试：填充remittance数据到B列
    const remittanceLines = [
        '1. BENEFICIARY NAME:CHONGQING ALUSTARS INTERNATIONAL CO.,LTD.',
        '2. BANK NAME:xxx BANK',
        '3. ACCOUNT NO:123456789',
        '4. SWIFT CODE:ABCDEF'
    ];
    
    // 清空模板行
    for (let c = 1; c <= 5; c++) {
        worksheet.getRow(remittanceTemplateRow).getCell(c).value = '';
    }
    
    // 填充remittance数据到B列
    remittanceLines.forEach((line, index) => {
        const row = worksheet.getRow(remittanceTemplateRow + index);
        row.getCell(2).value = line;
    });
    
    // 检查结果
    console.log('\n--- After fill (rows 28-35) ---');
    for (let r = 28; r <= 35; r++) {
        const row = worksheet.getRow(r);
        const c2 = row.getCell(2).value;
        console.log(`Row ${r}: C2=${String(c2||'').substring(0,60)}`);
    }
    
    // 保存测试文件
    await workbook.xlsx.writeFile(path.join(__dirname, 'test_output.xlsx'));
    console.log('\n✅ Saved to test_output.xlsx');
}

testRemittance();