import { NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import * as XLSX from 'xlsx';

/**
 * 导出 Items 数据到 Excel
 */
export async function GET() {
  try {
    const pb = await createServerPocketBase();

    // 获取所有 items 数据
    const items = await pb.collection('items').getFullList({
      sort: '-id',
    });

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'No items found' },
        { status: 404 }
      );
    }

    // 准备 Excel 数据
    const excelData = items.map((item) => ({
      'ID': item.id,
      'Name': item.name,
      'Description': item.description || '',
      'Status': item.status,
    }));

    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // 设置列宽
    worksheet['!cols'] = [
      { wch: 20 }, // ID
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
        'Content-Disposition': `attachment; filename="items_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting items:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export items' },
      { status: 500 }
    );
  }
}
