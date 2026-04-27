const ExcelJS = require('exceljs');
const path = require('path');

async function inspectTemplate() {
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(__dirname, 'excel-template', 'PI.xlsx');
    
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0];
    
    // Check row 28 more carefully - remittance area
    console.log('--- Row 28 (Remittance area) ---');
    const row28 = worksheet.getRow(28);
    for (let c = 1; c <= 10; c++) {
        const cell = row28.getCell(c);
        console.log(`C${c}: ${cell.value}`);
    }
    
    // Also check if there are more rows below
    console.log('\n--- Rows 29-35 ---');
    for (let r = 29; r <= 35; r++) {
        const row = worksheet.getRow(r);
        const c1 = row.getCell(1).value;
        const c2 = row.getCell(2).value;
        const c3 = row.getCell(3).value;
        if (c1 || c2 || c3) {
            console.log(`Row ${r}: C1=${c1} | C2=${c2} | C3=${c3}`);
        }
    }
}

inspectTemplate();