const ExcelJS = require('exceljs');
const path = require('path');

async function checkLogo() {
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(__dirname, 'excel-template', 'PI.xlsx');
    
    await workbook.xlsx.readFile(templatePath);
    
    console.log('=== PI.xlsx Logo Info ===');
    if (workbook.media && workbook.media.length > 0) {
        workbook.media.forEach((m, i) => {
            console.log(`Image ${i}:`);
            console.log(`  Name: ${m.name}`);
            console.log(`  Type: ${m.type}`);
            console.log(`  Buffer length: ${m.buffer?.length}`);
            
            // 检查图片数据类型
            if (m.buffer) {
                // 简单判断图片格式
                const uint8 = new Uint8Array(m.buffer.slice(0, 4));
                if (uint8[0] === 0x89 && uint8[1] === 0x50 && uint8[2] === 0x4E && uint8[3] === 0x47) {
                    console.log('  Format: PNG');
                } else if (uint8[0] === 0xFF && uint8[1] === 0xD8) {
                    console.log('  Format: JPEG');
                } else {
                    console.log('  Format: Unknown');
                }
            }
        });
    } else {
        console.log('No media found in PI.xlsx');
    }
    
    // 同时检查PI-template.xlsx
    console.log('\n=== PI-template.xlsx Logo Info ===');
    const workbook2 = new ExcelJS.Workbook();
    await workbook2.xlsx.readFile(path.join(__dirname, 'excel-template', 'PI-template.xlsx'));
    
    if (workbook2.media && workbook2.media.length > 0) {
        workbook2.media.forEach((m, i) => {
            console.log(`Image ${i}: ${m.name}, ${m.type}, size=${m.buffer?.length}`);
        });
    } else {
        console.log('No media found in PI-template.xlsx');
    }
}

checkLogo().catch(console.error);