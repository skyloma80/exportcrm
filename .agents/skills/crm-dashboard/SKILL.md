---
name: crm-dashboard
description: "CRM dashboard KPIs and analytics - revenue, projects, exchange rates, recent activity"
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [CRM, Dashboard, Analytics, KPIs]
depends_on: [crm-auth]
---

# CRM Dashboard Skill

Query dashboard KPIs and analytics from the CRM system.

## Available Metrics

- Revenue trends (monthly/quarterly)
- Active project count
- Order status distribution
- Exchange rate overview
- Recent project activity
- KPI cards (total revenue, active projects, pending orders)

## Common Operations

### Get Dashboard Data
```python
from crm_auth import pb_list, pb_get

# Get project statistics
projects = pb_list("projects", "sort=-created&perPage=100")
active = [p for p in projects.get("items", []) if p.get("status") == "active"]
print(f"Active projects: {len(active)}/{len(projects.get('items', []))}")

# Get order statistics
orders = pb_list("orders", "perPage=100")
statuses = {}
for o in orders.get("items", []):
    s = o.get("status", "unknown")
    statuses[s] = statuses.get(s, 0) + 1
print("Order status distribution:", statuses)

# Revenue calculation
total_revenue = sum(float(o.get("total_amount", 0)) for o in orders.get("items", []) 
                   if o.get("status") not in ["cancelled", "draft"])
print(f"Total revenue: ${total_revenue:,.2f}")
```

### Recent Activity
```python
logs = pb_list("activity_logs", "sort=-created&perPage=20&expand=user")
for log in logs.get("items", []):
    user = log.get("expand", {}).get("user", {}).get("name", "Unknown")
    print(f"[{log.get('created')}] {user}: {log.get('action')} - {log.get('description')}")
```

### Exchange Rate Card
```python
rate_data = pb_list("exchange_rate_cache", "perPage=10")
for r in rate_data.get("items", []):
    print(f"{r.get('base_currency')}/{r.get('target_currency')}: {r.get('rate')}")
```
