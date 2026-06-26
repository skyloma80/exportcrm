import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createServerPocketBase } from "@/lib/pocketbase/server";

/**
 * Master Data Import API Route
 * 全量数据导入接口
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const updateExisting = formData.get("update_existing") === "true";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const pb = await createServerPocketBase();

    const results: any = {
      customers: { total: 0, created: 0, updated: 0, failed: 0 },
      suppliers: { total: 0, created: 0, updated: 0, failed: 0 },
      products: { total: 0, created: 0, updated: 0, failed: 0 },
      app_config: { total: 0, created: 0, updated: 0, failed: 0 },
      contacts: { total: 0, created: 0, updated: 0, failed: 0 },
      bank_accounts: { total: 0, created: 0, updated: 0, failed: 0 },
      ports_of_destination: { total: 0, created: 0, updated: 0, failed: 0 },
      ports_of_loading: { total: 0, created: 0, updated: 0, failed: 0 },
      payment_terms: { total: 0, created: 0, updated: 0, failed: 0 },
      document_branding: { total: 0, created: 0, updated: 0, failed: 0 },
      company_info: { total: 0, created: 0, updated: 0, failed: 0 },
    };

    // Helper to parse JSON fields
    const parseItem = (item: any) => {
      const parsed: any = {};
      for (const [key, value] of Object.entries(item)) {
        if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
          try {
            parsed[key] = JSON.parse(value);
          } catch {
            parsed[key] = value;
          }
        } else {
          parsed[key] = value;
        }
      }
      return parsed;
    };

    // Helper for upsert
    async function upsert(collection: string, data: any, uniqueField: string, resultKey: string) {
      const uniqueValue = data[uniqueField];
      if (!uniqueValue) return;

      results[resultKey].total++;
      try {
        let existing = null;
        try {
          existing = await pb.collection(collection).getFirstListItem(`${uniqueField} = "${uniqueValue}"`);
        } catch { /* Not found */ }

        if (existing) {
          if (updateExisting) {
            await pb.collection(collection).update(existing.id, data);
            results[resultKey].updated++;
          }
        } else {
          await pb.collection(collection).create(data);
          results[resultKey].created++;
        }
      } catch (err) {
        console.error(`Error upserting ${collection} (${uniqueValue}):`, err);
        results[resultKey].failed++;
      }
    }

    // 1. Process Main Entities first
    const sheetMap: Record<string, { collection: string; uniqueField: string; resultKey: string }> = {
      "Customers": { collection: "customers", uniqueField: "code", resultKey: "customers" },
      "Suppliers": { collection: "suppliers", uniqueField: "code", resultKey: "suppliers" },
      "Products": { collection: "products", uniqueField: "code", resultKey: "products" },
      "AppConfig": { collection: "app_config", uniqueField: "key", resultKey: "app_config" },
      "Ports Of Destination": { collection: "ports_of_destination", uniqueField: "code", resultKey: "ports_of_destination" },
      "Ports Of Loading": { collection: "ports_of_loading", uniqueField: "code", resultKey: "ports_of_loading" },
      "Payment Terms": { collection: "payment_terms", uniqueField: "code", resultKey: "payment_terms" },
      "Document Branding": { collection: "document_branding", uniqueField: "id", resultKey: "document_branding" },
      "Company Info": { collection: "company_info", uniqueField: "id", resultKey: "company_info" },
    };

    for (const [sheetName, config] of Object.entries(sheetMap)) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) continue;

      const rows = XLSX.utils.sheet_to_json(worksheet);
      for (const row of rows) {
        const data = parseItem(row);
        // Remove system fields that shouldn't be manually set if creating
        delete data.id;
        delete data.created;
        delete data.updated;
        await upsert(config.collection, data, config.uniqueField, config.resultKey);
      }
    }

    // 2. Process Related Entities (Requires mapping parent codes to IDs)
    // We'll need to fetch IDs for the codes we just imported/updated
    const getParentId = async (collection: string, code: string) => {
      try {
        const record = await pb.collection(collection).getFirstListItem(`code = "${code}"`);
        return record.id;
      } catch {
        return null;
      }
    };

    // Customer Contacts
    if (workbook.Sheets["Customer Contacts"]) {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets["Customer Contacts"]);
      for (const row of rows as any) {
        results.contacts.total++;
        try {
          const data = parseItem(row);
          const parentId = await getParentId("customers", data.customer_code);
          if (!parentId) throw new Error(`Customer with code ${data.customer_code} not found`);
          
          data.customer = parentId;
          delete data.customer_code;
          delete data.id;
          delete data.created;
          delete data.updated;

          // Match contact by name and customer
          let existing = null;
          try {
            existing = await pb.collection("customer_contacts").getFirstListItem(`customer = "${parentId}" && name = "${data.name}"`);
          } catch {}

          if (existing) {
            if (updateExisting) {
              await pb.collection("customer_contacts").update(existing.id, data);
              results.contacts.updated++;
            }
          } else {
            await pb.collection("customer_contacts").create(data);
            results.contacts.created++;
          }
        } catch (err) {
          results.contacts.failed++;
        }
      }
    }

    // Supplier Contacts
    if (workbook.Sheets["Supplier Contacts"]) {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets["Supplier Contacts"]);
      for (const row of rows as any) {
        results.contacts.total++;
        try {
          const data = parseItem(row);
          const parentId = await getParentId("suppliers", data.supplier_code);
          if (!parentId) throw new Error(`Supplier with code ${data.supplier_code} not found`);
          
          data.supplier = parentId;
          delete data.supplier_code;
          delete data.id;
          delete data.created;
          delete data.updated;

          let existing = null;
          try {
            existing = await pb.collection("supplier_contacts").getFirstListItem(`supplier = "${parentId}" && name = "${data.name}"`);
          } catch {}

          if (existing) {
            if (updateExisting) {
              await pb.collection("supplier_contacts").update(existing.id, data);
              results.contacts.updated++;
            }
          } else {
            await pb.collection("supplier_contacts").create(data);
            results.contacts.created++;
          }
        } catch (err) {
          results.contacts.failed++;
        }
      }
    }

    // Supplier Bank Accounts
    if (workbook.Sheets["Supplier Bank Accounts"]) {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets["Supplier Bank Accounts"]);
      for (const row of rows as any) {
        results.bank_accounts.total++;
        try {
          const data = parseItem(row);
          const parentId = await getParentId("suppliers", data.supplier_code);
          if (!parentId) throw new Error(`Supplier with code ${data.supplier_code} not found`);
          
          data.supplier = parentId;
          delete data.supplier_code;
          delete data.id;
          delete data.created;
          delete data.updated;

          let existing = null;
          try {
            existing = await pb.collection("supplier_bank_accounts").getFirstListItem(`supplier = "${parentId}" && account_number = "${data.account_number}"`);
          } catch {}

          if (existing) {
            if (updateExisting) {
              await pb.collection("supplier_bank_accounts").update(existing.id, data);
              results.bank_accounts.updated++;
            }
          } else {
            await pb.collection("supplier_bank_accounts").create(data);
            results.bank_accounts.created++;
          }
        } catch (err) {
          results.bank_accounts.failed++;
        }
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Master Import error:", error);
    return NextResponse.json({ error: error.message || "Import failed" }, { status: 500 });
  }
}
