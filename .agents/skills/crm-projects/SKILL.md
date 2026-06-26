---
name: crm-projects
description: "Project management - create and manage projects with cost tables, supplier files, and documents"
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [CRM, Projects]
depends_on: [crm-auth]
---

# CRM Projects Skill

Manage projects, cost tables, supplier files, and project documents.

## Collections

| Collection | Description |
|-----------|-------------|
| `projects` | Project master data (code, name, customer, status) |
| `project_cost_tables` | Project cost breakdown tables |
| `items` (also `products`) | Product/Item catalog within projects |

## Project Fields

- `code` - Auto-generated project code
- `name` - Project name
- `customer` - Relation to customer
- `status` - Project status
- `description` - Project description
- `start_date/end_date` - Project timeline
- `budget` - Project budget

## Common Operations

### List Projects
```python
from crm_auth import pb_list
projects = pb_list("projects", "sort=-created&expand=customer")
```

### Create Project
```python
from crm_auth import pb_create
project = pb_create("projects", {
    "code": "PRJ-2024-001",
    "name": "Aluminum Profile Order 2024",
    "customer": "customer_id",
    "status": "active",
    "description": "Annual aluminum profile procurement"
})
```

### Project Cost Table
```python
# Get cost table
cost_table = pb_list("project_cost_tables", f"filter=(project='{project_id}')")

# Add cost entry
cost = pb_create("project_cost_tables", {
    "project": project_id,
    "item_name": "Mold Cost",
    "estimated_cost": 5000.00,
    "actual_cost": 4800.00,
    "supplier": supplier_id
})
```

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/projects/[id]/cost-table` | GET | Get project cost table |
| `/api/projects/[id]/cost-table/confirm` | POST | Confirm cost table |
| `/api/projects/[id]/documents` | GET | List project documents |
| `/api/projects/[id]/supplier-files` | GET | List supplier files |
