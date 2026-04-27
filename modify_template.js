const ExcelJS = require('exceljs');
const path = require('path');

async function modifyTemplate() {
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(__dirname, 'excel-template', 'PI.xlsx');
    
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0];
    
    // Items table - Row 11 is the template row
    // Col A: No. (序号，将动态生成数字)
    // Col B-C: Part Number
    // Col D: Description  
    // Col E: Quantity
    // Col F: Unit
    // Col G: Unit Price
    // Col H: Amount
    
    // Header row (Row 10) 保持不变
    
    // Template row (Row 11) - 设置占位符用于动态插入时复制样式
    // 这里我们不改，因为items是动态插入的，模板行会被复制
    
    await workbook.xlsx.writeFile(templatePath);
    console.log('✅ Template ready!');
    
    // Show final structure
    console.log('\n=== Template Structure ===');
    console.log('Row 2: {{vendor_code}}, {{customer_po}}, {{order_no}}, {{date}}');
    console.log('Row 6-8: {{customer.name}}, {{customer.address}}, {{customer.tax_id}}');
    console.log('Row 10: Items header (No., Part Number, Description, Qty, Unit, Price, Amount)');
    console.log('Row 11: Items template row (will be copied)');
    console.log('Row 28-31: {{remittance.items[0-3]}}');
}

modifyTemplate().catch(console.error);