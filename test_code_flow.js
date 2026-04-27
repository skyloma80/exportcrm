const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// 完整模拟代码流程
async function testCode() {
    const templatePath = path.join(__dirname, 'excel-template', 'PI.xlsx');
    const outputPath = path.join(__dirname, 'excel-template', 'PI-code-test.xlsx');
    
    console.log('=== 1. 读取模板 ===');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0];
    
    console.log('  读取后 workbook.media:', workbook.media?.length || 0);
    
    // ====== 代码中做的操作 ======
    
    // 清空Items模板行 (Row 11)
    const templateRow = 11;
    const row11 = worksheet.getRow(templateRow);
    for (let c = 1; c <= 8; c++) {
        row11.getCell(c).value = '';
    }
    
    // 假设有3个items
    const items = [1, 2, 3];
    const templateRowCount = 1;
    
    // 动态插入行
    if (items.length > templateRowCount) {
        const rowsToInsert = items.length - templateRowCount;
        worksheet.spliceRows(templateRow + templateRowCount, 0, ...Array(rowsToInsert).fill([]));
        console.log('\n=== 2. 插入items行后 ===');
        console.log('  workbook.media:', workbook.media?.length || 0);
        
        // 复制样式
        const sourceRow = worksheet.getRow(templateRow);
        for (let i = 0; i < rowsToInsert; i++) {
            const newRow = worksheet.getRow(templateRow + templateRowCount + i);
            sourceRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const targetCell = newRow.getCell(colNumber);
                targetCell.style = { ...cell.style };
            });
        }
    }
    
    // Remittance处理 (假设有3行)
    const remittanceLines = ['Line 1', 'Line 2', 'Line 3'];
    const remittanceTemplateRow = 28;
    
    // 尝试unmerge
    try {
        worksheet.unMergeCells(`A${remittanceTemplateRow}:E${remittanceTemplateRow}`);
    } catch(e) {}
    
    // 清空模板行
    for (let c = 1; c <= 8; c++) {
        worksheet.getRow(remittanceTemplateRow).getCell(c).value = '';
    }
    
    // 动态插入remittance行
    if (remittanceLines.length > 1) {
        const rowsToInsert = remittanceLines.length - 1;
        worksheet.spliceRows(remittanceTemplateRow + 1, 0, ...Array(rowsToInsert).fill([]));
        console.log('\n=== 3. 插入remittance行后 ===');
        console.log('  workbook.media:', workbook.media?.length || 0);
    }
    
    // ====== 保存到Buffer ======
    console.log('\n=== 4. 写入Buffer前 ===');
    console.log('  workbook.media:', workbook.media?.length || 0);
    
    const buffer = await workbook.xlsx.writeBuffer();
    
    // 写入文件测试
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    console.log('\n=== 5. 写入文件完成 ===');
    
    // 重新读取验证
    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.readFile(outputPath);
    console.log('\n=== 6. 重新读取 ===');
    console.log('  workbook.media:', wb2.media?.length || 0);
    
    if (wb2.media && wb2.media[0]) {
        console.log('  第一个media类型:', wb2.media[0].type);
        console.log('  第一个media名称:', wb2.media[0].name);
        console.log('  buffer长度:', wb2.media[0].buffer?.length || 0);
    }
}

testCode().catch(console.error);