const ExcelJS = require('exceljs');
const path = require('path');

async function check() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(process.cwd(), 'excel-template', '采购订单.xlsx'));
    const worksheet = workbook.worksheets[0];
    
    console.log('Row 10 (Header):');
    const row10 = worksheet.getRow(10);
    row10.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        console.log(`Col ${colNumber}: ${cell.value}`);
    });
    
    console.log('\nRow 11 (Data):');
    const row11 = worksheet.getRow(11);
    row11.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        console.log(`Col ${colNumber}: ${cell.value}`);
    });

    console.log('\nLooking for labels:');
    worksheet.eachRow((row, rowNumber) => {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const val = cell.value ? String(cell.value) : '';
            if (val.includes('小计') || val.includes('合计') || val.includes('备注') || val.includes('增值税')) {
                console.log(`Row ${rowNumber}, Col ${colNumber}: ${val}`);
            }
        });
    });
}

check();
