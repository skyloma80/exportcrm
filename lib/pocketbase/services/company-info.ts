import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';

export interface CompanyInfo extends RecordModel {
  company_name?: string;
  company_name_cn?: string;
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
}

class CompanyInfoService extends BaseCollectionService<CompanyInfo> {
  constructor() {
    super('company_info');
  }

  async getFirst(): Promise<CompanyInfo | null> {
    const records = await this.getFullList({ sort: '' });
    return records.length > 0 ? records[0] : null;
  }

  async save(data: Partial<CompanyInfo>): Promise<CompanyInfo> {
    const existing = await this.getFirst();
    if (existing) {
      return this.update(existing.id, data);
    }
    return this.create(data as any);
  }
}

export const companyInfoService = new CompanyInfoService();
export default companyInfoService;
