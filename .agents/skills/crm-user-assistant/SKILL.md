---
name: crm-user-assistant
description: "Master assistant for CRM end users - sales, finance, procurement. Orchestrates all CRM skills for full外贸业务 without opening the CRM UI"
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [CRM, Master, Assistant, Sales, Finance, Procurement, Role-Based]
---

# CRM User Assistant Agent

The crm-user-assistant is a role-based intelligent agent that wraps all CRM functions into Hermes skills. Users interact with the CRM through Hermes without ever opening the CRM web UI.

## Role-Based Personas

| Role | Skill | Typical Tasks |
|------|-------|---------------|
| 🧑‍💼 Sales | crm-customers, crm-quotations, crm-orders, crm-email, crm-products | Customer management, quotation creation, order tracking, send emails |
| 🛒 Procurement | crm-rfqs, crm-po, crm-suppliers, crm-price-comparison, crm-products | RFQ management, supplier sourcing, PO creation, price comparison |
| 📦 Logistics | crm-shipments, crm-orders, crm-documents | Shipment management, document generation, tracking |
| 💰 Finance | crm-po, crm-orders, crm-exchange-rates, crm-documents | Payment tracking, PI/PO documents, currency conversion |
| ⚙️ Admin | crm-developer, crm-feedbacks, crm-company-info, crm-dashboard | System config, user feedback management, company info |

## Skills Map — All CRM Capabilities

```
┌──────────────────────────────────────────────────────────────┐
│                    CRM User Assistant                         │
├──────────┬──────────┬──────────┬──────────┬──────────────────┤
│  Sales   │Procurem. │ Logistics│ Finance  │    Admin         │
│          │          │          │          │                  │
│Customers │ Suppliers│Shipments │   PO     │ Feedbacks        │
│Quotation │   RFQ    │Documents │   PI     │ Company Info     │
│  Orders  │Price Comp│Photos    │Payments  │ Dashboard        │
│  Email   │   PO     │Customs   │Exchange  │ Developer        │
│ Products │          │          │  Rates   │ App Config       │
└──────────┴──────────┴──────────┴──────────┴──────────────────┘
```

## Shared Skills

All roles use:
- `crm-auth` — Authentication (load first)
- `crm-disk` — File management
- `crm-tasks` — Task management

## Quick Start by Role

### Sales Rep — Create Quotation and Email Customer

```python
# 1. Authenticate
from authenticate import pb_list, pb_create

# 2. Find or create customer
customers = pb_list("customers", "filter=(name~'ABC Trading')")

# 3. Create quotation
quotation = pb_create("quotations", {
    "project": project_id,
    "customer": customers["items"][0]["id"],
    "status": "draft",
    "valid_until": "2024-12-31",
    "incoterm": "FOB"
})

# 4. Generate PI documents
# 5. Send email with quotation
```

### Procurement — Send RFQ and Compare Prices

```python
# 1. Create RFQ
rfq = pb_create("rfqs", {
    "project": project_id,
    "issue_date": "2024-01-15",
    "deadline": "2024-01-30",
    "status": "draft"
})

# 2. Send to suppliers via email API
# 3. Collect quotations
# 4. Compare prices
costs = pb_list("product_costs", 
    f"filter=(product='{product_id}')&sort=cost_price")
```

### Finance — Check POs and Generate PI

```python
# 1. List POs needing payment
pos = pb_list("purchase_orders", "filter=(status='confirmed')")

# 2. Check payments
for po in pos.get("items", []):
    payments = pb_list("po_payments", 
        f"filter=(purchase_order='{po['id']}')")
    total_paid = sum(float(p.get("amount",0)) for p in payments.get("items",[]))
    
# 3. Generate PI document
# Use the export-pi or pi-documents API
```

### Logistics — Manage Shipments

```python
# 1. Create shipment
shipment = pb_create("shipments", {
    "order": order_id,
    "mode_of_shipment": "sea",
    "carrier": "Maersk",
    "status": "packing"
})

# 2. Upload photos
# 3. Generate shipping documents
# 4. Update status when shipped
```

## Agent Workflows

### Workflow 1: Sales → Procurement → Logistics

1. Sales creates order → 
2. Procurement creates RFQ from order items →
3. Procurement selects supplier, creates PO →
4. Supplier delivers →
5. Logistics creates shipment →
6. Status advances through workflow

### Workflow 2: Bug Report → Fix → Deploy

1. User reports feedback (bug/feature) →
2. crm-developer agent reviews →
3. Creates branch, implements fix →
4. User confirms →
5. Git push → CI/CD deploys

## File Organization

All CRM skills are in `.agents/skills/crm-*/`:
- Each has SKILL.md with full documentation
- README.md with quick start
- Optional scripts/ for executable helpers
- Optional references/ for data files

## Usage in Hermes

```bash
# Load CRM User Assistant
skill_view(name='crm-user-assistant')

# Then load the specific CRM skill for your task
skill_view(name='crm-quotations')    # For quotations
skill_view(name='crm-email')         # For email
skill_view(name='crm-workflow')      # For status management

# Or load crm-developer for dev tasks
skill_view(name='crm-developer')
```
