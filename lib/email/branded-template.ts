/**
 * Branded Email HTML Template Generator
 * 品牌化邮件 HTML 模板生成器
 * 
 * Generates HTML email templates with company branding.
 * Supports both English (customer) and Chinese (supplier) variants.
 */

import { DocumentBranding } from '@/lib/branding/types';

// 邮件 logo URL - 需要是公开可访问的 URL
// 可以在 branding 配置中设置，留空则不显示 logo
export const DEFAULT_EMAIL_LOGO_URL = '';

export interface EmailTemplateData {
  branding: DocumentBranding;
  language: 'en' | 'cn';
  recipientName?: string | null; // null = 不显示 greeting, undefined = 显示默认 greeting
  subject: string;
  bodyContent: string;
  attachmentNote?: string;
}

/**
 * Generate branded email HTML
 */
export function generateBrandedEmailHTML(data: EmailTemplateData): string {
  const { branding, language, recipientName, subject, bodyContent, attachmentNote } = data;
  const isEnglish = language === 'en';

  // 获取 logo URL（优先使用 branding 中的配置，否则使用默认值）
  const logoUrl = branding.logoUrl || DEFAULT_EMAIL_LOGO_URL;
  console.log('[Email Template] Logo URL:', logoUrl || 'NOT SET');
  console.log('[Email Template] Branding logoUrl:', branding.logoUrl || 'NOT SET');

  // Determine attachment hint based on attachmentNote value
  const getAttachmentHint = (note: string | undefined, isEn: boolean) => {
    if (!note) return '';
    if (note === 'excel_template') {
      return isEn 
        ? '📎 Please fill in the attached quotation template and reply to this email.'
        : '📎 请查阅附件中的产品清单。如方便，建议直接在附件表格中填写报价后回复（推荐），也可在邮件正文中回复报价信息，以您方便的方式为准。';
    }
    if (note === 'pdf') {
      return isEn
        ? '📎 Please see the attached PDF document.'
        : '📎 请查看邮件附件中的PDF文档。';
    }
    if (note === 'attachments') {
      return isEn
        ? '📎 Please see the attached files.'
        : '📎 请查看邮件附件。';
    }
    // Default: PDF document (for backward compatibility)
    return isEn
      ? '📎 Please see the attached PDF document.'
      : '📎 请查看邮件附件中的PDF文档。';
  };

  const labels = isEnglish
    ? {
        greeting: recipientName === null ? '' : (recipientName ? `Dear ${recipientName},` : 'Dear Customer,'),
        closing: 'Best regards',
        tel: 'Tel',
        attachmentHint: getAttachmentHint(attachmentNote, true),
        tagline: 'Specializing in B2B aluminum component solutions worldwide.',
        disclaimer:
          'This message and its attachments may contain confidential or proprietary information intended solely for the use of the addressee. If you are not the intended recipient, please notify the sender and delete this email.',
      }
    : {
        greeting: recipientName === null ? '' : (recipientName ? `尊敬的${recipientName}，您好！` : '尊敬的供应商，您好！'),
        closing: '此致敬礼',
        tel: '电话',
        attachmentHint: getAttachmentHint(attachmentNote, false),
        tagline: '专注于全球B2B铝制零部件解决方案。',
        disclaimer:
          '本邮件及其附件可能包含机密或专有信息，仅供收件人使用。如果您不是预期收件人，请通知发件人并删除此邮件。',
      };

  // Logo HTML for signature - 如果有 URL 则显示图片
  const signatureLogoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${branding.companyName}" style="max-width: 120px; max-height: 40px;" />`
    : '';

  return `
<!DOCTYPE html>
<html lang="${isEnglish ? 'en' : 'zh'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #ffffff;
    }
    .container {
      max-width: 100%;
      background-color: #ffffff;
      padding: 20px 30px;
    }
    .header-logo {
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #e5e7eb;
    }
    .header-logo img {
      max-width: 180px;
      max-height: 60px;
    }
    .greeting {
      font-size: 14px;
      margin: 0 0 12px 0;
    }
    .body-content {
      font-size: 14px;
      color: #333;
    }
    .body-content p {
      margin: 0 0 10px 0;
    }
    .body-content ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .body-content li {
      margin: 4px 0;
    }
    .attachment-note {
      margin-top: 15px;
      padding: 10px 12px;
      background-color: #f0fdf4;
      border-left: 3px solid #22c55e;
      font-size: 13px;
      color: #166534;
    }
    .signature {
      margin-top: 25px;
      font-size: 13px;
    }
    .signer-name {
      font-weight: bold;
      color: #000;
      margin-bottom: 2px;
    }
    .signer-title {
      color: #666;
      margin-bottom: 15px;
    }
    .company-info {
      margin-bottom: 15px;
    }
    .company-name {
      font-weight: bold;
      color: #000;
    }
    .footer-logo {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
    }
    .tagline {
      color: #666;
      font-size: 12px;
      margin-top: 8px;
    }
    .disclaimer {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
      font-size: 11px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="container">
    ${logoUrl ? `
    <!-- Header Logo -->
    <div class="header-logo">
      <img src="${logoUrl}" alt="${branding.companyName}" />
    </div>
    ` : ''}
    
    <!-- Greeting -->
    ${labels.greeting ? `<p class="greeting">${labels.greeting}</p>` : ''}
    
    <!-- Body Content -->
    <div class="body-content">
      ${bodyContent}
    </div>

    ${
      attachmentNote
        ? `
    <div class="attachment-note">
      ${labels.attachmentHint}
    </div>
    `
        : ''
    }

    <!-- Signature -->
    <div class="signature">
      <p style="margin-bottom: 15px;">${labels.closing}</p>
      
      <!-- Signer -->
      <div class="signer-name">${branding.signer.name}</div>
      <div class="signer-title">${branding.signer.title}</div>
      
      <!-- Company Info -->
      <div class="company-info">
        <div class="company-name">${branding.companyName}</div>
        ${branding.secondaryOffice.phone ? `<div>${branding.secondaryOffice.phone}</div>` : ''}
        ${branding.secondaryOffice.email ? `<div><a href="mailto:${branding.secondaryOffice.email}" style="color: #2563eb;">${branding.secondaryOffice.email}</a></div>` : ''}
        <div><a href="https://${branding.websiteUrl}" style="color: #2563eb;">${branding.websiteUrl}</a></div>
      </div>
      
      <!-- Footer with Logo -->
      <div class="footer-logo">
        ${signatureLogoHtml}
        <div style="font-size: 12px; color: #333; margin-top: 5px;">${branding.secondaryOffice.address}</div>
        <div class="tagline">${labels.tagline}</div>
      </div>
      
      <!-- Disclaimer -->
      <div class="disclaimer">
        ${labels.disclaimer}
      </div>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Generate quotation email content (English)
 */
export function generateQuotationEmailContent(data: {
  quotationCode: string;
  date: string;
  validUntil: string;
  totalAmount: string;
}): string {
  return `
<p style="margin: 0 0 10px 0;">Please find attached our quotation <strong>${data.quotationCode}</strong> for your review.</p>

<p style="margin: 0 0 10px 0;"><strong>Quotation Details:</strong></p>
<ul style="margin: 10px 0; padding-left: 20px;">
  <li style="margin: 4px 0;">Quotation No: ${data.quotationCode}</li>
  <li style="margin: 4px 0;">Date: ${data.date}</li>
  <li style="margin: 4px 0;">Valid Until: ${data.validUntil}</li>
  <li style="margin: 4px 0;">Total Amount: ${data.totalAmount}</li>
</ul>

<p style="margin: 0 0 10px 0;">If you have any questions, please don't hesitate to contact us.</p>
`;
}

/**
 * Generate Invoice/PI email content (English)
 */
export function generateInvoiceEmailContent(data: {
  invoiceCode: string;
  issueDate: string;
  orderCode?: string;
  totalAmount: string;
}): string {
  return `
<p style="margin: 0 0 10px 0;">Please find attached our Proforma Invoice <strong>${data.invoiceCode}</strong> for your review.</p>

<p style="margin: 0 0 10px 0;"><strong>Invoice Details:</strong></p>
<ul style="margin: 10px 0; padding-left: 20px;">
  <li style="margin: 4px 0;">Invoice No: ${data.invoiceCode}</li>
  <li style="margin: 4px 0;">Issue Date: ${data.issueDate}</li>
  ${data.orderCode ? `<li style="margin: 4px 0;">Order Reference: ${data.orderCode}</li>` : ''}
  <li style="margin: 4px 0;">Total Amount: ${data.totalAmount}</li>
</ul>

<p style="margin: 0 0 10px 0;">Please arrange payment according to the agreed terms. If you have any questions, please don't hesitate to contact us.</p>
`;
}

export default {
  generateBrandedEmailHTML,
  generateQuotationEmailContent,
  generateInvoiceEmailContent,
  DEFAULT_EMAIL_LOGO_URL,
};
