# CRM Auth Skill

PocketBase connection and authentication for the AlustarsCRM system.

## Environment

```bash
export CRM_API_URL=http://42.194.150.84:8091
export CRM_API_TOKEN=your_token_here
```

## Quick Start

```python
from crm_auth import pb_list, pb_create

# List all customers
customers = pb_list("customers")

# Create a new project
project = pb_create("projects", {
    "name": "New Project",
    "customer": "customer_id_here"
})
```
