import { NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import * as XLSX from 'xlsx';

interface Customer {
  id: string;
  code: string;
  name: string;
  name_cn?: string;
  country: string;
  type: string;
  rating?: number;
  preferred_currency?: string;
  address?: string;
  address_cn?: string;
  website?: string;
  remarks?: string;
  created: string;
  updated: string;
}

/**
 * Export customers to Excel
 * @description 导出客户数据到 Excel 文件，返回二进制 xlsx 流
 * @response 200:CustomerSchema:导出的客户 Excel 文件（二进制附件）
 * @response 404 没有找到客户数据
 * @response 500 导出失败，服务器内部错误
 */
export async function GET() {
  try {
    const pb = await createServerPocketBase();

    // Get all customers
    const customers = await pb.collection('customers').getFullList<Customer>({
      sort: 'code',
    });

    if (!customers || customers.length === 0) {
      return NextResponse.json(
        { error: 'No customers found' },
        { status: 404 }
      );
    }

    // Prepare Excel data
    const excelData = customers.map((customer) => ({
      'Code': customer.code,
      'Name (EN)': customer.name,
      'Name (CN)': customer.name_cn || '',
      'Country': customer.country,
      'Type': customer.type,
      'Rating': customer.rating || '',
      'Currency': customer.preferred_currency || '',
      'Address (EN)': customer.address || '',
      'Address (CN)': customer.address_cn || '',
      'Website': customer.website || '',
      'Remarks': customer.remarks || '',
      'Created': customer.created ? new Date(customer.created).toLocaleDateString() : '',
    }));

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // Code
      { wch: 30 }, // Name (EN)
      { wch: 30 }, // Name (CN)
      { wch: 10 }, // Country
      { wch: 12 }, // Type
      { wch: 8 },  // Rating
      { wch: 10 }, // Currency
      { wch: 40 }, // Address (EN)
      { wch: 40 }, // Address (CN)
      { wch: 30 }, // Website
      { wch: 40 }, // Remarks
      { wch: 12 }, // Created
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="customers_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting customers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export customers' },
      { status: 500 }
    );
  }
}
