const ExcelJS = require('exceljs');

async function test() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  
  // 初始化第一行
  for (let c = 1; c <= 8; c++) {
    ws.getCell(1, c).value = 'C' + c;
  }
  
  // 合并 B1:C1
  ws.mergeCells('B1:C1');
  console.log('合并 B1:C1');
  
  // 取消合并
  ws.unMergeCells('B1:C1');
  console.log('取消合并');
  
  // 插入5行
  ws.spliceRows(2, 0, ...Array(5).fill([]));
  console.log('插入5行后');
  
  // 清除新行的合并记录
  const newRows = [2, 3, 4, 5, 6];
  for (const r of newRows) {
    // 清除内部 _merges 记录
    const cellB = ws.getCell(r, 2);
    const cellC = ws.getCell(r, 3);
    const merges = ws._merges;
    if (merges) {
      delete merges[`B${r}`];
      delete merges[`C${r}`];
      console.log('清除行 ' + r + ' 的合并记录');
    }
  }
  
  // 现在合并新行
  for (const r of newRows) {
    try {
      ws.mergeCells('B' + r + ':C' + r);
      console.log('合并 B' + r + ':C' + r + ' 成功');
    } catch (e) {
      console.log('合并 B' + r + ':C' + r + ' 失败:', e.message);
    }
  }
  
  await wb.xlsx.writeFile('test-clear-merges.xlsx');
  console.log('完成');
}

test();
