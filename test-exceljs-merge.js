const ExcelJS = require('exceljs');

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Sheet1');

// Create template row with merged cells
worksheet.getRow(1).getCell('B').value = '合并B';
worksheet.getRow(1).getCell('C').value = 'C';
worksheet.mergeCells('B1:C1');

// Duplicate row using spliceRows
const templateRow = 1;
worksheet.spliceRows(templateRow, 0, [worksheet.getRow(templateRow).values]);

// Check if merged before merging
const checkMerge = (row, colStart, colEnd) => {
  const cell = worksheet.getCell(`${colStart}${row}`);
  const range = worksheet.mergedCells.find(range =>
    range.top <= row && range.bottom >= row &&
    range.left <= colStart.charCodeAt(0) - 'A'.charCodeAt(0) + 1 &&
    range.right >= colEnd.charCodeAt(0) - 'A'.charCodeAt(0) + 1
  );
  return !!range;
};

// Try to merge B2:C2
if (!checkMerge(2, 'B', 'C')) {
  worksheet.mergeCells('B2:C2');
  worksheet.getRow(2).getCell('B').value = '合并B';
  worksheet.getRow(2).getCell('C').value = 'C';
}

// Save the file
workbook.xlsx.writeFile('test-merge.xlsx')
  .then(() => console.log('Test done'))
  .catch(err => console.error(err));
