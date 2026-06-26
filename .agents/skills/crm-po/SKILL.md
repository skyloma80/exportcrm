---
name: crm-po
description: "Purchase order management - create, manage, and track purchase orders to suppliers"
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [CRM, Purchase Orders, Procurement]
depends_on: [crm-auth]
---

# CRM Purchase Orders Skill

Manage purchase orders (PO) sent to suppliers for procurement.

## Collections

| Collection | Description |
|-----------|-------------|
| `purchase_orders` (also `po`) | Purchase order records |
| `po_payments` | Payment tracking for POs |
| `purchase_order_mold_items` | Mold/tooling items in POs |
| `purchase_price_notes` | Cost price notes |

## PO Fields

- `code` - Auto-generated PO code
- `project` - Relation to project
- `supplier` - Relation to supplier
- `order` - Relation to sales order (if linked)
- `rfq` - Relation to source RFQ
- `status` - draft, sent, confirmed, in_production, shipped, delivered, completed, cancelled
- `total_amount` - Total amount
- `currency` - Currency
- `payment_terms` - Payment terms
- `delivery_date` - Expected delivery

## Common Operations

### List POs
```python
from crm_auth import pb_list
pos = pb_list("purchase_orders", "sort=-created&expand=supplier,project&perPage=50")
```

### Get PO Details
```python
po = pb_get("purchase_orders", po_id, expand="supplier,project,order")
print(f"PO: {po.get('code')} - Supplier: {po.get('expand',{}).get('supplier',{}).get('name')}")
```

### Create PO
```python
po = pb_create("purchase_orders", {
    "project": project_id,
    "supplier": supplier_id,
    "order": order_id,
    "status": "draft",
    "currency": "USD",
    "payment_terms": "T/T 30% deposit, 70% after inspection",
    "delivery_date": "2024-03-15"
})
```

### Generate PO from RFQ
```python
url = f"{CRM_API_URL}/api/rfqs/{rfq_id}/generate-purchase-orders"
```

### Export PO to Excel
```python
url = f"{CRM_API_URL}/api/po/{po_id}/export-excel"
# Returns .xlsx file with company branding
```

### Copy PO
```python
url = f"{CRM_API_URL}/api/po/{po_id}/copy"
```

### Track PO Payments
```python
payments = pb_list("po_payments", f"filter=(purchase_order='{po_id}')&sort=-created")
total_paid = sum(p.get("amount", 0) for p in payments.get("items", []))
print(f"Total paid: {total_paid} / PO total: {po.get('total_amount')}")
```

## PO Status Workflow

```
draft → sent → confirmed → in_production → shipped → delivered → completed
                                          ↘ cancelled
```
