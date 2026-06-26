---
name: crm-orders
description: "Sales order management - create, manage, and track customer orders"
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [CRM, Orders, Sales]
depends_on: [crm-auth]
---

# CRM Orders Skill

Manage sales orders (SO) - the core transaction record in the CRM system.

## Collections

| Collection | Description |
|-----------|-------------|
| `orders` (also `so`) | Sales order master record |
| `order_items` | Line items within orders |
| `proforma_invoices` | Proforma invoices linked to orders |

## Order Fields

- `code` - Auto-generated order code
- `project` - Relation to project
- `customer` - Relation to customer
- `quotation` - Relation to source quotation
- `status` - See workflow: draft → confirmed → in_production → ready_to_ship → shipped → delivered → completed
- `incoterm` - FOB, CIF, EXW, etc.
- `port_of_loading` - Loading port
- `port_of_destination` - Destination port
- `payment_terms` - Payment terms text
- `currency` - Transaction currency
- `exchange_rate` - Applied exchange rate
- `total_amount` - Order total
- `remarks` - Notes

## Common Operations

### List Orders
```python
from crm_auth import pb_list
orders = pb_list("orders", "sort=-created&expand=customer,project&perPage=50")
```

### Get Order with Details
```python
from crm_auth import pb_get
order = pb_get("orders", order_id, expand="customer,project,quotation")
print(f"Order: {order.get('code')} - Status: {order.get('status')}")
print(f"Customer: {order.get('expand',{}).get('customer',{}).get('name')}")
print(f"Total: {order.get('total_amount')} {order.get('currency')}")
```

### Create Order from Quotation
```python
# Use the API endpoint
url = f"{CRM_API_URL}/api/quotations/{quotation_id}/convert-to-order"
# Or create manually
order = pb_create("so", {
    "customer_id": customer_id,
    "project_id": project_id,
    "currency": "USD",
    "incoterm": "FOB",
    "status": "draft",
    "order_date": "2024-01-15"
})
```

### Copy Order
```python
url = f"{CRM_API_URL}/api/orders/{order_id}/copy"
req = urllib.request.Request(url, headers=get_pb_headers(), method="POST")
```

### Get Order Documents
```python
# PI documents
url = f"{CRM_API_URL}/api/orders/{order_id}/pi-documents"
# Purchase order documents
url = f"{CRM_API_URL}/api/orders/{order_id}/purchase-orders"
# Payment receipts
url = f"{CRM_API_URL}/api/orders/{order_id}/payment-receipts"
```

### Order Items
```python
items = pb_list("order_items", f"filter=(order='{order_id}')&expand=product")
```

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/orders` | GET | List orders |
| `/api/orders` | POST | Create order |
| `/api/orders/[id]/copy` | POST | Copy order |
| `/api/orders/[id]/pi-documents` | GET | List PI docs |
| `/api/orders/[id]/purchase-orders` | GET | List PO docs |
| `/api/orders/[id]/payment-receipts` | GET | List payments |
| `/api/orders/[id]/documents` | GET | All order docs |
| `/api/orders/send-email` | POST | Send order email |
