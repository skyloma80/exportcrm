---
name: crm-auth
description: "PocketBase authentication and CRM API connection management"
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [CRM, Auth, PocketBase, API]
---

# CRM Auth Skill

Authenticate and manage connections to the AlustarsCRM PocketBase backend.

## Prerequisites

- CRM_API_URL and CRM_API_TOKEN set in environment
- PocketBase server running at CRM_API_URL

## PocketBase Collections Overview

| Collection | Description | 
|-----------|-------------|
| `customers` | Customer records |
| `suppliers` | Supplier records |
| `products` | Product/Item catalog |
| `projects` | Project management |
| `rfqs` | Request for Quotations |
| `quotations` | Customer quotations |
| `orders` (also `so`) | Sales orders |
| `purchase_orders` (also `po`) | Purchase orders |
| `proforma_invoices` | Proforma Invoices |
| `shipments` | Shipping records |
| `feedbacks` | User feedback/bug reports |
| `tasks` | Task management |
| `activity_logs` | Activity audit trail |
| `exchange_rate_cache` | Cached exchange rates |
| `product_costs` | Product cost tracking |
| `user_settings` | User SMTP/branding settings |
| `app_config` | Application configuration |
| `ai_configs` | AI provider configuration |
| `customer_tracking` | Customer tracking/CRM pipeline |
| `customer_activities` | Customer activity log |
| `remittance` | Payment remittance |
| `service_providers` | Service provider directory |
| `code_sequences` | Auto-numbering sequences |
| `company_info` | Company branding/contact info |
| `payment_terms` | Payment term definitions |
| `ports_of_loading` | Port of loading directory |
| `ports_of_destination` | Port of destination directory |

## Authentication Script

```python
import os
import json
import urllib.request

CRM_API_URL = os.environ.get("CRM_API_URL", "http://localhost:8090")
CRM_API_TOKEN = os.environ.get("CRM_API_TOKEN")

def get_pb_headers():
    """Get authenticated PocketBase API headers"""
    return {
        "Authorization": f"Bearer {CRM_API_TOKEN}",
        "Content-Type": "application/json"
    }

def pb_get(collection: str, record_id: str = "", params: str = ""):
    """GET records from PocketBase"""
    url = f"{CRM_API_URL}/api/collections/{collection}/records"
    if record_id:
        url += f"/{record_id}"
    if params:
        url += f"?{params}"
    req = urllib.request.Request(url, headers=get_pb_headers())
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def pb_list(collection: str, params: str = "perPage=100&sort=-created"):
    """List records with pagination"""
    url = f"{CRM_API_URL}/api/collections/{collection}/records?{params}"
    req = urllib.request.Request(url, headers=get_pb_headers())
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def pb_create(collection: str, data: dict):
    """Create a record"""
    url = f"{CRM_API_URL}/api/collections/{collection}/records"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=get_pb_headers(), method="POST")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def pb_update(collection: str, record_id: str, data: dict):
    """Update a record"""
    url = f"{CRM_API_URL}/api/collections/{collection}/records/{record_id}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=get_pb_headers(), method="PATCH")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def pb_delete(collection: str, record_id: str):
    """Delete a record"""
    url = f"{CRM_API_URL}/api/collections/{collection}/records/{record_id}"
    req = urllib.request.Request(url, headers=get_pb_headers(), method="DELETE")
    with urllib.request.urlopen(req) as resp:
        return resp.status == 204
```

## Usage

1. First, ensure CRM_API_URL and CRM_API_TOKEN are set
2. Load crm-auth skill to get the `authenticate` helper
3. Use `pb_list`, `pb_get`, `pb_create`, `pb_update`, `pb_delete` for CRUD operations
4. All subsequent CRM skills depend on this authentication
