const ExcelJS = require('exceljs');
const path = require('path');

async function inspectTemplate() {
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(__dirname, 'excel-template', 'PI.xlsx');
    
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0];
    
    // 检查更多行
    console.log('--- Full Template Structure (rows 1-45) ---');
    for (let r = 1; r <= 45; r++) {
        const row = worksheet.getRow(r);
        const c1 = row.getCell(1).value;
        const c2 = row.getCell(2).value;
        const c3 = row.getCell(3).value;
        if (c1 || c2 || c3) {
            console.log(`Row ${r}: C1=${String(c1||'').substring(0,50)} | C2=${String(c2||'').substring(0,50)} | C3=${String(c3||'').substring(0,50)}`);
        }
    }
    
    // 检查媒体（logo等图片）
    console.log('\n--- Media (images, logos) ---');
    if (workbook.media) {
        console.log('Media count:', workbook.media.length);
        workbook.media.forEach((m, i) => {
            console.log(`  ${i}: ${m.type}, ${m.name}`);
        });
    } else {
        console.log('No media found');
    }
    
    // 检查worksheet images
    console.log('\n--- Worksheet Images ---');
    if (worksheet.images) {
        console.log('Image count:', worksheet.images.length);
        worksheet.images.forEach((img, i) => {
            console.log(`  ${i}: range=${JSON.stringify(img.range)}, type=${img.type}`);
        });
    } else {
        console.log('No worksheet images');
    }
}

inspectTemplate();