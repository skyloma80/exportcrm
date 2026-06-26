---
name: crm-company-info
description: "Company branding and configuration - manage company info, logos, stamps, and signatures"
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [CRM, Company, Branding, Configuration]
depends_on: [crm-auth]
---

# CRM Company Info & Branding Skill

Manage company information, branding assets, and document styling.

## Collections

| Collection | Description |
|-----------|-------------|
| `company_info` | Company details and branding |
| `document_branding` | Document branding config |
| `user_settings` | User-specific settings (SMTP, etc.) |
| `app_config` | Application-level configuration |
| `payment_terms` | Payment term definitions |

## Company Info Fields

- `company_name` - Legal company name
- `trading_name` - Trading/brand name
- `address` - Registered address
- `phone` - Contact phone
- `email` - Contact email
- `website` - Company website
- `logo_base64` - Company logo image data
- `stamp_base64` - Company stamp image data
- `signature_base64` - Digital signature image data
- `bank_info` - Bank account information
- `tax_id` - Tax/VAT registration number

## Common Operations

### Get Company Info
```python
from crm_auth import pb_list
info = pb_list("company_info", "perPage=1")
if info.get("items"):
    company = info["items"][0]
    print(f"Company: {company.get('company_name')}")
    print(f"Address: {company.get('address')}")
```

### Get Branding Config
```python
branding = pb_list("document_branding", "perPage=1")
```

### Get Payment Terms
```python
terms = pb_list("payment_terms", "sort=sort_order")
for t in terms.get("items", []):
    print(f"{t.get('code')}: {t.get('name')} ({t.get('description')})")
```

### Get App Config by Key
```python
config = pb_list("app_config", "filter=(key='company_name')")
```

### Get Ports
```python
ports_loading = pb_list("ports_of_loading", "sort=name")
ports_dest = pb_list("ports_of_destination", "sort=name")
```
