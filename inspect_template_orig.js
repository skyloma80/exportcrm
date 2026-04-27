const ExcelJS = require('exceljs');
const path = require('path');

async function inspectTemplate() {
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(__dirname, 'excel-template', 'PI-template.xlsx');
    
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0];
    
    // 检查Remittance Instructions区域 (row 27-32)
    console.log('--- PI-template.xlsx: Remittance Instructions Area (rows 27-35) ---');
    for (let r = 27; r <= 35; r++) {
        const row = worksheet.getRow(r);
        let hasContent = false;
        for (let c = 1; c <= 8; c++) {
            const val = row.getCell(c).value;
            if (val) hasContent = true;
        }
        if (hasContent) {
            console.log(`Row ${r}:`);
            for (let c = 1; c <= 8; c++) {
                const val = row.getCell(c).value;
                if (val) console.log(`  C${c}: ${String(val).substring(0, 60)}`);
            }
        }
    }
    
    // 检查图片
    console.log('\n--- Media ---');
    if (workbook.media) {
        console.log('Media count:', workbook.media.length);
    }
}

inspectTemplate();