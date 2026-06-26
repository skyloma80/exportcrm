---
name: crm-rfqs
description: "RFQ (Request for Quotation) management - create RFQs, collect supplier quotations, analyze pricing"
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [CRM, RFQ, Procurement, Sourcing]
depends_on: [crm-auth]
---

# CRM RFQs Skill

Manage Request for Quotations - send to suppliers, collect responses, analyze, and convert to purchase orders.

## Collections

| Collection | Description |
|-----------|-------------|
| `rfqs` | RFQ master records |
| `quotations` (in rfq context) | Supplier quotation responses |
| `product_costs` | Cost data per product per supplier |

## RFQ Fields

- `code` - Auto-generated RFQ code
- `project` - Relation to project
- `issue_date` - Date RFQ issued
- `deadline` - Response deadline
- `status` - draft, sent, receiving, closed, awarded
- `items` - JSON array of items being quoted
- `project_description` - Description for suppliers

## Common Operations

### List RFQs
```python
from crm_auth import pb_list
rfqs = pb_list("rfqs", "sort=-created&expand=project&perPage=50")
```

### Create RFQ
```python
from crm_auth import pb_create
rfq = pb_create("rfqs", {
    "project": project_id,
    "issue_date": "2024-01-15",
    "deadline": "2024-01-30",
    "status": "draft",
    "project_description": "Annual procurement of aluminum profiles"
})
```

### Send RFQ to Suppliers
```python
url = f"{CRM_API_URL}/api/rfqs/{rfq_id}/send-email"
data = {
    "supplier_ids": [supplier_id_1, supplier_id_2],
    "language": "cn",
    "subject": f"询价邀请 RFQ-{rfq_code}",
    "attachment_note": "rfq_with_template"
}
```

### Collect Supplier Quotations
```python
# Get supplier responses
quotations = pb_list("quotations", 
    f"filter=(rfq='{rfq_id}')&expand=supplier")
```

### AI Analyze RFQ Responses
```python
url = f"{CRM_API_URL}/api/rfqs/{rfq_id}/ai-analyze"
req = urllib.request.Request(url, headers=get_pb_headers())
with urllib.request.urlopen(req) as r:
    analysis = json.loads(r.read())
```

### Merge RFQ to Quotation (customer quotation)
```python
merge_url = f"{CRM_API_URL}/api/rfqs/merge-to-quotation"
# Preview
preview_url = f"{CRM_API_URL}/api/rfqs/merge-preview"
```

### Generate POs from RFQ
```python
url = f"{CRM_API_URL}/api/rfqs/{rfq_id}/generate-purchase-orders"
```

### RFQ PDF Generation
```python
url = f"{CRM_API_URL}/api/rfqs/{rfq_id}/pdf"
```

## Quick Start

```bash
# Send RFQ
curl -X POST -H "Authorization: Bearer *** \
  -d '{"supplier_ids":["id1","id2"]}' \
  "${CRM_API_URL}/api/rfqs/${RFQ_ID}/send-email"

# AI analyze results
curl -H "Authorization: Bearer *** \
  "${CRM_API_URL}/api/rfqs/${RFQ_ID}/ai-analyze"
```
