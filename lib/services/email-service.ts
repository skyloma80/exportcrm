/**
 * Email Service
 * 邮件服务
 * 
 * Provides email sending functionality using user's personal SMTP settings.
 * 使用用户个人SMTP配置发送邮件。
 */

import nodemailer from 'nodemailer';
import type PocketBase from 'pocketbase';
import { createServerPB } from '@/lib/pocketbase/auth';
import { createStorage } from '@/lib/s3/storage';
import { brandingService } from '@/lib/services/branding-service';
import { generateBrandedEmailHTML, generateRFQEmailContent } from '@/lib/email/branded-template';

// ============================================================================
// Types
// ============================================================================

export interface EmailAttachment {
  filename?: string;
  name?: string;
  path?: string;
  content?: Buffer | Uint8Array;
  contentType?: string;
  type?: string;
  size?: number;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

export interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
}

export interface RFQEmailData {
  rfqNumber: string;
  issueDate: string;
  responseDeadline: string;
  itemCount?: number; // Number of items (for summary display)
  projectDescription?: string; // Project description to include in email
  items?: Array<{
    product_name: string;
    description?: string;
    quantity: number;
    unit: string;
  }>;
  specialInstructions?: string;
  attachments?: Array<{
    name: string;
    path: string;
    content?: string; // Base64 encoded content for inline attachments
    type?: string;
    size?: number;
  }>;
}

export interface EmailTemplateOptions {
  companyName?: string;
  subject?: string;
  greeting?: string;
  intro?: string;
  closing?: string;
  signature?: string;
  footer?: string;
  recipientName?: string; // 收件人名称（供应商公司名）
}


// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get MIME type from file extension
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    // Text
    txt: 'text/plain',
    csv: 'text/csv',
    
    // Archives
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    
    // CAD
    dwg: 'application/acad',
    dxf: 'application/dxf',
    step: 'application/step',
    stp: 'application/step',
    iges: 'application/iges',
    igs: 'application/iges',
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Validate email format
 */
function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  return { valid: true };
}

// ============================================================================
// Email Service Class
// ============================================================================

export class EmailService {
  private settings: SmtpSettings | null = null;
  private defaultTemplateSettings = {
    subject: '报价邀请函: {rfq_number}',
    greeting: '尊敬的供应商，您好！',
    intro: '我们诚邀您为以下项目提供报价：',
    closing: '请在截止日期前提供您的最优报价，如有疑问请随时联系我们。',
    signature: '此致敬礼！',
    companyName: '贵公司',
    footer: '期待您的及时回复！如有任何疑问，欢迎随时联系我们。'
  };

  constructor(settings?: SmtpSettings) {
    if (settings) {
      this.settings = settings;
    }
  }

  /**
   * Load SMTP settings from user_settings table
   */
  async loadSettings(userId: string, pb?: PocketBase): Promise<void> {
    // Use provided pb instance or create a new one (for backward compatibility)
    const pbClient = pb || createServerPB();
    
    console.log('[EmailService] Loading SMTP settings for user:', userId);

    try {
      const settings = await pbClient.collection('user_settings').getFirstListItem(
        `user_id = "${userId}"`,
        { fields: 'smtp_host,smtp_port,smtp_user,smtp_pass,smtp_from,smtp_secure' }
      );

      if (!settings || !settings.smtp_host || !settings.smtp_user || !settings.smtp_pass) {
        console.error('[EmailService] SMTP settings incomplete:', {
          hasSettings: !!settings,
          hasHost: !!settings?.smtp_host,
          hasUser: !!settings?.smtp_user,
          hasPass: !!settings?.smtp_pass,
        });
        throw new Error('SMTP settings not configured. Please configure email settings in User Settings page.');
      }

      this.settings = {
        host: settings.smtp_host,
        port: settings.smtp_port || 587,
        user: settings.smtp_user,
        pass: settings.smtp_pass,
        from: settings.smtp_from || settings.smtp_user,
        secure: settings.smtp_secure !== false,
      };

      console.log('[EmailService] SMTP settings loaded:', {
        host: this.settings.host,
        port: this.settings.port,
        user: this.settings.user,
        from: this.settings.from,
        secure: this.settings.secure,
      });
    } catch (error: any) {
      if (error.message?.includes('SMTP settings not configured')) {
        throw error;
      }
      console.error('[EmailService] Failed to load SMTP settings:', error);
      throw new Error(`Failed to load SMTP settings: ${error.message}`);
    }
  }

