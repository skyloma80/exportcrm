const ExcelJS = require('exceljs');

async function test() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  
  // 合并 B11:C11
  ws.mergeCells('B11:C11');
  ws.getCell('B11').value = 'Template';
  
  console.log('所有 worksheet 方法和属性:');
  const props = Object.getOwnPropertyNames(ws);
  for (const p of props) {
    console.log('- ' + p + ':', typeof ws[p]);
  }
  
  console.log('\n遍历原型链:');
  let proto = ws;
  while (proto && proto !== Object.prototype) {
    console.log('原型:', Object.getPrototypeOf(proto).constructor.name);
    for (const p of Object.getOwnPropertyNames(proto)) {
      if (p.includes('merge')) {
        console.log('  - ' + p);
      }
    }
    proto = Object.getPrototypeOf(proto);
  }
}

test();
