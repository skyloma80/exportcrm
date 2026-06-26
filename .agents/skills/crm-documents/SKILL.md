---
name: crm-document-generation
description: "Generate PI (Proforma Invoice) and PO (Purchase Order) documents in Excel/PDF"
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [CRM, Documents, PI, PO, Excel, PDF]
depends_on: [crm-auth]
---

# CRM Document Generation Skill

Generate business documents including Proforma Invoices (PI) and Purchase Orders (PO) in Excel format with brand styling.

## Document Types

| Document | Collection | Endpoint | Format |
|----------|-----------|----------|--------|
| Proforma Invoice | `orders` (so) | `/api/so/[id]/export-pi` | Excel |
| Purchase Order | `purchase_orders` (po) | `/api/po/[id]/export-excel` | Excel |
| PI Documents | `orders` | `/api/orders/[id]/pi-documents` | PDF (S3) |
| PO Documents | `orders` | `/api/orders/[id]/purchase-orders` | PDF (S3) |
| Shipment Documents | `shipments` | `/api/shipments/[id]/documents/generate` | PDF |
| RFQ PDF | `rfqs` | `/api/rfqs/[id]/pdf` | PDF |

## PI Generation (Proforma Invoice)

```python
import urllib.request, json

# Generate PI Excel
url = f"{CRM_API_URL}/api/so/{order_id}/export-pi"
req = urllib.request.Request(url, headers=get_pb_headers())
with urllib.request.urlopen(req) as r:
    pi_data = r.read()  # Excel binary data
    
# List existing PI documents in S3
url = f"{CRM_API_URL}/api/orders/{order_id}/pi-documents"
req = urllib.request.Request(url, headers=get_pb_headers())
with urllib.request.urlopen(req) as r:
    docs = json.loads(r.read())
```

### PI Contains:
- Seller company info with logo
- Buyer company info
- PI number and date
- Item descriptions with quantities
- Unit prices and total amounts
- Incoterm and port of loading/destination
- Payment terms
- Bank information
- Signature and stamp

## PO Generation (Purchase Order)

```python
# Generate PO Excel
url = f"{CRM_API_URL}/api/po/{po_id}/export-excel"
req = urllib.request.Request(url, headers=get_pb_headers())
with urllib.request.urlopen(req) as r:
    po_data = r.read()  # Excel binary data
```

### PO Contains:
- Company information
- PO number and date
- Supplier information
- Item details with specifications
- Quantities and prices
- Delivery terms
- Payment terms

## Excel Template Location

Templates stored at `D:/exportcrm/excel-template/`:
- PI template with company branding
- PO template with company branding

## Quick Start

### Generate and Download PI
```bash
# Generate PI Excel
curl -H "Authorization: Bearer $CRM_API_TOKEN" \
  -o "PI-${ORDER_CODE}.xlsx" \
  "${CRM_API_URL}/api/so/${ORDER_ID}/export-pi"

# Generate PO Excel
curl -H "Authorization: Bearer $CRM_API_TOKEN" \
  -o "PO-${PO_CODE}.xlsx" \
  "${CRM_API_URL}/api/po/${PO_ID}/export-excel"
```

## Document Storage

Documents are stored in S3-compatible storage with path structure:
```
/{company}/{customer}/{project}/{doc_type}/{filename}
```

PI documents at: `/{company}/{customer}/{project}/PI/{filename}.pdf`
PO documents at: `/{company}/{customer}/{project}/PO/{filename}.pdf`