  /**
   * Download file from S3 storage
   */
  private async downloadFromS3(path: string): Promise<Buffer | null> {
    try {
      const storage = createStorage();
      const { data, error } = await storage.download(path);
      
      if (error || !data) {
        console.error('[EmailService] Failed to download from S3:', path, error);
        return null;
      }
      
      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('[EmailService] S3 download error:', error);
      return null;
    }
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    console.log('[EmailService] Sending email:', {
      to: options.to,
      subject: options.subject,
      attachmentsCount: options.attachments?.length || 0
    });
    
    // Validate recipient email
    const emailValidation = validateEmail(options.to);
    if (!emailValidation.valid) {
      console.error(`[EmailService] Invalid recipient email: ${options.to} - ${emailValidation.error}`);
      return { 
        success: false, 
        error: `Invalid recipient email: ${emailValidation.error}` 
      };
    }

    if (!this.settings) {
      console.error('[EmailService] SMTP settings not configured');
      return { success: false, error: 'SMTP settings not configured' };
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: this.settings.host,
      port: this.settings.port,
      secure: this.settings.secure,
      auth: {
        user: this.settings.user,
        pass: this.settings.pass,
      },
    });

    try {
      // Process attachments
      const attachments = [];
      if (options.attachments?.length) {
        console.log('[EmailService] Processing attachments:', options.attachments.length);

        for (const attachment of options.attachments) {
          try {
            const fileName = attachment.filename || attachment.name || 'attachment';
            const contentType = attachment.contentType || attachment.type || getMimeType(fileName);
            
            // If content is already provided
            if (attachment.content) {
              const contentBuffer = Buffer.isBuffer(attachment.content) 
                ? attachment.content 
                : Buffer.from(attachment.content);
                
              attachments.push({
                filename: fileName,
                content: contentBuffer,
                contentType: contentType
              });
              console.log(`[EmailService] Added buffer attachment: ${fileName}`);
              continue;
            }
            
            // If path is provided, download from S3
            if (attachment.path) {
              console.log(`[EmailService] Downloading attachment from S3: ${attachment.path}`);
              const content = await this.downloadFromS3(attachment.path);
              
              if (content) {
                attachments.push({
                  filename: fileName,
                  content: content,
                  contentType: contentType
                });
                console.log(`[EmailService] Added S3 attachment: ${fileName}`);
              } else {
                console.warn(`[EmailService] Failed to download attachment: ${attachment.path}`);
              }
            }
          } catch (error) {
            console.error('[EmailService] Error processing attachment:', error);
          }
        }
      }

      // Send email
      const mailOptions = {
        from: `"${this.settings.from.split('@')[0]}" <${this.settings.from}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: attachments
      };
      
      console.log(`[EmailService] Sending to: ${options.to}`);
      
      const info = await transporter.sendMail(mailOptions);
      console.log('[EmailService] Email sent successfully:', info.messageId);

      return { success: true };
    } catch (error) {
      console.error('[EmailService] Error sending email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Send RFQ email to supplier
   */
  async sendRfqToSupplier(
    supplierEmail: string,
    rfqData: RFQEmailData,
    templateOptions?: EmailTemplateOptions,
    overrideBranding?: { logoUrl?: string }
  ): Promise<{ success: boolean; error?: string }> {
    console.log(`[EmailService.sendRfqToSupplier] Sending RFQ to: ${supplierEmail}`);
    console.log(`[EmailService.sendRfqToSupplier] RFQ Number: ${rfqData.rfqNumber}`);
    
    const { rfqNumber, issueDate, responseDeadline, itemCount, projectDescription, specialInstructions, attachments } = rfqData;
    
    // Merge template settings
    const templateSettings = {
      ...this.defaultTemplateSettings,
      ...templateOptions,
    };

    // Get branding config for supplier documents (Chinese)
    let branding;
    try {
      brandingService.clearCache();
      branding = await brandingService.getDocumentBranding('supplier');
      
      if (overrideBranding?.logoUrl && !branding.logoUrl) {
        branding.logoUrl = overrideBranding.logoUrl;
      }
      
      console.log('[EmailService] Branding loaded:', {
        hasLogoBase64: !!branding.logoBase64,
        logoUrl: branding.logoUrl || 'NOT SET',
        companyName: branding.companyName,
      });
    } catch (error) {
      console.warn('[EmailService] Failed to get branding config, using default template', error);
    }

    // Format date in Chinese
    const formatDateCN = (date: string) => {
      const d = new Date(date);
      return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    };

    let html: string;

    if (branding) {
      // Use branded template - summary only, no product table
      const bodyContent = generateRFQEmailContent({
        rfqCode: rfqNumber,
        issueDate: formatDateCN(issueDate),
        deadline: formatDateCN(responseDeadline),
        itemCount: itemCount || 0,
        projectDescription,
      });

      // Add special instructions if any
      const fullBodyContent = `
        ${bodyContent}
        ${specialInstructions ? `<div style="margin-top: 15px; padding: 12px 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;"><strong style="color: #92400e;">特殊要求:</strong><br><span style="color: #78350f;">${specialInstructions}</span></div>` : ''}
      `;

      // Determine attachment hint
      const hasPdf = attachments?.some(a => a.name?.endsWith('.pdf'));
      const hasExcel = attachments?.some(a => a.name?.endsWith('.xlsx'));
      let attachmentNote: string | undefined;
      if (hasPdf && hasExcel) {
        attachmentNote = 'rfq_with_template'; // PDF + Excel template
      } else if (hasPdf) {
        attachmentNote = 'pdf';
      } else if (hasExcel) {
        attachmentNote = 'excel_template';
      } else if (attachments?.length) {
        attachmentNote = 'attachments';
      }

      html = generateBrandedEmailHTML({
        branding,
        language: 'cn',
        subject: templateSettings.subject.replace('{rfq_number}', rfqNumber),
        bodyContent: fullBodyContent,
        recipientName: templateSettings.recipientName,
        attachmentNote,
      });
    } else {
      // Fallback to original template - summary only, no product table
      const greeting = templateSettings.recipientName
        ? `尊敬的${templateSettings.recipientName}，您好！`
        : templateSettings.greeting;

      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${templateSettings.subject}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 650px; margin: 0 auto; padding: 20px; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 25px; background-color: #fff; }
            .info-box { background-color: #f8fafc; border-radius: 8px; padding: 15px 20px; margin: 15px 0; }
            .info-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
            .info-item:last-child { border-bottom: none; }
            .info-label { color: #64748b; font-size: 14px; }
            .info-value { color: #1e293b; font-size: 14px; font-weight: 500; }
            .footer { margin-top: 25px; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; background-color: #f8fafc; border-radius: 0 0 8px 8px; }
            .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${templateSettings.companyName}</h1>
            </div>
            
            <div class="content">
              <p style="font-size: 15px; color: #334155;">${greeting}</p>
              
              <p style="font-size: 14px; color: #475569;">${templateSettings.intro}</p>
              
              <div class="info-box">
                <div class="info-item">
                  <span class="info-label">询价单号</span>
                  <span class="info-value">${rfqNumber}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">发布日期</span>
                  <span class="info-value">${new Date(issueDate).toLocaleDateString('zh-CN')}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">回复截止</span>
                  <span class="info-value" style="color: #dc2626;">${new Date(responseDeadline).toLocaleDateString('zh-CN')}</span>
                </div>
                ${itemCount ? `
                <div class="info-item">
                  <span class="info-label">产品数量</span>
                  <span class="info-value">${itemCount} 个产品</span>
                </div>
                ` : ''}
              </div>
              
              <p style="font-size: 14px; color: #475569; margin: 15px 0;">详情请查看附件中的报价模板。</p>
              
              ${specialInstructions ? `<div style="margin-top: 15px; padding: 12px 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;"><strong style="color: #92400e;">特殊要求:</strong><br><span style="color: #78350f;">${specialInstructions}</span></div>` : ''}
              
              <p style="font-size: 14px; color: #475569; margin-top: 20px;">${templateSettings.closing}</p>
              
              <div class="signature">
                <p style="margin: 0; color: #334155;">${templateSettings.signature}</p>
                <p style="margin: 5px 0 0 0; font-weight: 600; color: #1e293b;">${templateSettings.companyName}</p>
              </div>
            </div>
            
            <div class="footer">
              <p style="margin: 0;">${templateSettings.footer}</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    // Prepare attachments
    const emailAttachments: EmailAttachment[] = [];
    
    if (attachments && attachments.length > 0) {
      console.log(`[EmailService] Preparing ${attachments.length} attachments`);
      
      for (const file of attachments) {
        const attachment: EmailAttachment = {
          filename: file.name,
          path: file.path,
          type: file.type || getMimeType(file.name),
          size: file.size
        };
        
        // Handle base64 content (e.g., auto-generated quotation template)
        if (file.content) {
          // Convert base64 string to Buffer
          attachment.content = Buffer.from(file.content, 'base64');
          console.log(`[EmailService] Added inline attachment: ${file.name} (${attachment.content.length} bytes)`);
        }
        
        emailAttachments.push(attachment);
      }
    }

    return this.sendEmail({
      to: supplierEmail,
      subject: templateSettings.subject.replace('{rfq_number}', rfqNumber),
      html,
      attachments: emailAttachments,
    });
  }

  /**
   * Test SMTP connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.settings) {
      return { success: false, error: 'SMTP settings not configured' };
    }

    try {
      const transporter = nodemailer.createTransport({
        host: this.settings.host,
        port: this.settings.port,
        secure: this.settings.secure,
        auth: {
          user: this.settings.user,
          pass: this.settings.pass,
        },
      });

      await transporter.verify();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }
}

/**
 * Create email service instance with user settings
 */
export async function createEmailService(userId: string, pb?: PocketBase): Promise<EmailService> {
  const service = new EmailService();
  await service.loadSettings(userId, pb);
  return service;
}

export default EmailService;
