const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// 模拟 excel-pi-service 的读写流程
async function testReadWrite() {
    const templatePath = path.join(__dirname, 'excel-template', 'PI.xlsx');
    const outputPath = path.join(__dirname, 'excel-template', 'PI-test-output.xlsx');
    
    console.log('=== 步骤1: 读取模板 ===');
    const wb1 = new ExcelJS.Workbook();
    await wb1.xlsx.readFile(templatePath);
    
    console.log('  读取后 workbook.media:', wb1.media?.length || 0);
    if (wb1.media) {
        console.log('  Media:', wb1.media.map(m => `${m.type}:${m.name}`));
    }
    
    const ws1 = wb1.worksheets[0];
    console.log('  读取后 worksheet.images:', ws1.images?.length || 0);
    
    // 修改一些内容
    ws1.getCell('G2').value = 'TEST-001';
    
    console.log('\n=== 步骤2: 写入文件 ===');
    await wb1.xlsx.writeFile(outputPath);
    
    console.log('\n=== 步骤3: 重新读取输出文件 ===');
    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.readFile(outputPath);
    
    console.log('  重新读取后 workbook.media:', wb2.media?.length || 0);
    if (wb2.media) {
        console.log('  Media:', wb2.media.map(m => `${m.type}:${m.name}`));
    }
    
    const ws2 = wb2.worksheets[0];
    console.log('  重新读取后 worksheet.images:', ws2.images?.length || 0);
    
    // 检查图片数据
    if (wb2.media && wb2.media[0]) {
        console.log('\n  第一个媒体对象:');
        console.log('    type:', wb2.media[0].type);
        console.log('    name:', wb2.media[0].name);
        console.log('    data length:', wb2.media[0].buffer?.length || 'no buffer');
    }
}

testReadWrite().catch(console.error);