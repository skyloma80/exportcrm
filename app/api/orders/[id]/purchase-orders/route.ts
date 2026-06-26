/**
 * Order Purchase Orders API Route
 * 订单采购订单 API
 * 
 * POST - 从成本表生成采购订单
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerPocketBase } from "@/lib/pocketbase/server"
import { codeGenerator, CODE_PREFIXES } from "@/lib/services/code-generator"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * 从成本表生成采购订单
 * @description 根据项目的已确认成本表，按供应商分组自动生成采购订单及明细
 * @param id {string} 订单ID
 * @response 200:SuccessResponse:采购订单创建成功，返回生成的订单列表
 * @response 400 请求参数错误（订单无项目、无成本表或无供应商）
 * @response 401 未授权
 * @response 500 服务器错误
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: orderId } = await params
    const pb = await createServerPocketBase()

    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[PO Generation] Starting for order:", orderId)

    // 1. 获取订单信息
    const order = await pb.collection('so').getOne(orderId, {
      expand: "project",
    })

    console.log("[PO Generation] Order loaded:", {
      orderId: order.id,
      projectId: order.project,
      itemsCount: (order.items || []).length,
    })

    if (!order.project) {
      console.error("[PO Generation] Order has no project")
      return NextResponse.json(
        { error: "Order must be associated with a project" },
        { status: 400 }
      )
    }

    // 2. 获取项目成本表
    const costTableResult = await pb.collection("project_cost_tables").getList(1, 1, {
      filter: `project = "${order.project}" && status = "confirmed"`,
    })

    console.log("[PO Generation] Cost table query result:", {
      found: costTableResult.items.length,
      total: costTableResult.totalItems,
    })

    if (costTableResult.items.length === 0) {
      console.error("[PO Generation] No confirmed cost table found")
      return NextResponse.json(
        { error: "No confirmed cost table found for this project" },
        { status: 400 }
      )
    }

    const costTable = costTableResult.items[0]

    console.log("[PO Generation] Cost table found:", {
      id: costTable.id,
      status: costTable.status,
    })

    // 3. 获取成本表明细
    const costTableItems = await pb.collection("project_cost_table_items").getFullList({
      filter: `cost_table = "${costTable.id}"`,
      expand: "product,supplier",
    })

    console.log("[PO Generation] Cost table items:", {
      count: costTableItems.length,
      items: costTableItems.map(item => ({
        product: item.product,
        supplier: item.supplier,
        unitCost: item.unit_cost,
      })),
    })

    if (costTableItems.length === 0) {
      console.error("[PO Generation] Cost table has no items")
      return NextResponse.json(
        { error: "Cost table has no items" },
        { status: 400 }
      )
    }

    // 4. 按供应商分组
    const supplierGroups = new Map<string, any[]>()
    
    for (const item of costTableItems) {
      if (!item.supplier) {
        console.warn("[PO Generation] Item has no supplier:", item.id)
        continue
      }
      
      const supplierId = item.supplier
      if (!supplierGroups.has(supplierId)) {
        supplierGroups.set(supplierId, [])
      }
      supplierGroups.get(supplierId)!.push(item)
    }

    console.log("[PO Generation] Supplier groups:", {
      count: supplierGroups.size,
      suppliers: Array.from(supplierGroups.keys()),
    })

    if (supplierGroups.size === 0) {
      console.error("[PO Generation] No suppliers found in cost table")
      return NextResponse.json(
        { error: "No suppliers found in cost table" },
        { status: 400 }
      )
    }

    // 5. 为每个供应商创建采购订单
    const createdPOs: any[] = []

    console.log("[PO Generation] Creating purchase orders for", supplierGroups.size, "suppliers")

    for (const [supplierId, items] of supplierGroups.entries()) {
      console.log("[PO Generation] Processing supplier:", supplierId, "with", items.length, "items")

      // 生成采购订单编号
      const poCode = await codeGenerator.generate(CODE_PREFIXES.PURCHASE_ORDER, pb)

      // 计算总金额
      let totalAmount = 0
      const poItems: any[] = []

      for (const item of items) {
        // 从订单明细中找到对应的产品数量
        const orderItem = (order.items || []).find(
          (oi: any) => oi.product_name === item.product_name || oi.part_number === item.part_number
        )

        if (!orderItem) {
          console.warn("[PO Generation] No order item found for product:", item.product_name)
          continue
        }

        const quantity = orderItem.quantity
        const unitPrice = item.unit_price || 0
        
        if (unitPrice <= 0) {
          console.warn("[PO Generation] Product has zero or negative unit price:", {
            product: item.product,
            unitPrice: item.unit_price,
          })
          // 跳过单价为 0 的产品，或者您可以选择抛出错误
          continue
        }
        
        const amount = quantity * unitPrice

        totalAmount += amount

        console.log("[PO Generation] Item:", {
          product: item.product,
          quantity,
          unitPrice,
          amount,
        })

        poItems.push({
          product: item.product,
          quantity,
          unit_price: unitPrice,
          amount,
          lead_time_days: item.lead_time_days,
        })
      }

      if (poItems.length === 0) {
        console.warn("[PO Generation] No valid items for supplier:", supplierId, "(all items have zero cost)")
        continue
      }

      if (totalAmount <= 0) {
        console.warn("[PO Generation] Total amount is zero for supplier:", supplierId)
        continue
      }

      console.log("[PO Generation] Creating PO:", {
        code: poCode,
        supplier: supplierId,
        itemsCount: poItems.length,
        totalAmount,
      })

      // 创建采购订单
      const purchaseOrder = await pb.collection("po").create({
        code: poCode,
        project: order.project,
        supplier: supplierId,
        order: orderId,
        status: "draft",
        currency: costTable.currency || order.currency || "CNY",
        total_amount: totalAmount,
        paid_amount: 0,
      })

      console.log("[PO Generation] PO created:", purchaseOrder.id)

      // 创建采购订单明细
      for (const poItem of poItems) {
        await pb.collection("purchase_order_items").create({
          purchase_order: purchaseOrder.id,
          ...poItem,
        })
      }

      console.log("[PO Generation] PO items created:", poItems.length)

      createdPOs.push(purchaseOrder)
    }

    console.log("[PO Generation] Completed. Created", createdPOs.length, "purchase orders")

    return NextResponse.json({
      success: true,
      supplierCount: createdPOs.length,
      purchaseOrders: createdPOs.map(po => ({
        id: po.id,
        code: po.code,
      })),
    })
  } catch (error: any) {
    console.error("[PO Generation] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create purchase orders" },
      { status: 500 }
    )
  }
}
