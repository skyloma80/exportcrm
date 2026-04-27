const ExcelJS = require('exceljs');
const path = require('path');

async function checkMerges() {
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(__dirname, 'excel-template', 'PI.xlsx');
    
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0];
    
    console.log('--- _merges ---');
    console.log('_merges:', worksheet._merges);
}

checkMerges().catch(console.error);