const ExcelJS = require('exceljs');
const path = require('path');

async function checkTemplate() {
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(__dirname, 'excel-template', 'PI.xlsx');
    
    await workbook.xlsx.readFile(templatePath);
    
    console.log('=== Workbook Info ===');
    console.log('Worksheets:', workbook.worksheets.length);
    
    const ws = workbook.worksheets[0];
    
    // Check images
    console.log('\n=== Images ===');
    console.log('Total images in worksheet:', ws.images?.length || 0);
    
    if (ws._images) {
        console.log('_images length:', ws._images.length);
    }
    
    // Check media
    console.log('\n=== Media ===');
    if (ws.media) {
        console.log('Media items:', ws.media.length);
    }
    
    // List all drawings
    console.log('\n=== Drawings ===');
    console.log('Drawings count:', ws.drawings?.length || 0);
    
    // Check for any media in workbook
    console.log('\n=== Workbook Media ===');
    if (workbook.media) {
        console.log('Workbook media:', workbook.media.length);
        workbook.media.forEach((m, i) => {
            console.log(`  ${i}: type=${m.type}, name=${m.name}`);
        });
    }
}

checkTemplate().catch(console.error);