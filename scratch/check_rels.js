const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

async function check() {
    const templatePath = path.join(process.cwd(), 'excel-template', '采购订单.xlsx');
    const zip = await JSZip.loadAsync(fs.readFileSync(templatePath));
    
    const workbookXml = await zip.file('xl/workbook.xml').async('string');
    console.log('Workbook XML:', workbookXml);
    
    const workbookRels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
    console.log('Workbook Rels:', workbookRels);
    
    // Find the first sheet's target
    const sheet1Match = workbookRels.match(/Id="rId1"[^>]*Target="worksheets\/(sheet\d+\.xml)"/);
    if (sheet1Match) {
        const sheetPath = 'xl/worksheets/' + sheet1Match[1];
        const sheetRelsPath = 'xl/worksheets/_rels/' + sheet1Match[1] + '.rels';
        
        if (zip.file(sheetRelsPath)) {
            const sheetRels = await zip.file(sheetRelsPath).async('string');
            console.log('Sheet Rels:', sheetRels);
        } else {
            console.log('No Sheet Rels found for', sheetRelsPath);
        }
    }
}

check();
