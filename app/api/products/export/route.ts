/**
 * Product Export API Route
 */

import { NextResponse } from "next/server"
import * as XLSX from "xlsx"
import PocketBase from "pocketbase"
import { cookies } from "next/headers"
import { Product } from "@/lib/pocketbase/services/products"

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

export async function GET() {
  try {
    const pb = await createServerPocketBase()
    const products = await pb.collection("products").getFullList<Product>({ sort: "-created", expand: "category" })

    const excelData = products.map((product) => ({
      "Code": product.code,
      "Part Number": product.part_number || "",
      "Name (EN)": product.name,
      "Name (CN)": product.name_cn || "",
      "Category": (product as any).expand?.category?.name || "",
      "Unit": product.unit,
      "HS Code": product.hs_code || "",
      "Description (EN)": product.description || "",
      "Description (CN)": product.description_cn || "",
      "Created": product.created,
      "Updated": product.updated,
    }))

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    worksheet["!cols"] = [{ wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 40 }, { wch: 40 }, { wch: 20 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products")

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="products_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    })
  } catch (error: any) {
    console.error("Export error:", error)
    return NextResponse.json({ error: error.message || "Export failed" }, { status: 500 })
  }
}
