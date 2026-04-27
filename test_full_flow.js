const ExcelJS = require('exceljs');
const path = require('path');

async function testFullFlow() {
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(__dirname, 'excel-template', 'PI.xlsx');
    
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0];
    
    // 模拟3个items
    const items = [1,2,3];
    const templateRow = 11;
    const templateRowCount = 1;
    const rowsInserted = items.length > templateRowCount ? items.length - templateRowCount : 0;
    
    console.log('=== Before Items Insert ===');
    console.log('Rows 26-32:');
    for (let r = 26; r <= 32; r++) {
        const c1 = worksheet.getRow(r).getCell(1).value;
        const c2 = worksheet.getRow(r).getCell(2).value;
        if (c1 || c2) console.log(`  Row ${r}: C1=${String(c1||'').substring(0,30)} C2=${String(c2||'').substring(0,30)}`);
    }
    
    // 插入items后的行
    if (rowsInserted > 0) {
        worksheet.spliceRows(templateRow + templateRowCount, 0, ...Array(rowsInserted).fill([]));
    }
    
    console.log('\n=== After Items Insert (rowsInserted=2) ===');
    console.log('Rows 26-35:');
    for (let r = 26; r <= 35; r++) {
        const c1 = worksheet.getRow(r).getCell(1).value;
        const c2 = worksheet.getRow(r).getCell(2).value;
        if (c1 || c2) console.log(`  Row ${r}: C1=${String(c1||'').substring(0,30)} C2=${String(c2||'').substring(0,30)}`);
    }
    
    // 测试remittance逻辑
    const remittanceTemplateRow = 28 + rowsInserted;
    console.log('\n=== remittanceTemplateRow =', remittanceTemplateRow, '===');
    
    // 检查这一行
    const rtRow = worksheet.getRow(remittanceTemplateRow);
    console.log(`Row ${remittanceTemplateRow}: C1=${rtRow.getCell(1).value} C2=${rtRow.getCell(2).value}`);
    
    // 填充remittance数据
    const remittanceLines = [
        '1. BENEFICIARY: Test',
        '2. BANK: Test Bank',
        '3. ACCOUNT: 123456',
        '4. SWIFT: ABCD'
    ];
    
    // 清空模板行
    for (let c = 1; c <= 5; c++) {
        worksheet.getRow(remittanceTemplateRow).getCell(c).value = '';
    }
    
    // 如果有超过1行，需要在模板行后插入新行
    if (remittanceLines.length > 1) {
        const rowsToInsert = remittanceLines.length - 1;
        worksheet.spliceRows(remittanceTemplateRow + 1, 0, ...Array(rowsToInsert).fill([]));
        console.log(`\n=== Inserted ${rowsToInsert} rows for remittance ===`);
    }
    
    // 填充remittance数据到B列
    remittanceLines.forEach((line, index) => {
        const row = worksheet.getRow(remittanceTemplateRow + index);
        row.getCell(2).value = line;
    });
    
    console.log('\n=== After Remittance Fill ===');
    console.log('Rows 26-40:');
    for (let r = 26; r <= 40; r++) {
        const c1 = worksheet.getRow(r).getCell(1).value;
        const c2 = worksheet.getRow(r).getCell(2).value;
        if (c1 || c2) console.log(`  Row ${r}: C1=${String(c1||'').substring(0,30)} C2=${String(c2||'').substring(0,50)}`);
    }
}

testFullFlow().catch(console.error);