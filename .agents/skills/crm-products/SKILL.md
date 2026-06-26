---
name: crm-products
description: "Product/Item catalog management - manage products, categories, and pricing"
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [CRM, Products, Catalog]
depends_on: [crm-auth]
---

# CRM Products Skill

Manage the product/item catalog with categories, pricing, and import/export capabilities.

## Collections

| Collection | Description |
|-----------|-------------|
| `products` (also `items`) | Product master data |
| `product_categories` | Product category hierarchy |
| `product_costs` | Per-supplier product cost tracking |
| `units` | Unit of measure definitions |

## Product Fields

- `code` - Product/SKU code
- `name` - Product name
- `name_cn` - Chinese name
- `category` - Product category
- `description` - Product description
- `specifications` - Technical specs
- `unit` - Unit of measure
- `unit_price` - Standard unit price
- `currency` - Default currency
- `supplier` - Default supplier
- `lead_time` - Typical lead time
- `moq` - Minimum order quantity
- `purchase_price_notes` - Cost price notes
- `remarks` - Notes

## Common Operations

### List Products
```python
from crm_auth import pb_list
products = pb_list("products", "sort=code&perPage=100")
```

### Search Products
```python
results = pb_list("products", "filter=(name~'aluminum')")
by_category = pb_list("products", "filter=(category='extrusions')")
```

### Create Product
```python
from crm_auth import pb_create
product = pb_create("products", {
    "code": "AL-6063-T5-001",
    "name": "Aluminum Extrusion Profile 6063-T5",
    "name_cn": "铝型材 6063-T5",
    "category": "extrusions",
    "unit": "meter",
    "unit_price": 5.50,
    "currency": "USD",
    "moq": 500,
    "lead_time": "20 days"
})
```

### Track Product Costs by Supplier
```python
from crm_auth import pb_create
cost = pb_create("product_costs", {
    "product": product_id,
    "supplier": supplier_id,
    "cost_price": 3.80,
    "currency": "USD",
    "moq": 1000,
    "lead_time": "25 days",
    "valid_from": "2024-01-01"
})
```

### Import/Export Products
```python
# Export to Excel
url = f"{CRM_API_URL}/api/products/export"
# Import from Excel
url = f"{CRM_API_URL}/api/products/import"
# Download template
url = f"{CRM_API_URL}/api/items/template"
```

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/products/export` | GET | Export products to Excel |
| `/api/products/import` | POST | Import products from Excel |
| `/api/items/template` | GET | Download import template |
| `/api/product-costs` | GET | Get product cost data |
