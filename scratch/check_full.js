const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function check() {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(process.cwd(), 'excel-template', '采购订单.xlsx');
    const buffer = fs.readFileSync(filePath);
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    
    for (let i = 1; i <= 30; i++) {
        const row = worksheet.getRow(i);
        const values = [];
        for (let j = 1; j <= 12; j++) {
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
