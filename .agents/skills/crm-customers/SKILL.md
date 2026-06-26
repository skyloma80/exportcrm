---
name: crm-customers
description: "Customer management - create, read, update, delete customer records and contacts"
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [CRM, Customers, Sales]
depends_on: [crm-auth]
---

# CRM Customers Skill

Manage customer records, contacts, and tracking in the CRM system.

## Collections

| Collection | Description |
|-----------|-------------|
| `customers` | Customer master data (code, name, country, type, currency) |
| `customer_contacts` | Customer contact persons (name, email, phone, wechat) |
| `customer_tracking` | Customer pipeline tracking (status, stage) |
| `customer_activities` | Customer activity history |

## Customer Fields

- `code` - Auto-generated customer code
- `name` - English name
- `name_cn` - Chinese name
- `country` - Country code
- `type` - Customer type (importer, distributor, etc.)
- `rating` - Customer rating
- `preferred_currency` - Preferred transaction currency
- `address/address_cn` - Addresses
- `website` - Company website
- `remarks` - Notes

## Common Operations

### List Customers
```python
from crm_auth import pb_list
customers = pb_list("customers", "sort=-created&perPage=100")
```

### Search Customers
```python
# By name
customers = pb_list("customers", "filter=(name~'search_term')")
# By country
customers = pb_list("customers", "filter=(country='US')")
```

### Create Customer
```python
from crm_auth import pb_create
customer = pb_create("customers", {
    "name": "ABC Trading Co.",
    "name_cn": "ABC贸易公司",
    "country": "US",
    "type": "importer",
    "preferred_currency": "USD",
    "address": "123 Main St, New York, NY 10001",
    "website": "https://abctrading.com",
    "remarks": ""
})
```

### Add Contact
```python
contact = pb_create("customer_contacts", {
    "customer": customer_id,
    "name": "John Smith",
    "position": "Purchasing Manager",
    "email": "john@abctrading.com",
    "phone": "+1-212-555-0100",
    "is_primary": True
})
```

### Customer Tracking
```python
tracking = pb_create("customer_tracking", {
    "customer_id": customer_id,
    "status": "new_lead",
    "notes": "Initial contact made"
})
```

## Usage in Hermes

1. Load crm-auth skill first
2. Load crm-customers skill
3. Use pb_list/pb_create/pb_update/pb_delete for customers
4. Use customer_contacts for contact management
