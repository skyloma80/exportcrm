import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createServerPocketBase } from "@/lib/pocketbase/server";

/**
 * Master Data Export API Route
 * 全量数据导出接口
 */
export async function GET() {
  try {
    const pb = await createServerPocketBase();
    
    // 1. Fetch all data with expands for relations
    const [
      customers,
      customerContacts,
      suppliers,
      supplierContacts,
      supplierBankAccounts,
      products,
      appConfigs
    ] = await Promise.all([
      pb.collection("customers").getFullList({ sort: "-created" }),
      pb.collection("customer_contacts").getFullList({ sort: "-created", expand: "customer" }),
      pb.collection("suppliers").getFullList({ sort: "-created" }),
      pb.collection("supplier_contacts").getFullList({ sort: "-created", expand: "supplier" }),
      pb.collection("supplier_bank_accounts").getFullList({ sort: "-created", expand: "supplier" }),
      pb.collection("products").getFullList({ sort: "-created" }),
      pb.collection("app_config").getFullList({ sort: "key" }),
    ]);

    // Helper to recursively strip large/unwanted fields
    const stripLargeFields = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(stripLargeFields);
      
      const result: any = {};
      const fieldsToStrip = ['logo_base64', 'signature_base64', 'stamp_base64'];
      
      for (const [key, value] of Object.entries(obj)) {
        if (fieldsToStrip.includes(key)) continue;
        result[key] = stripLargeFields(value);
      }
      return result;
    };

    // Helper to format data for Excel, specifically handling objects and 'ext' field
    const formatForExcel = (items: any[], collectionName?: string) => {
      const EXCEL_LIMIT = 32000;

      return items.map(item => {
        // First strip large fields
        const stripped = stripLargeFields(item);
        const flatItem: any = {};
        
        for (const [key, value] of Object.entries(stripped)) {
          // Skip internal PocketBase fields
          if (['collectionId', 'collectionName', 'expand', 'proxyModel'].includes(key)) continue;
          
          let cellValue: any = value;
          if (value !== null && typeof value === 'object') {
            cellValue = JSON.stringify(value);
          }

          // Handle Excel cell length limit
          if (typeof cellValue === 'string' && cellValue.length > EXCEL_LIMIT) {
            cellValue = cellValue.substring(0, EXCEL_LIMIT) + "...[TRUNCATED]";
          }

          flatItem[key] = cellValue;
        }

        // Add parent codes for related entities
        if (collectionName === 'customer_contacts' && (item as any).expand?.customer) {
          flatItem.customer_code = (item as any).expand.customer.code;
        }
        if (collectionName === 'supplier_contacts' && (item as any).expand?.supplier) {
          flatItem.supplier_code = (item as any).expand.supplier.code;
        }
        if (collectionName === 'supplier_bank_accounts' && (item as any).expand?.supplier) {
          flatItem.supplier_code = (item as any).expand.supplier.code;
        }

        return flatItem;
      });
    };

    // 2. Create Workbook
    const workbook = XLSX.utils.book_new();

    // Add Sheets
    const sheetsData = [
      { name: "Customers", data: formatForExcel(customers) },
      { name: "Customer Contacts", data: formatForExcel(customerContacts, 'customer_contacts') },
      { name: "Suppliers", data: formatForExcel(suppliers) },
      { name: "Supplier Contacts", data: formatForExcel(supplierContacts, 'supplier_contacts') },
      { name: "Supplier Bank Accounts", data: formatForExcel(supplierBankAccounts, 'supplier_bank_accounts') },
      { name: "Products", data: formatForExcel(products) },
      { name: "AppConfig", data: formatForExcel(appConfigs) },
    ];

    for (const sheet of sheetsData) {
      const worksheet = XLSX.utils.json_to_sheet(sheet.data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    }

    // 3. Generate Buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="MasterData_Export_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Master Export error:", error);
    return NextResponse.json({ error: error.message || "Export failed" }, { status: 500 });
  }
}
