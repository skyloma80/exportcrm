---
name: crm-service-providers
description: "Service provider directory - manage logistics, inspection, and other service partners"
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [CRM, Services, Logistics]
depends_on: [crm-auth]
---

# CRM Service Providers Skill

Manage service provider records for logistics, inspection, quality control, and other third-party services.

## Collection: `service_providers`

### Fields

- `code` - Service provider code
- `name` - Provider name
- `type` - logistics, inspection, testing, forwarding, other
- `country` - Country
- `contact_name` - Contact person
- `contact_email` - Contact email
- `contact_phone` - Contact phone
- `rating` - Performance rating
- `remarks` - Notes

## Common Operations

### List Service Providers
```python
from crm_auth import pb_list
providers = pb_list("service_providers", "sort=name")

# Filter by type
logistics = pb_list("service_providers", "filter=(type='logistics')")
inspection = pb_list("service_providers", "filter=(type='inspection')")
```
