---
name: crm-email
description: "Email sending with branded templates - quotations, RFQs, PIs, and general correspondence"
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [CRM, Email, Communication]
depends_on: [crm-auth]
---

# CRM Email Skill

Send branded emails to customers and suppliers using the CRM's email service with SMTP configuration.

## Email Types

| Type | Endpoint | Purpose |
|------|----------|---------|
| Quotation | `/api/quotations/[id]/send-email` | Send quotation to customer |
| RFQ | `/api/rfqs/[id]/send-email` | Send RFQ to suppliers |
| Invoice/PI | `/api/invoices/[id]/send-email` | Send PI to customer |
| Order | `/api/orders/send-email` | General order email |

## Email Configuration

Each user has SMTP settings stored in `user_settings` collection:
- `smtp_host` - SMTP server hostname
- `smtp_port` - SMTP port (587 or 465)
- `smtp_user` - SMTP username
- `smtp_pass` - SMTP password
- `smtp_from` - From email address
- `smtp_secure` - Use TLS/SSL

Branding settings in `branding` configuration:
- `company_name` - Company display name
- `logo_url` - Logo URL for email signature
- `website_url` - Company website
- `signer.name/title` - Signer information
- `address` - Company address

## Branded Email Templates

The system generates branded HTML emails with:
- Company logo header
- Professional formatting
- Bilingual support (English for customers, Chinese for suppliers)
- Attachment notes
- Company signature with contact info
- Standard disclaimer

## Common Operations

### Send Quotation Email
```python
import urllib.request, json
url = f"{CRM_API_URL}/api/quotations/{quotation_id}/send-email"
data = json.dumps({
    "recipient_emails": ["customer@example.com"],
    "language": "en",
    "subject": "Quotation QTN-2024-001 - Aluminum Profiles",
    "message": "Please find attached our quotation.",
    "attachments": ["quotation-001.pdf"]
}).encode()
req = urllib.request.Request(url, data=data, headers=get_pb_headers(), method="POST")
```

### Send RFQ Email
```python
url = f"{CRM_API_URL}/api/rfqs/{rfq_id}/send-email"
data = {
    "supplier_ids": ["supplier_id_1", "supplier_id_2"],
    "language": "cn",
    "subject": "询价邀请 RFQ-2024-001",
    "message": "我们诚邀您为以下项目提供报价",
    "attachment_note": "rfq_with_template"
}
```

### Check SMTP Settings
```python
from crm_auth import pb_list
settings = pb_list("user_settings", f"filter=(user_id='{user_id}')")
if settings.get('items'):
    smtp = settings['items'][0]
    print(f"SMTP: {smtp.get('smtp_host')}:{smtp.get('smtp_port')}")
```

## Email Templates Available

| Template | Function | Language |
|----------|----------|----------|
| Quotation | `generateQuotationEmailContent()` | EN |
| RFQ | `generateRFQEmailContent()` | CN |
| Invoice/PI | `generateInvoiceEmailContent()` | EN |
| Branded HTML | `generateBrandedEmailHTML()` | EN/CN |

## Usage in Hermes

For simple email send, use the CRM API routes. For custom emails, generate the HTML template and use the email service.
