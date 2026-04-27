const ExcelJS = require('exceljs');
const path = require('path');

async function inspectTemplate() {
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(__dirname, 'excel-template', 'PI.xlsx');
    
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0];
    
    // 检查Remittance Instructions区域 (row 27-32)
    console.log('--- Remittance Instructions Area (rows 27-32) ---');
    for (let r = 27; r <= 32; r++) {
        const row = worksheet.getRow(r);
        console.log(`Row ${r}:`);
        for (let c = 1; c <= 8; c++) {
            const val = row.getCell(c).value;
            if (val) console.log(`  C${c}: ${String(val).substring(0, 60)}`);
        }
    }
    
    // 检查图片详情
    console.log('\n--- Media Details ---');
    if (workbook.media) {
        workbook.media.forEach((m, i) => {
            console.log(`  ${i}: type=${m.type}, name=${m.name}, size=${m.buffer ? m.buffer.length : 'N/A'}`);
        });
    }
}

inspectTemplate();