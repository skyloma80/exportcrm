const ExcelJS = require('exceljs');
const path = require('path');

async function checkPI() {
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(__dirname, 'excel-template', 'PI.xlsx');
    
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0];
    
    // 查看Rows 27-32的详细数据
    console.log('--- PI.xlsx rows 27-32 detail ---');
    for (let r = 27; r <= 32; r++) {
        console.log(`\nRow ${r}:`);
        for (let c = 1; c <= 10; c++) {
            const val = worksheet.getRow(r).getCell(c).value;
            if (val) console.log(`  C${c}: ${String(val).substring(0,80)}`);
        }
    }
}

checkPI().catch(console.error);