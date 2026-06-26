---
name: crm-suppliers
description: "Supplier management - manage supplier records, contacts, and evaluations"
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [CRM, Suppliers, Procurement]
depends_on: [crm-auth]
---

# CRM Suppliers Skill

Manage supplier records, contacts, and performance in the CRM system.

## Collections

| Collection | Description |
|-----------|-------------|
| `suppliers` | Supplier master data |
| `supplier_contacts` | Supplier contact persons |
| `service_providers` | Service provider directory |

## Supplier Fields

- `code` - Auto-generated supplier code
- `name` - Supplier company name
- `name_cn` - Chinese name
- `country` - Country
- `type` - Supplier type (manufacturer, trader, etc.)
- `rating` - Performance rating
- `preferred_currency` - Preferred transaction currency
- `payment_terms` - Default payment terms
- `lead_time` - Typical lead time
- `address` - Company address
- `website` - Company website
- `remarks` - Notes

## Common Operations

### List Suppliers
```python
from crm_auth import pb_list
suppliers = pb_list("suppliers", "sort=name&perPage=100")
```

### Search Suppliers
```python
# By product type or name
suppliers = pb_list("suppliers", "filter=(name~'aluminum')")
# By country
suppliers = pb_list("suppliers", "filter=(country='CN')")
```

### Create Supplier
```python
from crm_auth import pb_create
supplier = pb_create("suppliers", {
    "name": "Shanghai Aluminum Co., Ltd.",
    "name_cn": "上海铝业有限公司",
    "country": "CN",
    "type": "manufacturer",
    "preferred_currency": "CNY",
    "payment_terms": "T/T 30% deposit, 70% before shipment",
    "lead_time": "25-30 days",
    "address": "Shanghai, China",
    "website": "https://shanghai-aluminum.com"
})
```

### Import/Export Suppliers
```python
# Export to Excel
url = f"{CRM_API_URL}/api/suppliers/export"
# Import from Excel
url = f"{CRM_API_URL}/api/suppliers/import"
```

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/suppliers/export` | GET | Export suppliers to Excel |
| `/api/suppliers/import` | POST | Import suppliers from Excel |
