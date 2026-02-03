/**
 * Product Import API Route
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
    try { pb.authStore.loadFromCookie(`pb_auth=${pbAuthCookie}`) } catch (e) { console.error(e) }
  }
  return pb
}

interface ImportRow {
  "Code"?: string
  "Part Number"?: string
  "Name (EN)": string
  "Name (CN)"?: string
  "Category"?: string
  "Unit": string
  "HS Code"?: string
  "Description (EN)"?: string
  "Description (CN)"?: string
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const updateExisting = formData.get("update_existing") === "true"

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array" })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<ImportRow>(worksheet)

    if (rows.length === 0) return NextResponse.json({ error: "No data found in file" }, { status: 400 })

    const pb = await createServerPocketBase()
    const results = { total: rows.length, success: 0, failed: 0, created: 0, updated: 0, errors: [] as Array<{ row: number; error: string }> }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2
      try {
        if (!row["Name (EN)"]?.trim()) throw new Error("Name (EN) is required")
        if (!row["Unit"]?.trim()) throw new Error("Unit is required")

        const productData = {
          part_number: row["Part Number"]?.trim() || "",
          name: row["Name (EN)"].trim(),
          name_cn: row["Name (CN)"]?.trim() || "",
          unit: row["Unit"].trim(),
          hs_code: row["HS Code"]?.trim() || "",
          description: row["Description (EN)"]?.trim() || "",
          description_cn: row["Description (CN)"]?.trim() || "",
        }

        let existingProduct = null
        if (row["Code"]?.trim()) {
          try {
            existingProduct = await pb.collection("products").getFirstListItem(`code = "${row["Code"].trim()}"`)
          } catch { /* Not found */ }
        }

        if (existingProduct && updateExisting) {
          await pb.collection("products").update(existingProduct.id, productData)
          results.success++
          results.updated++
        } else if (!existingProduct) {
          const code = await codeGenerator.generate(CODE_PREFIXES.PRODUCT, pb)
          await pb.collection("products").create({ ...productData, code })
          results.success++
          results.created++
        } else {
          throw new Error("Product with this code already exists")
        }
      } catch (error: any) {
        results.failed++
        results.errors.push({ row: rowNum, error: error.message || "Unknown error" })
      }
    }

    return NextResponse.json({ results })
  } catch (error: any) {
    console.error("Import error:", error)
    return NextResponse.json({ error: error.message || "Import failed" }, { status: 500 })
  }
}
