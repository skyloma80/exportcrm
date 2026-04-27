const ExcelJS = require('exceljs');
const path = require('path');

async function fixTemplate() {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path.join(__dirname, 'excel-template', 'PI.xlsx'));
    const ws = wb.worksheets[0];
    
    // 保留原始媒体（logo）
    const originalMedia = [...wb.media];
    console.log('Original media:', originalMedia.length);
    
    // Row 28-31: Remittance 模板行
    // 保持 Row 28 作为模板（会有数据），Row 29-31 清空用于插入
    // 但问题是 Row 28-31 已经有示例数据了
    
    // 清空 Row 28-31 的内容，但保留格式
    for (let r = 28; r <= 31; r++) {
        const row = ws.getRow(r);
        for (let c = 1; c <= 5; c++) {
            row.getCell(c).value = '';
        }
    }
    
    await wb.xlsx.writeFile(path.join(__dirname, 'excel-template', 'PI.xlsx'));
    console.log('✅ Template fixed!');
    
    // 验证媒体是否保留
    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.readFile(path.join(__dirname, 'excel-template', 'PI.xlsx'));
    console.log('Media after write:', wb2.media?.length || 0);
}

fixTemplate().catch(console.error);