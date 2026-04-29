const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function check() {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(process.cwd(), 'excel-template', 'PO-template.xlsx');
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    
    function getVal(cell) {
        let val = cell.value;
        if (val && typeof val === 'object' && val.richText) {
            return val.richText.map(rt => rt.text).join('');
        }
        return val === null || val === undefined ? '' : String(val);
    }

    for (let i = 1; i <= 25; i++) {
        const row = worksheet.getRow(i);
        const values = [];
        for (let j = 1; j <= 9; j++) {
            values.push(getVal(row.getCell(j)));
        }
        console.log(`R${i}: ${values.join(' | ')}`);
    }
}

check();
