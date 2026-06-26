---
name: crm-shipments
description: "Shipment management - create shipments, track items, generate documents"
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [CRM, Shipments, Logistics]
depends_on: [crm-auth]
---

# CRM Shipments Skill

Manage shipment records, photos, documents, and status tracking.

## Collections

| Collection | Description |
|-----------|-------------|
| `shipments` | Shipment records |
| `customs_clearance` | Customs clearance records |

## Shipment Fields

- `code` - Shipment code
- `order` - Relation to sales order
- `mode_of_shipment` - Sea, air, express, etc.
- `carrier` - Shipping carrier/forwarder
- `tracking_number` - Carrier tracking number
- `status` - packing, ready, shipped, in_transit, delivered
- `port_of_loading` - Departure port
- `port_of_destination` - Arrival port
- `etd` - Estimated time of departure
- `eta` - Estimated time of arrival
- `total_volume` - Total cargo volume
- `total_weight` - Total cargo weight
- `container_info` - Container details

## Common Operations

### List Shipments
```python
from crm_auth import pb_list
shipments = pb_list("shipments", "sort=-created&expand=order&perPage=50")
```

### Create Shipment
```python
from crm_auth import pb_create
shipment = pb_create("shipments", {
    "order": order_id,
    "mode_of_shipment": "sea",
    "carrier": "Maersk Line",
    "port_of_loading": "Shanghai",
    "port_of_destination": "Los Angeles",
    "etd": "2024-02-01",
    "eta": "2024-02-20",
    "status": "packing"
})
```

### Update Shipment Status
```python
url = f"{CRM_API_URL}/api/shipments/{shipment_id}/status"
data = {"status": "shipped", "tracking_number": "MAEU1234567"}
```

### Manage Shipment Documents
```python
# Generate documents (packing list, invoice, etc.)
url = f"{CRM_API_URL}/api/shipments/{shipment_id}/documents/generate"

# List documents
url = f"{CRM_API_URL}/api/shipments/{shipment_id}/documents"

# Upload photos
url = f"{CRM_API_URL}/api/shipments/{shipment_id}/photos"
```

### Shipment Items
```python
items = pb_list("order_items", f"filter=(order='{order_id}')")
# Update shipped quantities
url = f"{CRM_API_URL}/api/shipments/{shipment_id}/items"
```

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/shipments/[id]/status` | POST | Update shipment status |
| `/api/shipments/[id]/documents` | GET | List documents |
| `/api/shipments/[id]/documents/generate` | POST | Generate documents |
| `/api/shipments/[id]/items` | GET | Get shipment items |
| `/api/shipments/[id]/photos` | GET/POST | Manage photos |
| `/api/shipments/[id]/snapshots` | GET | Get status snapshots |
