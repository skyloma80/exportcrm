const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function test() {
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(process.cwd(), 'excel-template', 'PI-template.xlsx');
    
    if (!fs.existsSync(templatePath)) {
        console.error('Template not found at', templatePath);
        return;
    }

    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0];

    const items = Array(13).fill(0).map((_, i) => ({
        part_number: 'PART-' + i,
        description_en: 'Description ' + i,
        quantity: 100,
        unit: 'PCS',
        unit_price: 10,
        amount: 1000
    }));

    const templateRow = 11;
    const originalProductRows = 1;
    const totalRowStart = 12;
    const extraRows = items.length - originalProductRows;

    console.log('--- Initial State ---');
    console.log('Initial Merges:', worksheet.model.merges);

    // 1. 解除合计行合并
    try { worksheet.unMergeCells('A12:C13'); } catch (e) { }
    try { worksheet.unMergeCells('F12:F13'); } catch (e) { }
    try { worksheet.unMergeCells('G12:G13'); } catch (e) { }
    try { worksheet.unMergeCells('H12:H13'); } catch (e) { }

    // 2. 批量插入行
    worksheet.spliceRows(totalRowStart, 0, ...Array(extraRows).fill([]));

    const sourceRow = worksheet.getRow(templateRow);
    for (let i = 0; i < extraRows; i++) {
        const currentRowNum = totalRowStart + i;
        const currentRow = worksheet.getRow(currentRowNum);
        for (let c = 1; c <= 8; c++) {
            currentRow.getCell(c).style = sourceRow.getCell(c).style;
        }
    }

    const totalRowIndex = totalRowStart + extraRows;

    // 3. 强力清理
    if (worksheet.model.merges) {
        console.log('--- Before Nuclear Clear ---');
        console.log('Merge count:', worksheet.model.merges.length);
        
        const mergesToRemove = worksheet.model.merges.filter(m => {
            const match = m.match(/([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?/);
            if (match) {
                const colStart = match[1];
                const rowStart = parseInt(match[2]);
                const colEnd = match[3] || colStart;
                const rowEnd = match[4] ? parseInt(match[4]) : rowStart;

                const involvesBC = (colStart <= 'C' && colEnd >= 'B');
                if (involvesBC && rowEnd >= 11 && rowStart <= totalRowIndex + 5) return true;
                if (rowEnd >= 12 && rowStart <= totalRowIndex + 5) return true;
            }
            return false;
        });

        console.log('Merges to remove:', mergesToRemove);
        mergesToRemove.forEach(m => {
            try { worksheet.unMergeCells(m); } catch (e) {
                console.error(`Failed to unmerge ${m}:`, e.message);
            }
        });
        
        console.log('--- After Nuclear Clear ---');
        console.log('Merge count:', worksheet.model.merges.length);
    }

    // 4. 重新建立合并
    console.log('--- Rebuilding Merges ---');
    try {
        worksheet.mergeCells(`A${totalRowIndex}:C${totalRowIndex + 1}`);
        worksheet.mergeCells(`F${totalRowIndex}:F${totalRowIndex + 1}`);
        worksheet.mergeCells(`G${totalRowIndex}:G${totalRowIndex + 1}`);
        worksheet.mergeCells(`H${totalRowIndex}:H${totalRowIndex + 1}`);
    } catch (e) {
        console.error('Total merge failed:', e.message);
    }

    for (let i = 0; i < items.length; i++) {
        const rowNum = templateRow + i;
        try {
            worksheet.mergeCells(`B${rowNum}:C${rowNum}`);
        } catch (e) {
            console.error(`Product merge failed at row ${rowNum}:`, e.message);
        }
    }

    console.log('--- Final Merges for Products ---');
    const finalBCMerges = worksheet.model.merges.filter(m => {
        const match = m.match(/([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?/);
        if (match) {
            const rowStart = parseInt(match[2]);
            return m.includes('B') && m.includes('C') && rowStart >= 11 && rowStart <= totalRowIndex;
        }
        return false;
    });
    console.log(finalBCMerges.sort());
    
    if (finalBCMerges.length === items.length) {
        console.log('SUCCESS: All product rows are merged!');
    } else {
        console.log(`FAILURE: Only ${finalBCMerges.length}/${items.length} rows are merged.`);
    }
}

test().catch(err => console.error(err));
