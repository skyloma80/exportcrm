const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function check() {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(process.cwd(), 'excel-template', 'PO-template.xlsx');
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    
    const row10 = worksheet.getRow(10);
    const headers = [];
    for (let i = 1; i <= 10; i++) {
        headers.push(`${i}: ${row10.getCell(i).value}`);
    }
    console.log('Row 10 Headers:', headers.join(' | '));

    const row15 = worksheet.getRow(15);
    console.log('Row 15 Col 7/8:', row15.getCell(7).value, row15.getCell(8).value);
    
    const row19 = worksheet.getRow(19);
    console.log('Row 19 Col 1:', row19.getCell(1).value);
}

check();
