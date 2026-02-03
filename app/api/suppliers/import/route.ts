/**
 * Supplier Import API Route
 * 供应商导入 API
 */

import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import PocketBase from "pocketbase"
import { cookies } from "next/headers"
import { codeGenerator, CODE_PREFIXES } from "@/lib/services/code-generator"

async function createServerPocketBase(): Promise<PocketBase> {
  const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090')
  pb.autoCancellation(false)
  const cookieStore = await cookies()
  const pbAuthCookie = cookieStore.get('pb_auth')?.value
  if (pbAuthCookie) {
    try {
      pb.authStore.loadFromCookie(`pb_auth=${pbAuthCookie}`)
    } catch (e) {
      console.error('[Server PB] Failed to parse auth cookie:', e)
    }
  }
  return pb
}

interface ImportRow {
  "Code"?: string
  "Name (EN)": string
  "Name (CN)"?: string
  "Country": string
  "Type": string
  "Rating"?: string | number
  "Address (EN)"?: string
  "Address (CN)"?: string
  "Capabilities"?: string
  "Certifications"?: string
  "Remarks"?: string
}

interface ImportResult {
  total: number
  success: number
  failed: number
  created: number
  updated: number
  errors: Array<{ row: number; error: string }>
}

const VALID_TYPES = ["manufacturer", "trader", "agent"]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const updateExisting = formData.get("update_existing") === "true"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Read Excel file
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array" })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<ImportRow>(worksheet)

    if (rows.length === 0) {
      return NextResponse.json({ error: "No data found in file" }, { status: 400 })
    }

    const pb = await createServerPocketBase()
    const results: ImportResult = {
      total: rows.length,
      success: 0,
      failed: 0,
      created: 0,
      updated: 0,
      errors: [],
    }


    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // Excel row number (1-indexed + header)

      try {
        // Validate required fields
        if (!row["Name (EN)"]?.trim()) {
          throw new Error("Name (EN) is required")
        }
        if (!row["Country"]?.trim()) {
          throw new Error("Country is required")
        }
        if (!row["Type"]?.trim()) {
          throw new Error("Type is required")
        }

        const type = row["Type"].toLowerCase().trim()
        if (!VALID_TYPES.includes(type)) {
          throw new Error(`Invalid type: ${row["Type"]}. Must be one of: ${VALID_TYPES.join(", ")}`)
        }

        // Parse capabilities and certifications
        const capabilities = row["Capabilities"]
          ? row["Capabilities"].split(",").map(s => s.trim()).filter(Boolean)
          : []
        const certifications = row["Certifications"]
          ? row["Certifications"].split(",").map(s => s.trim()).filter(Boolean)
          : []

        // Parse rating
        let rating: number | undefined
        if (row["Rating"]) {
          const parsed = parseInt(String(row["Rating"]))
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
            rating = parsed
          }
        }

        // Prepare supplier data
        const supplierData = {
          name: row["Name (EN)"].trim(),
          name_cn: row["Name (CN)"]?.trim() || "",
          country: row["Country"].trim().toUpperCase(),
          type: type as "manufacturer" | "trader" | "agent",
          rating,
          address: row["Address (EN)"]?.trim() || "",
          address_cn: row["Address (CN)"]?.trim() || "",
          capabilities,
          certifications,
          remarks: row["Remarks"]?.trim() || "",
        }

        // Check if supplier exists by code
        let existingSupplier = null
        if (row["Code"]?.trim()) {
          try {
            const existing = await pb.collection("suppliers").getFirstListItem(
              `code = "${row["Code"].trim()}"`
            )
            existingSupplier = existing
          } catch {
            // Not found, will create new
          }
        }

        if (existingSupplier && updateExisting) {
          // Update existing supplier
          await pb.collection("suppliers").update(existingSupplier.id, supplierData)
          results.success++
          results.updated++
        } else if (!existingSupplier) {
          // Create new supplier with generated code
          const code = await codeGenerator.generate(CODE_PREFIXES.SUPPLIER, pb)
          await pb.collection("suppliers").create({
            ...supplierData,
            code,
          })
          results.success++
          results.created++
        } else {
          // Supplier exists but update not enabled
          throw new Error("Supplier with this code already exists")
        }
      } catch (error: any) {
        results.failed++
        results.errors.push({
          row: rowNum,
          error: error.message || "Unknown error",
        })
      }
    }

    return NextResponse.json({ results })
  } catch (error: any) {
    console.error("Import error:", error)
    return NextResponse.json(
      { error: error.message || "Import failed" },
      { status: 500 }
    )
  }
}
