import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import * as XLSX from 'xlsx';

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  created: number;
  updated: number;
  errors: Array<{ row: number; error: string }>;
}

/**
 * 从 Excel 导入 Items 数据
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const updateExisting = formData.get('update_existing') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // 读取 Excel 文件
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // 获取第一个工作表
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // 转换为 JSON
    const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Excel file is empty' },
        { status: 400 }
      );
    }

    const pb = await createServerPocketBase();
    const results: ImportResult = {
      total: rows.length,
      success: 0,
      failed: 0,
      created: 0,
      updated: 0,
      errors: [],
    };

    // 处理每一行
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel 行号（从2开始，因为第1行是表头）

      try {
        // 验证必填字段
        const name = row['Name'] || row['name'];
        if (!name) {
          results.failed++;
          results.errors.push({ row: rowNum, error: 'Name is required' });
          continue;
        }

        // 验证 status
        const status = row['Status'] || row['status'] || 'pending';
        const validStatuses = ['active', 'inactive', 'pending'];
        if (!validStatuses.includes(status)) {
          results.failed++;
          results.errors.push({ row: rowNum, error: `Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}` });
          continue;
        }

        const itemData = {
          name: name,
          description: row['Description'] || row['description'] || '',
          status: status,
        };

        // 检查是否存在（通过 ID）
        const id = row['ID'] || row['id'];
        let existingItem = null;

        if (id && updateExisting) {
          try {
            existingItem = await pb.collection('items').getOne(id);
          } catch {
            // 不存在，将创建新记录
          }
        }

        if (existingItem && updateExisting) {
          // 更新现有记录
          await pb.collection('items').update(existingItem.id, itemData);
          results.success++;
          results.updated++;
        } else {
          // 创建新记录
          await pb.collection('items').create(itemData);
          results.success++;
          results.created++;
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push({ 
          row: rowNum, 
          error: error.message || 'Unknown error' 
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Error importing items:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import items' },
      { status: 500 }
    );
  }
}
