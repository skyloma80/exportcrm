import { RecordModel } from "pocketbase"
import { BaseCollectionService } from "../base-service"

export interface ProductCostTier {
  minQty: number
  maxQty: number | null
  unitPrice: number
}

export interface ProductCost extends RecordModel {
  product: string
  supplier: string
  currency: string
  moq?: number
  lead_time_days?: number
  tiers?: ProductCostTier[]
  is_preferred?: boolean
  valid_from: string
  valid_until?: string | null
  remarks?: string
}

export interface ProductCostWithExpand extends ProductCost {
  expand?: {
    product?: {
      id: string
      code: string
      name: string
      name_cn?: string
      unit: string
    }
    supplier?: {
      id: string
      code: string
      name: string
      name_cn?: string
    }
  }
}

export interface CreateProductCostInput {
  product: string
  supplier: string
  currency?: string
  moq?: number
  lead_time_days?: number
  tiers?: ProductCostTier[]
  is_preferred?: boolean
  remarks?: string
}

export interface UpdatePriceInput {
  currency?: string
  moq?: number
  lead_time_days?: number
  tiers?: ProductCostTier[]
  is_preferred?: boolean
  remarks?: string
}

class ProductCostService extends BaseCollectionService<ProductCost> {
  constructor() {
    super("product_costs", { sort: "-valid_from" })
  }

  async getByProduct(productId: string): Promise<ProductCostWithExpand[]> {
    return this.pb.collection("product_costs").getFullList<ProductCostWithExpand>({
      filter: `product = "${productId}"`,
      sort: "-is_preferred, supplier, -valid_from",
      expand: "product,supplier",
    })
  }

  async getCurrentByProduct(productId: string): Promise<ProductCostWithExpand[]> {
    const all = await this.pb.collection("product_costs").getFullList<ProductCostWithExpand>({
      filter: `product = "${productId}"`,
      sort: "-valid_from",
      expand: "product,supplier",
    })
    return this.getLatestPerSupplier(all)
  }

  async getCurrentBySupplier(supplierId: string): Promise<ProductCostWithExpand[]> {
    const all = await this.pb.collection("product_costs").getFullList<ProductCostWithExpand>({
      filter: `supplier = "${supplierId}"`,
      sort: "-valid_from",
      expand: "product,supplier",
    })
    return this.getLatestPerProduct(all)
  }

  async getAllCurrent(options?: {
    productName?: string
    supplierId?: string
    categoryId?: string
    currency?: string
  }): Promise<ProductCostWithExpand[]> {
    const filters: string[] = []
    if (options?.supplierId) filters.push(`supplier = "${options.supplierId}"`)
    if (options?.currency) filters.push(`currency = "${options.currency}"`)
    if (options?.categoryId) {
      const products = await this.pb.collection("products").getFullList({
        filter: `category = "${options.categoryId}"`,
      })
      if (products.length === 0) return []
      const ids = products.map((p) => `"${p.id}"`).join(",")
      filters.push(`product:in [${ids}]`)
    }
    const all = await this.pb.collection("product_costs").getFullList<ProductCostWithExpand>({
      filter: filters.length > 0 ? filters.join(" && ") : undefined,
      sort: "-valid_from",
      expand: "product,supplier",
    })
    return this.getLatestPerSupplier(all)
  }

  private getLatestPerSupplier(records: ProductCostWithExpand[]): ProductCostWithExpand[] {
    const map = new Map<string, ProductCostWithExpand>()
    for (const r of records) {
      const key = `${r.product}|${r.supplier}`
      if (!map.has(key)) map.set(key, r)
    }
    return Array.from(map.values())
  }

  private getLatestPerProduct(records: ProductCostWithExpand[]): ProductCostWithExpand[] {
    const map = new Map<string, ProductCostWithExpand>()
    for (const r of records) {
      if (!map.has(r.product)) map.set(r.product, r)
    }
    return Array.from(map.values())
  }

  async create(input: CreateProductCostInput): Promise<ProductCost> {
    return this.pb.collection("product_costs").create<ProductCost>({
      product: input.product,
      supplier: input.supplier,
      currency: input.currency || "USD",
      moq: input.moq || 1,
      lead_time_days: input.lead_time_days,
      tiers: input.tiers || null,
      is_preferred: input.is_preferred || false,
      valid_from: new Date().toISOString(),
      remarks: input.remarks,
    })
  }

  async updatePrice(
    costId: string,
    input: UpdatePriceInput
  ): Promise<{ old: ProductCost; current: ProductCost }> {
    const existing = await this.getOne(costId)
    const now = new Date().toISOString()

    const old = await this.pb.collection("product_costs").update<ProductCost>(costId, {
      valid_until: now,
    })

    const current = await this.pb.collection("product_costs").create<ProductCost>({
      product: existing.product,
      supplier: existing.supplier,
      currency: input.currency || existing.currency,
      moq: input.moq ?? existing.moq,
      lead_time_days: input.lead_time_days ?? existing.lead_time_days,
      tiers: input.tiers ?? existing.tiers,
      is_preferred: input.is_preferred ?? existing.is_preferred,
      valid_from: now,
      remarks: input.remarks ?? existing.remarks,
    })

    return { old, current }
  }

  async getHistory(
    productId: string,
    supplierId: string
  ): Promise<ProductCostWithExpand[]> {
    return this.pb.collection("product_costs").getFullList<ProductCostWithExpand>({
      filter: `product = "${productId}" && supplier = "${supplierId}"`,
      sort: "-valid_from",
      expand: "product,supplier",
    })
  }
}

export const productCostService = new ProductCostService()
export default productCostService
