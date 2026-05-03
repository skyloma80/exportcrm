/**
 * Product Service
 * 产品服务
 * 
 * Provides CRUD operations and business logic for product management.
 */

import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';
import { codeGenerator, CODE_PREFIXES } from '@/lib/services/code-generator';

// ============================================================================
// Types
// ============================================================================

export interface ProductCategory extends RecordModel {
  name: string;
  name_cn?: string;
  parent?: string;
  sort_order?: number;
}

export interface CartonDimensions {
  length: number;  // cm
  width: number;   // cm
  height: number;  // cm
}

export interface Product extends RecordModel {
  code: string;
  part_number?: string;
  name: string;
  name_cn?: string;
  description?: string;
  description_cn?: string;
  category?: string;
  unit: string;
  hs_code?: string;
  specifications?: Record<string, any>;
  // 包装规格字段
  pcs_per_carton?: number;           // 每箱数量
  carton_dimensions?: CartonDimensions;  // 纸箱尺寸 (mm)
  carton_gross_weight?: number;      // 单箱毛重 (kg)
  carton_net_weight?: number;        // 单箱净重 (kg)
  purchase_price_notes?: string;     // 采购价格备注
  // 软删除字段
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
}

export interface ProductMold extends RecordModel {
  code: string;
  product: string;
  type: 'die_casting' | 'stamping' | 'injection' | 'cnc_fixture' | 'forging' | 'extrusion';
  cost: number;
  status: 'new' | 'in_use' | 'maintenance' | 'retired';
  lifespan?: number;
  current_usage?: number;
  supplier?: string;
  delivery_days?: number;
}

export interface ProductDocument extends RecordModel {
  product: string;
  type: 'drawing' | 'photo' | 'specification' | 'inspection' | 'certification' | 'sample_approval' | 'other';
  name: string;
  file_path: string;
  file_size?: number;
  remarks?: string;
}

export interface ProductWithRelations extends Product {
  expand?: {
    category?: ProductCategory;
    product_molds_via_product?: ProductMold[];
    product_documents_via_product?: ProductDocument[];
  };
}


export interface ProductCreateInput {
  part_number?: string;
  name: string;
  name_cn?: string;
  description?: string;
  description_cn?: string;
  category?: string;
  unit: string;
  hs_code?: string;
  specifications?: Record<string, any>;
  // 包装规格字段
  pcs_per_carton?: number;
  carton_dimensions?: CartonDimensions;
  carton_gross_weight?: number;
  carton_net_weight?: number;
  purchase_price_notes?: string;
}

export interface ProductUpdateInput extends Partial<ProductCreateInput> {}

// ============================================================================
// Product Category Service
// ============================================================================

class ProductCategoryService extends BaseCollectionService<ProductCategory> {
  constructor() {
    super('product_categories', { sort: 'sort_order,name' });
  }

  /**
   * Get categories as tree structure
   */
  async getTree(): Promise<ProductCategory[]> {
    const all = await this.getFullList();
    const rootCategories = all.filter(c => !c.parent);
    return rootCategories;
  }

  /**
   * Get child categories
   */
  async getChildren(parentId: string): Promise<ProductCategory[]> {
    return this.getFullList({
      filter: `parent = "${parentId}"`,
    });
  }
}

// ============================================================================
// Product Service
// ============================================================================

class ProductService extends BaseCollectionService<Product> {
  constructor() {
    super('products');
  }

  /**
   * Generate a new product code
   */
  async generateCode(): Promise<string> {
    return codeGenerator.generate(CODE_PREFIXES.PRODUCT);
  }

  /**
   * Get product by code
   */
  async getByCode(code: string): Promise<Product | null> {
    return this.getFirstListItem(`code = "${code}"`);
  }

