import { NextRequest, NextResponse } from "next/server"
import { createStorage } from "@/lib/s3/storage"
import { createServerPocketBase } from "@/lib/pocketbase/server"
import type { OrderWithExpand } from "@/lib/pocketbase/services/orders"
import { 
  ORDER_DOCUMENT_TYPES,
  SHIPMENT_DOCUMENT_TYPES,
  getOrderDocumentPath,
  getPODocumentPath,
  getShipmentDocumentPath,
  extractOrderPathInfo,
} from "@/lib/services/shipment-document-path"
import type { PurchaseOrder } from "@/lib/pocketbase/services/purchase-orders"
import type { Shipment } from "@/lib/pocketbase/services/shipments"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") // 'order' | 'po' | 'shipment'
    const poId = searchParams.get("poId")
    const shipmentId = searchParams.get("shipmentId")
    const docType = searchParams.get("docType")

    const pb = await createServerPocketBase()
    const storage = createStorage()

    // Load order with expand
    const order = await pb.collection("orders").getOne<OrderWithExpand>(id, {
      expand: "project,customer",
    })

    const pathInfo = extractOrderPathInfo(order)
    if (!pathInfo) {
      return NextResponse.json(
        { error: "Missing customer or project information" },
        { status: 400 }
      )
    }

    // Handle different document types
    if (type === "order") {
      // Load all order-level documents
      const docs: Record<string, any> = {}
      
      for (const dt of ORDER_DOCUMENT_TYPES) {
        const path = getOrderDocumentPath(pathInfo, dt)
        const { data: files } = await storage.list({ prefix: path, delimiter: "" })
        const realFiles = files.filter(f => !f.name.startsWith(".") && !f.isFolder && f.name !== '.keep')
        docs[dt] = realFiles
      }
      
      return NextResponse.json({ documents: docs })
    }

    if (type === "po" && poId) {
      // Load purchase order documents
      const po = await pb.collection("purchase_orders").getOne<PurchaseOrder>(poId, {
        expand: "supplier",
      })
      
      if (!po.expand?.supplier) {
        return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
      }
      
      const supplierName = po.expand.supplier.name
      const path = getPODocumentPath(pathInfo, supplierName)
      
      const { data: files } = await storage.list({ prefix: path, delimiter: "" })
      const realFiles = files.filter(f => !f.name.startsWith(".") && !f.isFolder && f.name !== '.keep')
      
      return NextResponse.json({ documents: realFiles })
    }

    if (type === "shipment" && shipmentId) {
      // Load shipment documents
      const shipments = await pb.collection("shipments").getFullList<Shipment>({
        filter: `order = "${id}"`,
        sort: "created",
      })
      
      const shipmentIndex = shipments.findIndex(s => s.id === shipmentId)
      if (shipmentIndex === -1) {
        return NextResponse.json({ error: "Shipment not found" }, { status: 404 })
      }
      
      const docs: Record<string, any> = {}
      
      for (const dt of SHIPMENT_DOCUMENT_TYPES) {
        const path = getShipmentDocumentPath(pathInfo, shipmentIndex + 1, dt)
        const { data: files } = await storage.list({ prefix: path, delimiter: "" })
        const realFiles = files.filter(f => !f.name.startsWith(".") && !f.isFolder && f.name !== '.keep')
        docs[dt] = realFiles
      }
      
      return NextResponse.json({ documents: docs })
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  } catch (error: any) {
    console.error("Error loading documents:", error)
    return NextResponse.json(
      { error: error.message || "Failed to load documents" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const formData = await request.formData()
    const file = formData.get("file") as File
    const docType = formData.get("docType") as string

    if (!file || !docType) {
      return NextResponse.json(
        { error: "Missing file or docType" },
        { status: 400 }
      )
    }

    const pb = await createServerPocketBase()
    const storage = createStorage()

    // Load order with expand
    const order = await pb.collection("orders").getOne<OrderWithExpand>(id, {
      expand: "project,customer",
    })

    const pathInfo = extractOrderPathInfo(order)
    if (!pathInfo) {
      return NextResponse.json(
        { error: "Missing customer or project information" },
        { status: 400 }
      )
    }

    // Upload file
    const path = getOrderDocumentPath(pathInfo, docType as any)
    const filePath = `${path}${file.name}`
    
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error } = await storage.upload(filePath, buffer, {
      contentType: file.type,
    })

    if (error) throw error

    return NextResponse.json({ success: true, path: filePath })
  } catch (error: any) {
    console.error("Error uploading document:", error)
    return NextResponse.json(
      { error: error.message || "Failed to upload document" },
      { status: 500 }
    )
  }
}
