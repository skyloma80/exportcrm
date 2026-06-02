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

/**
 * 获取订单文档列表
 * @description 根据类型（order/po/shipment）获取订单相关的文档文件列表
 * @param id {string} 订单ID
 * @param type {string} 文档类型：order（订单文档）、po（采购订单文档）、shipment（发货文档）
 * @param poId {string} 采购订单ID（type为po时必填）
 * @param shipmentId {string} 发货单ID（type为shipment时必填）
 * @param docType {string} 文档子类型
 * @response 200:DocumentSchema:文档列表
 * @response 400 请求参数错误
 * @response 404 资源未找到
 * @response 500 服务器错误
 */
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
    const order = await pb.collection("so").getOne<any>(id, {
      expand: "project_id,customer_id",
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
      const po = await pb.collection("po").getOne<PurchaseOrder>(poId, {
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
        sort: "id",
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
    const status = error.status || 500
    const message = error.message || "Failed to load documents"
    return NextResponse.json(
      { error: message, details: error.data || {} },
      { status }
    )
  }
}

/**
 * 上传订单文档
 * @description 上传文件到订单的指定文档类型目录
 * @param id {string} 订单ID
 * @response 200:SuccessResponse:上传成功，返回文件路径
 * @response 400 请求参数错误（缺少文件或文档类型）
 * @response 500 服务器错误
 */
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
    const order = await pb.collection("so").getOne<any>(id, {
      expand: "project_id,customer_id",
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
