const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function check() {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(process.cwd(), 'excel-template', 'PO-template.xlsx');
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    
    console.log('Sheet Name:', worksheet.name);
    for (let i = 1; i <= 20; i++) {
        const row = worksheet.getRow(i);
        const values = [];
        for (let j = 1; j <= 8; j++) {
            let val = row.getCell(j).value;
            if (val && typeof val === 'object' && val.richText) {
                val = val.richText.map(rt => rt.text).join('');
            }
            if (val && typeof val === 'object' && val.formula) {
                val = `=${val.formula}`;
            }
            values.push(val === null || val === undefined ? '' : String(val));
        }
        console.log(`Row ${i}: ${values.join(' | ')}`);
    }
}

check();
