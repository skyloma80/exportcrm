---
name: crm-workflow
description: "Order status workflow management - advance, cancel, and track order lifecycle"
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [CRM, Workflow, Orders, Status]
depends_on: [crm-auth, crm-orders]
---

# CRM Workflow Skill

Manage order status workflow progression from draft through to completion.

## Order Status Flow

```
draft → confirmed → in_production → ready_to_ship → shipped → delivered → completed
    ↘ cancelled ↗ (any non-terminal state)
         ↘ draft (reactivate)
```

## Status Definitions

| Status | Description |
|--------|-------------|
| `draft` | Initial draft state |
| `confirmed` | Order confirmed with customer |
| `in_production` | Production in progress |
| `ready_to_ship` | Goods ready for shipment |
| `shipped` | Goods shipped |
| `delivered` | Goods delivered to customer |
| `completed` | Order fully completed (terminal) |
| `cancelled` | Order cancelled (terminal) |

## Common Operations

### Advance Order Status
```python
from crm_auth import pb_get, pb_update

# Get current order
order = pb_get("orders", order_id)

# Validate transition
current = order.get("status")
valid_transitions = {
    "draft": "confirmed",
    "confirmed": "in_production",
    "in_production": "ready_to_ship",
    "ready_to_ship": "shipped",
    "shipped": "delivered",
    "delivered": "completed"
}

if current in valid_transitions:
    next_status = valid_transitions[current]
    pb_update("orders", order_id, {"status": next_status})
    print(f"Order advanced from {current} → {next_status}")
else:
    print(f"Order {order_id} is in terminal state: {current}")
```

### Cancel Order
```python
# Cancellation allowed from any non-terminal state
terminal_states = ["completed", "cancelled"]
if current not in terminal_states:
    pb_update("orders", order_id, {"status": "cancelled"})
```

### Reactivate Cancelled Order
```python
# Only cancelled orders can be reactivated to draft
if current == "cancelled":
    pb_update("orders", order_id, {"status": "draft"})
```

### Check Progress
```python
progress_order = ["draft", "confirmed", "in_production", "ready_to_ship", 
                  "shipped", "delivered", "completed"]
if current in progress_order:
    index = progress_order.index(current)
    progress = round((index / (len(progress_order) - 1)) * 100)
    print(f"Order progress: {progress}%")
```

## Advanced Status Management

The CRM has a dedicated status advancement dialog at:
- `/app/api/shipments/[id]/status` - Shipment status updates
- Check prerequisites before advancing (e.g., all items shipped before marking "delivered")

## Prerequisite Checks

Before advancing from `ready_to_ship` → `shipped`:
- All items have shipping quantities assigned
- Shipping documents generated

Before advancing from `shipped` → `delivered`:
- Tracking number provided
- Carrier confirmed delivery

## Usage in Hermes

1. Load crm-auth + crm-workflow
2. Check current order status
3. Validate transition is allowed
4. Update status via pb_update
5. Log the activity
