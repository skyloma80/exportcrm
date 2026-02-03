/**
 * Supplier Export API Route
 * 供应商导出 API
 */

import { NextResponse } from "next/server"
import * as XLSX from "xlsx"
import PocketBase from "pocketbase"
import { cookies } from "next/headers"
import { Supplier } from "@/lib/pocketbase/services/suppliers"

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

export async function GET() {
  try {
    const pb = await createServerPocketBase()
    
    // Fetch all suppliers
    const suppliers = await pb.collection("suppliers").getFullList<Supplier>({
      sort: "-created",
    })

    // Transform data for Excel
    const excelData = suppliers.map((supplier) => ({
      "Code": supplier.code,
      "Name (EN)": supplier.name,
      "Name (CN)": supplier.name_cn || "",
      "Country": supplier.country,
      "Type": supplier.type,
      "Rating": supplier.rating || "",
      "Address (EN)": supplier.address || "",
      "Address (CN)": supplier.address_cn || "",
      "Capabilities": (supplier.capabilities || []).join(", "),
      "Certifications": (supplier.certifications || []).join(", "),
      "Remarks": supplier.remarks || "",
      "Created": supplier.created,
      "Updated": supplier.updated,
    }))

    // Create workbook
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(excelData)

    // Set column widths
    worksheet["!cols"] = [
      { wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 10 },
      { wch: 15 }, { wch: 8 }, { wch: 40 }, { wch: 40 },
      { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 20 }, { wch: 20 },
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, "Suppliers")

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

    // Return as file download
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="suppliers_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    })
  } catch (error: any) {
    console.error("Export error:", error)
    return NextResponse.json(
      { error: error.message || "Export failed" },
      { status: 500 }
    )
  }
}
