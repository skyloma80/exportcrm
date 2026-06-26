import { NextRequest, NextResponse } from "next/server"
import { createServerPocketBase } from "@/lib/pocketbase/server"
import { setServerPB } from "@/lib/pocketbase/base-service"
import {
  productCostService,
  CreateProductCostInput,
  UpdatePriceInput,
} from "@/lib/pocketbase/services/product-costs"

export async function GET(request: NextRequest) {
  try {
    const pb = await createServerPocketBase()
    setServerPB(pb)

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("product")
    const supplierId = searchParams.get("supplier")
    const history = searchParams.get("history")

    if (productId && history === "true" && supplierId) {
      const costs = await productCostService.getHistory(productId, supplierId)
      return NextResponse.json(costs)
    }

    if (productId) {
      const costs = await productCostService.getCurrentByProduct(productId)
      return NextResponse.json(costs)
    }

    if (supplierId) {
      const costs = await productCostService.getCurrentBySupplier(supplierId)
      return NextResponse.json(costs)
    }

    const costs = await productCostService.getAllCurrent()
    return NextResponse.json(costs)
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 500
    return NextResponse.json(
      { error: error?.message || "Failed to fetch product costs", details: error?.data || null },
      { status }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const pb = await createServerPocketBase()
    setServerPB(pb)

    const body: CreateProductCostInput = await request.json()

    if (!body.product || !body.supplier) {
      return NextResponse.json({ error: "product and supplier are required" }, { status: 400 })
    }

    // If there's already an active cost for this product+supplier, archive it
    const existing = await productCostService.getCurrentByProduct(body.product)
    const active = existing.find((c) => c.supplier === body.supplier)
    if (active) {
      await productCostService.update(active.id, { valid_until: new Date().toISOString() })
    }

    const cost = await productCostService.create(body)
    return NextResponse.json(cost)
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 500
    return NextResponse.json(
      { error: error?.message || "Failed to create product cost", details: error?.data || null },
      { status }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const pb = await createServerPocketBase()
    setServerPB(pb)

    const body = await request.json()
    const { id, ...data }: { id: string } & UpdatePriceInput = body

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    const result = await productCostService.updatePrice(id, data)
    return NextResponse.json(result)
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 500
    return NextResponse.json(
      { error: error?.message || "Failed to update product cost", details: error?.data || null },
      { status }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const pb = await createServerPocketBase()
    setServerPB(pb)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    await productCostService.delete(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 500
    return NextResponse.json(
      { error: error?.message || "Failed to delete product cost", details: error?.data || null },
      { status }
    )
  }
}
