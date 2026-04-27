const ExcelJS = require('exceljs');
const path = require('path');

async function inspectTemplate() {
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(__dirname, 'excel-template', 'PI.xlsx');
    
    try {
        await workbook.xlsx.readFile(templatePath);
        const worksheet = workbook.worksheets[0];
        
        console.log('--- Template Inspection ---');
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {
                if (cell.value && typeof cell.value === 'string' && cell.value.includes('{{')) {
                    console.log(`Row ${rowNumber}, Col ${colNumber}: ${cell.value}`);
                }
            });
        });
        
        // Also print some header/total rows to see if they have placeholders
        const headerRows = [2, 3, 4, 5, 6, 7, 8];
        console.log('\n--- Header Values ---');
        headerRows.forEach(r => {
            const row = worksheet.getRow(r);
            console.log(`Row ${r}: ${row.getCell(2).value} | ${row.getCell(7).value}`);
        });

    } catch (error) {
        console.error('Error reading template:', error);
    }
}

inspectTemplate();
