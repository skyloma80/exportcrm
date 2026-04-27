const ExcelJS = require('exceljs');
const path = require('path');

async function inspectTemplate() {
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(__dirname, 'excel-template', 'PI.xlsx');
    
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0];
    
    console.log('--- All rows 14 to 40 ---');
    for (let r = 14; r <= 40; r++) {
        const row = worksheet.getRow(r);
        const rowData = [];
        for (let c = 1; c <= 8; c++) {
            const val = row.getCell(c).value;
            if (val) rowData.push(`C${c}:${val}`);
        }
        if (rowData.length > 0) {
            console.log(`Row ${r}: ${rowData.join(' | ')}`);
        }
    }
}

inspectTemplate();
