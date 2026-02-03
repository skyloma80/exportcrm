/**
 * Project Service
 * 项目服务
 */

import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';
import { codeGenerator, CODE_PREFIXES } from '@/lib/services/code-generator';
import { Customer } from './customers';
import { Product } from './products';

// ============================================================================
// Types
// ============================================================================

export type ProjectStage = 'lead' | 'inquiry' | 'quotation' | 'negotiation' | 'won' | 'lost' | 'on_hold';

export interface Project extends RecordModel {
  code: string;
  name: string;
  name_cn?: string;
  customer: string;
  stage: ProjectStage;
  probability?: number;
  expected_close_date?: string;
  description?: string;
  description_cn?: string;
}

export interface ProductProject extends RecordModel {
  product: string;
  project: string;
  usage_note?: string;
}

export interface ProjectWithRelations extends Project {
  expand?: {
    customer?: Customer;
    products_projects_via_project?: (ProductProject & { expand?: { product?: Product } })[];
  };
}

export interface ProjectCreateInput {
  name: string;
  name_cn?: string;
  customer: string;
  stage: ProjectStage;
  probability?: number;
  expected_close_date?: string;
  description?: string;
  description_cn?: string;
}

export interface ProjectUpdateInput extends Partial<ProjectCreateInput> {}

export const PROJECT_STAGES: { value: ProjectStage; color: string }[] = [
  { value: 'lead', color: 'gray' },
  { value: 'inquiry', color: 'blue' },
  { value: 'quotation', color: 'yellow' },
  { value: 'negotiation', color: 'orange' },
  { value: 'won', color: 'green' },
  { value: 'lost', color: 'red' },
  { value: 'on_hold', color: 'purple' },
];


// ============================================================================
// Project Service
// ============================================================================

class ProjectService extends BaseCollectionService<Project> {
  constructor() {
    super('projects');
  }

  async generateCode(): Promise<string> {
    return codeGenerator.generate(CODE_PREFIXES.PROJECT);
  }

  async getByCode(code: string): Promise<Project | null> {
    return this.getFirstListItem(`code = "${code}"`);
  }

  async search(query: string, options?: { page?: number; perPage?: number; customerId?: string }): Promise<{
    items: Project[];
    totalItems: number;
    totalPages: number;
  }> {
    const escapedQuery = query.replace(/"/g, '\\"');
    let filter = `name ~ "${escapedQuery}" || name_cn ~ "${escapedQuery}"`;
    if (options?.customerId) {
      filter = `(${filter}) && customer = "${options.customerId}"`;
    }
    const result = await this.getList({
      filter,
      page: options?.page || 1,
      perPage: options?.perPage || 50,
    });
    return { items: result.items, totalItems: result.totalItems, totalPages: result.totalPages };
  }

  async getWithRelations(id: string): Promise<ProjectWithRelations | null> {
    try {
      const project = await this.pb.collection('projects').getOne<ProjectWithRelations>(id, {
        expand: 'customer,products_projects_via_project.product',
      });
      return project;
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  /**
   * Get all projects with customer expand
   */
  async getAllWithCustomer(): Promise<ProjectWithRelations[]> {
    return this.pb.collection('projects').getFullList<ProjectWithRelations>({
      sort: '-id',
      expand: 'customer',
    });
  }

  async createProject(data: ProjectCreateInput): Promise<Project> {
    const code = await this.generateCode();
    return this.create({ ...data, code });
  }

  async updateProject(id: string, data: ProjectUpdateInput): Promise<Project> {
    return this.update(id, data);
  }

  async getByCustomer(customerId: string): Promise<Project[]> {
    return this.getFullList({ filter: `customer = "${customerId}"` });
  }

  async getByStage(stage: ProjectStage): Promise<Project[]> {
    return this.getFullList({ filter: `stage = "${stage}"` });
  }

  getDisplayName(project: Project, locale: string = 'en'): string {
    if (locale === 'zh' && project.name_cn) return project.name_cn;
    return project.name;
  }

  getStageColor(stage: ProjectStage): string {
    return PROJECT_STAGES.find(s => s.value === stage)?.color || 'gray';
  }
}


// ============================================================================
// Product-Project Service
// ============================================================================

class ProductProjectService extends BaseCollectionService<ProductProject> {
  constructor() {
    super('products_projects');
  }

  async getByProject(projectId: string): Promise<ProductProject[]> {
    return this.getFullList({ filter: `project = "${projectId}"` });
  }

  async getByProduct(productId: string): Promise<ProductProject[]> {
    return this.getFullList({ filter: `product = "${productId}"` });
  }

  async addProductToProject(productId: string, projectId: string, usageNote?: string): Promise<ProductProject> {
    return this.create({ product: productId, project: projectId, usage_note: usageNote });
  }

  async removeProductFromProject(productId: string, projectId: string): Promise<boolean> {
    const record = await this.getFirstListItem(`product = "${productId}" && project = "${projectId}"`);
    if (record) {
      await this.delete(record.id);
      return true;
    }
    return false;
  }

  async isProductInProject(productId: string, projectId: string): Promise<boolean> {
    const record = await this.getFirstListItem(`product = "${productId}" && project = "${projectId}"`);
    return !!record;
  }
}

// ============================================================================
// Export Services
// ============================================================================

export const projectService = new ProjectService();
export const productProjectService = new ProductProjectService();

export default projectService;
