const ExcelJS = require('exceljs');
const path = require('path');

async function checkMerges() {
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(__dirname, 'excel-template', 'PI.xlsx');
    
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0];
    
    // 检查合并单元格
    console.log('--- Merged Cells ---');
    if (worksheet.model && worksheet.model.merges) {
        console.log('Merged ranges:', worksheet.model.merges.ranges);
    } else {
        console.log('No merge info found in worksheet.model.merges');
    }
    
    // 检查另一个可能的属性
    console.log('\n--- worksheet.merges ---');
    console.log('merges:', worksheet.merges);
    
    // 检查模型属性
    console.log('\n--- worksheet keys ---');
    console.log(Object.keys(worksheet).filter(k => k.includes('merge') || k.includes('Merge')));
}

checkMerges().catch(console.error);