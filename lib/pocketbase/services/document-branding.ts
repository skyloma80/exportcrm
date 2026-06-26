import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';

export interface DocumentBranding extends RecordModel {
  company_name?: string;
  company_name_cn?: string;
  website_url?: string;
  vat?: string;
  logo_base64?: string;
  logo_url?: string;
  stamp_base64?: string;
  signature_base64?: string;
  logo_path?: string;
  stamp_path?: string;
  primary_office?: any;
  secondary_office?: any;
  default_signer?: any;
}

class DocumentBrandingService extends BaseCollectionService<DocumentBranding> {
  constructor() {
    super('document_branding');
  }

  async getFirst(): Promise<DocumentBranding | null> {
    const records = await this.getFullList({ sort: '' });
    return records.length > 0 ? records[0] : null;
  }

  async save(data: Partial<DocumentBranding>): Promise<DocumentBranding> {
    const existing = await this.getFirst();
    if (existing) {
      return this.update(existing.id, data);
    }
    return this.create(data as any);
  }
}

export const documentBrandingService = new DocumentBrandingService();
export default documentBrandingService;
