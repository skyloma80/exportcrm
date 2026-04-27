const ExcelJS = require('exceljs');
const path = require('path');

async function testFixedCode() {
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(__dirname, 'excel-template', 'PI.xlsx');
    
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0];
    
    // 模拟3个items
    const items = [1,2,3];
    const templateRow = 11;
    const templateRowCount = 1;
    const rowsInserted = items.length > templateRowCount ? items.length - templateRowCount : 0;
    
    // 插入items
    if (rowsInserted > 0) {
        worksheet.spliceRows(templateRow + templateRowCount, 0, ...Array(rowsInserted).fill([]));
    }
    
    // Remittance逻辑
    const remittanceTemplateRow = 28 + rowsInserted;
    
    // 尝试移除模板行的合并单元格
    try {
        worksheet.unMergeCells(`A${remittanceTemplateRow}:E${remittanceTemplateRow}`);
        console.log(`✅ Unmerged A${remittanceTemplateRow}:E${remittanceTemplateRow}`);
    } catch (e) {
        console.log(`⚠️ No merge to unmerge for row ${remittanceTemplateRow}`);
    }
    
    // 清空模板行
    for (let c = 1; c <= 8; c++) {
        worksheet.getRow(remittanceTemplateRow).getCell(c).value = '';
    }
    
    // 填充remittance数据
    const remittanceLines = [
        '1. BENEFICIARY: Test Company',
        '2. BANK: Test Bank',
        '3. ACCOUNT: 1234567890',
        '4. SWIFT: ABCDEF'
    ];
    
    if (remittanceLines.length > 1) {
        const rowsToInsert = remittanceLines.length - 1;
        worksheet.spliceRows(remittanceTemplateRow + 1, 0, ...Array(rowsToInsert).fill([]));
        console.log(`✅ Inserted ${rowsToInsert} rows for remittance`);
    }
    
    remittanceLines.forEach((line, index) => {
        const row = worksheet.getRow(remittanceTemplateRow + index);
        row.getCell(2).value = line;
    });
    
    // 检查结果
    console.log('\n=== Remittance rows result ===');
    for (let r = remittanceTemplateRow; r <= remittanceTemplateRow + remittanceLines.length + 2; r++) {
        const c1 = worksheet.getRow(r).getCell(1).value;
        const c2 = worksheet.getRow(r).getCell(2).value;
        console.log(`Row ${r}: C1="${c1 || ''}" | C2="${c2 || ''}"`);
    }
    
    // 保存测试
    await workbook.xlsx.writeFile(path.join(__dirname, 'test_output_fixed.xlsx'));
    console.log('\n✅ Saved to test_output_fixed.xlsx');
}

testFixedCode().catch(console.error);