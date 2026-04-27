const ExcelJS = require('exceljs');
const path = require('path');

async function checkGeneratedLogo() {
    // 读取我之前生成的测试文件
    const testPath = path.join(__dirname, 'test_output_fixed.xlsx');
    
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(testPath);
        
        console.log('=== test_output_fixed.xlsx Logo ===');
        if (workbook.media && workbook.media.length > 0) {
            console.log(`✅ Logo preserved: ${workbook.media.length} image(s)`);
            workbook.media.forEach((m, i) => {
                console.log(`  Image ${i}: ${m.name}, ${m.type}, size=${m.buffer?.length}`);
            });
        } else {
            console.log('❌ NO Logo found in generated file!');
        }
    } catch (e) {
        console.log('File not found, generating...');
    }
}

checkGeneratedLogo().catch(console.error);