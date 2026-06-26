---
name: crm-quotations
description: "Customer quotation management - create, revise, send, and convert to orders"
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [CRM, Quotations, Sales]
depends_on: [crm-auth]
---

# CRM Quotations Skill

Manage customer quotations from creation through revision and conversion to sales orders.

## Collections

| Collection | Description |
|-----------|-------------|
| `quotations` | Customer quotations with items and pricing |
| `quotation_items` | Individual line items in a quotation |

## Quotation Fields

- `code` - Auto-generated quotation code (e.g., QTN-2024-001)
- `project` - Relation to project
- `customer` - Relation to customer
- `status` - draft, sent, accepted, rejected, revised
- `valid_until` - Expiry date for the quotation
- `payment_terms` - Payment terms description
- `incoterm` - Trade term (FOB, CIF, etc.)
- `total_amount` - Calculated total

## Common Operations

### List Quotations
```python
from crm_auth import pb_list
quotations = pb_list("quotations", "sort=-created&expand=customer,project")
```

### Create Quotation
```python
from crm_auth import pb_create
quotation = pb_create("quotations", {
    "project": project_id,
    "customer": customer_id,
    "status": "draft",
    "valid_until": "2024-12-31",
    "payment_terms": "30% deposit, 70% before shipment",
    "incoterm": "FOB",
    "port_of_loading": "Shanghai",
    "port_of_destination": "New York"
})
```

### Revise Quotation
```python
url = f"{CRM_API_URL}/api/quotations/{quotation_id}/revise"
# Creates a new version with incremented revision number
```

### Convert to Order
```python
url = f"{CRM_API_URL}/api/quotations/{quotation_id}/convert-to-order"
req = urllib.request.Request(url, headers=get_pb_headers(), method="POST")
with urllib.request.urlopen(req) as r:
    result = json.loads(r.read())
    print(f"Order created: {result.get('order_id')}")
```

### Send Quotation Email
See crm-email skill for details.
