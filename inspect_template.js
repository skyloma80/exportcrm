const ExcelJS = require('exceljs');
const path = require('path');

async function inspect() {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path.join(__dirname, 'excel-template', 'PI.xlsx'));
    const ws = wb.worksheets[0];
    
    console.log('=== Row 28 Full ===');
    const row = ws.getRow(28);
    for (let c = 1; c <= 8; c++) {
        console.log(`C${c}: ${row.getCell(c).value}`);
    }
    
    console.log('\n=== Media ===');
    console.log('Count:', wb.media?.length || 0);
    if (wb.media) {
        wb.media.forEach((m, i) => console.log(`  ${i}: ${m.type} - ${m.name}`));
    }
}

inspect().catch(console.error);