# ExportCRM — AI Agent Setup

## Overview

This project integrates with Hermes Agent through a skill-based architecture. Two primary agents are available:

1. **crm-developer** — DevOps agent managing feedbacks, code fixes, and CI/CD
2. **crm-user-assistant** — Role-based business agent for all CRM operations

## Environment Variables

```env
# PocketBase API — required for all CRM operations
CRM_API_URL=http://localhost:8090
# Option 1: API Token (from CRM Settings > API Access)
CRM_API_TOKEN=*** Option 2: Auto-auth with CRM credentials
CRM_USER=271341794@qq.com
CRM_PASS=085711jern
```

> ⚠️ `CRM_API_TOKEN` 优先于 `CRM_USER`/`CRM_PASS`。如果两者都设置，用 token。如果都没设置，运行时会提示。

## Auto-Auth Script

When CRM_API_TOKEN is not set but CRM_USER/CRM_PASS are, the authenticate module automatically logs in:

```python
from authenticate import pb_list
customers = pb_list("customers")  # 自动取 token，无需额外步骤
```

## Connection

```python
from authenticate import pb_list, pb_create, pb_update, pb_delete
```

## Complete Skills Reference

All skills located in `.agents/skills/crm-*/`:

### Infrastructure
| Skill | Purpose | Location |
|-------|---------|----------|
| `crm-auth` | PocketBase authentication | `.agents/skills/crm-auth/` |

### Business Skills
| Skill | Purpose | Load When... |
|-------|---------|-------------|
| `crm-customers` | Customer & contact management | Managing customer records |
| `crm-projects` | Project & cost table management | Managing projects |
| `crm-quotations` | Customer quotation creation & revision | Creating/sending quotations |
| `crm-orders` | Sales order management | Managing sales orders |
| `crm-suppliers` | Supplier management | Managing supplier records |
| `crm-products` | Product catalog & cost tracking | Managing product catalog |
| `crm-po` | Purchase order management | Managing purchase orders |
| `crm-rfqs` | RFQ management & supplier sourcing | Sending RFQs to suppliers |
| `crm-shipments` | Shipment & logistics management | Managing shipments |
| `crm-feedbacks` | User feedback & bug tracking | Managing feedback/bugs |
| `crm-tasks` | Task management | Creating/assigning tasks |

### Functional Skills
| Skill | Purpose | Load When... |
|-------|---------|-------------|
| `crm-email` | Branded email sending | Sending emails to customers/suppliers |
| `crm-workflow` | Order status workflow | Advancing/canceling order status |
| `crm-price-comparison` | Supplier price comparison | Comparing supplier prices |
| `crm-documents` | PI/PO document generation | Generating Excel/PDF documents |
| `crm-disk` | File management (S3 storage) | Managing files in cloud storage |
| `crm-exchange-rates` | Exchange rate query | Checking/refreshing rates |
| `crm-dashboard` | KPI & analytics | Getting business metrics |
| `crm-company-info` | Company branding & config | Managing company info |
| `crm-service-providers` | Service provider directory | Managing logistics partners |

### Agent Skills
| Skill | Purpose | Load When... |
|-------|---------|-------------|
| `crm-developer` | DevOps: feedback→branch→fix→deploy | Fixing bugs/implementing features |
| `crm-user-assistant` | Role-based master orchestrator | Starting any CRM task |

## Quick Start

### For Business Users (Sales/Procurement/Finance)

```bash
# Load the user assistant
skill_view(name='crm-user-assistant')

# Then load specific business skill
skill_view(name='crm-auth')
skill_view(name='crm-quotations')  # for quotations
```

### For Developers

```bash
# Load developer agent
skill_view(name='crm-developer')

# Check feedbacks
python3 -c "from authenticate import pb_list; print(pb_list('feedbacks','filter=(status=\\'new\\')&sort=-created'))"
```

## Architecture

```
Hermes Agent
└── crm-user-assistant (role-based orchestrator)
    ├── crm-auth          → PocketBase API
    ├── crm-customers     → customers, customer_contacts
    ├── crm-projects      → projects, project_cost_tables
    ├── crm-quotations    → quotations, quotation_items
    ├── crm-orders        → orders (so), order_items
    ├── crm-suppliers     → suppliers, supplier_contacts
    ├── crm-products      → products, product_costs
    ├── crm-po            → purchase_orders (po), po_payments
    ├── crm-rfqs          → rfqs, rfq_items
    ├── crm-shipments     → shipments, customs_clearance
    ├── crm-email         → SendGrid/SMTP
    ├── crm-workflow      → Order status engine
    ├── crm-price-compare → Product cost comparison
    ├── crm-documents     → PI/PO Excel/PDF generation
    ├── crm-disk          → S3 file management
    ├── crm-exchange-rates  → Currency conversion
    ├── crm-dashboard     → Business analytics
    ├── crm-company-info  → Branding & config
    ├── crm-service-providers → Logistics partners
    ├── crm-tasks         → Task management
    ├── crm-feedbacks     → Bug/feature tracking
    └── crm-developer     → Git → OpenCode → CI/CD
```

## Skill File Structure

Each skill follows the standard format:
```
.agents/skills/crm-xxx/
  SKILL.md     — Full documentation with YAML frontmatter
  README.md    — Quick start guide
  scripts/     — Executable helper scripts
  references/  — Documentation and data files
  assets/      — Templates and resources
```

## Notes

- All skills depend on `crm-auth` for PocketBase connectivity
- Skills are self-contained — no project source code dependencies
- The CRM web UI remains the system of record for structured data
- Hermes agent provides the conversational interface for all operations
