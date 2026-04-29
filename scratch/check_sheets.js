const ExcelJS = require('exceljs');
const path = require('path');

async function check() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(process.cwd(), 'excel-template', '采购订单.xlsx'));
    console.log('Sheets:', workbook.worksheets.map(w => w.name));
}

check();
