import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

/**
 * 下载 Items 导入模板
 */
export async function GET() {
  try {
    // 创建模板数据
    const templateData = [
      {
        'Name': 'Example Item 1',
        'Description': 'This is an example item description',
        'Status': 'active',
      },
      {
        'Name': 'Example Item 2',
        'Description': 'Another example item',
        'Status': 'pending',
      },
    ];

    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // 设置列宽
    worksheet['!cols'] = [
      { wch: 30 }, // Name
      { wch: 50 }, // Description
      { wch: 15 }, // Status
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Items');

    // 生成 Excel 文件
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="items_import_template.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate template' },
      { status: 500 }
    );
  }
}