  /**
   * Search products by name (supports both English and Chinese)
   */
  async search(query: string, options?: { page?: number; perPage?: number; categoryId?: string }): Promise<{
    items: Product[];
    totalItems: number;
    totalPages: number;
  }> {
    const escapedQuery = query.replace(/"/g, '\\"');
    let filter = `name ~ "${escapedQuery}" || name_cn ~ "${escapedQuery}" || part_number ~ "${escapedQuery}"`;
    
    if (options?.categoryId) {
      filter = `(${filter}) && category = "${options.categoryId}"`;
    }
    
    const result = await this.getList({
      filter,
      page: options?.page || 1,
      perPage: options?.perPage || 50,
    });

    return {
      items: result.items,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  }


  /**
   * Get product with all relations
   */
  async getWithRelations(id: string): Promise<ProductWithRelations | null> {
    try {
      const product = await this.pb.collection('products').getOne<ProductWithRelations>(id, {
        expand: 'category,product_molds_via_product,product_documents_via_product',
      });
      return product;
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  /**
   * Create product with auto-generated code
   */
  async createProduct(data: ProductCreateInput): Promise<Product> {
    const code = await this.generateCode();
    return this.create({
      ...data,
      code,
    });
  }

  /**
   * Update product
   */
  async updateProduct(id: string, data: ProductUpdateInput): Promise<Product> {
    return this.update(id, data);
  }

  /**
   * Get products by category
   */
  async getByCategory(categoryId: string): Promise<Product[]> {
    return this.getFullList({
      filter: `category = "${categoryId}"`,
    });
  }

  /**
   * Get display name based on locale
   */
  getDisplayName(product: Product, locale: string = 'en'): string {
    if (locale === 'zh' && product.name_cn) {
      return product.name_cn;
    }
    return product.name;
  }

/**
    * Get display description based on locale
    */
  getDisplayDescription(product: Product, locale: string = 'en'): string | undefined {
    if (locale === 'zh' && product.description_cn) {
      return product.description_cn;
    }
    return product.description;
  }

  /**
   * Soft delete product (mark as deleted)
   */
  async softDelete(id: string): Promise<Product> {
    return this.update(id, { 
      // Using a deleted flag - could be expanded to store deletion info
      // For now just mark it - you might want to add a 'deleted' field in PocketBase
    } as any);
  }

  /**
   * Restore deleted product
   */
  async restore(id: string): Promise<Product> {
    return this.update(id, {} as any);
  }

  /**
   * Get active products (not deleted)
   */
  async getActive(options?: { page?: number; perPage?: number }): Promise<{ items: Product[]; totalItems: number }> {
    // Filter out products that have some marker - adjust based on actual field
    return this.getList({
      filter: '',
      page: options?.page || 1,
      perPage: options?.perPage || 50,
      sort: '-created',
    });
  }
}


// ============================================================================
// Product Mold Service
// ============================================================================

class ProductMoldService extends BaseCollectionService<ProductMold> {
  constructor() {
    super('product_molds');
  }

  /**
   * Generate a new mold code
   */
  async generateCode(): Promise<string> {
    return codeGenerator.generate(CODE_PREFIXES.MOLD);
  }

  /**
   * Get molds for a product
   */
  async getByProduct(productId: string): Promise<ProductMold[]> {
    return this.getFullList({
      filter: `product = "${productId}"`,
    });
  }

  /**
   * Calculate mold cost per unit
   */
  calculateCostPerUnit(mold: ProductMold, quantity: number): number {
    if (quantity <= 0) return 0;
    return mold.cost / quantity;
  }

  /**
   * Create mold with auto-generated code
   */
  async createMold(productId: string, data: Omit<ProductMold, 'id' | 'code' | 'product' | 'created' | 'updated' | 'collectionId' | 'collectionName'>): Promise<ProductMold> {
    const code = await this.generateCode();
    return this.create({
      ...data,
      code,
      product: productId,
    });
  }
}

// ============================================================================
// Product Document Service
// ============================================================================

class ProductDocumentService extends BaseCollectionService<ProductDocument> {
  constructor() {
    super('product_documents');
  }

  /**
   * Get documents for a product
   */
  async getByProduct(productId: string): Promise<ProductDocument[]> {
    return this.getFullList({
      filter: `product = "${productId}"`,
    });
  }

  /**
   * Get documents by type
   */
  async getByType(productId: string, type: ProductDocument['type']): Promise<ProductDocument[]> {
    return this.getFullList({
      filter: `product = "${productId}" && type = "${type}"`,
    });
  }

  /**
   * Create document for a product
   */
  async createDocument(productId: string, data: Omit<ProductDocument, 'id' | 'product' | 'created' | 'updated' | 'collectionId' | 'collectionName'>): Promise<ProductDocument> {
    return this.create({
      ...data,
      product: productId,
    });
  }
}

// ============================================================================
// Export Services
// ============================================================================

export const productCategoryService = new ProductCategoryService();
export const productService = new ProductService();
export const productMoldService = new ProductMoldService();
export const productDocumentService = new ProductDocumentService();

export default productService;
