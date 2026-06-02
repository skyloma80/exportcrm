import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import * as XLSX from 'xlsx';
import { formatCode, PREFIXES } from '@/lib/services/code-generator';

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  created: number;
  updated: number;
  errors: Array<{ row: number; error: string }>;
}

const VALID_TYPES = ['direct', 'agent', 'distributor'];
const VALID_CURRENCIES = ['USD', 'EUR', 'CNY', 'GBP', 'JPY', 'HKD', 'SGD', 'AUD'];

/**
 * Import customers from Excel
 * @description 从上传的 Excel 文件导入客户数据，支持新增和更新已有记录
 * @response 200:ImportResultSchema:导入结果，包含成功/失败数量及错误详情
 * @response 400 未提供文件或文件为空
 * @response 500 导入失败，服务器内部错误
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

    // Read Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Get first worksheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
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

    // Get current max sequence for code generation
    let currentSequence = 0;
    try {
      const seqRecord = await pb.collection('code_sequences').getFirstListItem(
        `prefix = "${PREFIXES.CUSTOMER}" && year = ${new Date().getFullYear()}`
      );
      currentSequence = seqRecord.current_sequence;
    } catch {
      // No sequence record yet
    }

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel row number (starts from 2, row 1 is header)

      try {
        // Validate required fields
        const name = row['Name (EN)'] || row['Name'] || row['name'];
        if (!name) {
          results.failed++;
          results.errors.push({ row: rowNum, error: 'Name (EN) is required' });
          continue;
        }

        // Validate country (2-letter code)
        const country = (row['Country'] || row['country'] || '').toUpperCase();
        if (!country || country.length !== 2) {
          results.failed++;
          results.errors.push({ row: rowNum, error: 'Country must be a 2-letter code (e.g., US, CN, DE)' });
          continue;
        }

        // Validate type
        const type = (row['Type'] || row['type'] || 'direct').toLowerCase();
        if (!VALID_TYPES.includes(type)) {
          results.failed++;
          results.errors.push({ row: rowNum, error: `Invalid type: ${type}. Must be one of: ${VALID_TYPES.join(', ')}` });
          continue;
        }

        // Validate rating
        const ratingStr = row['Rating'] || row['rating'];
        let rating: number | undefined;
        if (ratingStr) {
          rating = parseInt(ratingStr, 10);
          if (isNaN(rating) || rating < 1 || rating > 5) {
            results.failed++;
            results.errors.push({ row: rowNum, error: 'Rating must be between 1 and 5' });
            continue;
          }
        }

        // Validate currency
        const currency = (row['Currency'] || row['currency'] || '').toUpperCase();
        if (currency && !VALID_CURRENCIES.includes(currency)) {
          results.failed++;
          results.errors.push({ row: rowNum, error: `Invalid currency: ${currency}. Must be one of: ${VALID_CURRENCIES.join(', ')}` });
          continue;
        }

        const customerData: any = {
          name: name,
          name_cn: row['Name (CN)'] || row['name_cn'] || '',
          country: country,
          type: type,
          rating: rating,
          preferred_currency: currency || undefined,
          address: row['Address (EN)'] || row['address'] || '',
          address_cn: row['Address (CN)'] || row['address_cn'] || '',
          website: row['Website'] || row['website'] || '',
          remarks: row['Remarks'] || row['remarks'] || '',
        };

        // Check if exists (by code)
        const code = row['Code'] || row['code'];
        let existingCustomer = null;

        if (code && updateExisting) {
          try {
            existingCustomer = await pb.collection('customers').getFirstListItem(`code = "${code}"`);
          } catch {
            // Does not exist, will create new record
          }
        }

        if (existingCustomer && updateExisting) {
          // Update existing record
          await pb.collection('customers').update(existingCustomer.id, customerData);
          results.success++;
          results.updated++;
        } else {
          // Generate new code
          currentSequence++;
          const newCode = formatCode(PREFIXES.CUSTOMER, new Date().getFullYear(), currentSequence);
          customerData.code = newCode;
          
          // Create new record
          await pb.collection('customers').create(customerData);
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

    // Update sequence counter if we created new records
    if (results.created > 0) {
      try {
        const year = new Date().getFullYear();
        const existingSeq = await pb.collection('code_sequences').getFirstListItem(
          `prefix = "${PREFIXES.CUSTOMER}" && year = ${year}`
        );
        await pb.collection('code_sequences').update(existingSeq.id, {
          current_sequence: currentSequence,
        });
      } catch {
        // Create new sequence record
        await pb.collection('code_sequences').create({
          prefix: PREFIXES.CUSTOMER,
          year: new Date().getFullYear(),
          current_sequence: currentSequence,
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Error importing customers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import customers' },
      { status: 500 }
    );
  }
}
