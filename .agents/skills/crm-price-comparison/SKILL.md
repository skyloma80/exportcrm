---
name: crm-price-comparison
description: "Supplier price comparison and product cost analysis across suppliers"
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [CRM, Pricing, Suppliers, Comparison]
depends_on: [crm-auth, crm-rfqs, crm-suppliers]
---

# CRM Price Comparison Skill

Compare supplier prices for products, analyze RFQ quotations, and make sourcing decisions.

## Data Sources

| Collection | Purpose |
|-----------|---------|
| `product_costs` | Per-supplier product cost tracking |
| `rfqs` | RFQ records with supplier quotation tracking |
| `quotations` (from rfqs) | Supplier quotations on RFQ items |
| `suppliers` | Supplier master data |
| `products` | Product/item catalog |

## Common Operations

### Compare Product Prices Across Suppliers
```python
from crm_auth import pb_list, pb_get

# Get cost data for a product
costs = pb_list("product_costs", 
    f"filter=(product='{product_id}')&expand=supplier&sort=cost_price")

# Display sorted by price
for item in costs.get("items", []):
    supplier = item.get("expand", {}).get("supplier", {})
    print(f"{supplier.get('name')}: ${item.get('cost_price')} "
          f"(MOQ: {item.get('moq')}, Lead: {item.get('lead_time')})")
```

### Get Best Supplier for Product
```python
costs = pb_list("product_costs", 
    f"filter=(product='{product_id}')&sort=cost_price&perPage=1")
cheapest = costs.get("items", [None])[0]
if cheapest:
    supplier = cheapest.get("expand", {}).get("supplier", {})
    print(f"Best price: {supplier.get('name')} - ${cheapest.get('cost_price')}")
```

### Analyze RFQ Quotations
```python
# Get a supplier's quotation response to an RFQ
quotations = pb_list("quotations",
    f"filter=(rfq='{rfq_id}')&expand=supplier")

for q in quotations.get("items", []):
    supplier = q.get("expand", {}).get("supplier", {})
    print(f"\n{supplier.get('name')}:")
    print(f"  Total: ${q.get('total_amount')}")
    print(f"  Lead Time: {q.get('lead_time')}")
    print(f"  Payment Terms: {q.get('payment_terms')}")
```

### Sourcing Summary
```python
# Get AI-analyzed RFQ results
import urllib.request, json
url = f"{CRM_API_URL}/api/rfqs/{rfq_id}/ai-analyze"
req = urllib.request.Request(url, headers=get_pb_headers())
with urllib.request.urlopen(req) as r:
    analysis = json.loads(r.read())
    print(json.dumps(analysis, indent=2, ensure_ascii=False))
```

### Supplier Recommendation
The CRM has a RecommendationPanel component that compares:
- Price competitiveness
- Lead time
- Quality rating
- Past performance
- Payment terms

## RFQ to PO Conversion

When comparing supplier prices from an RFQ:

1. Get all quotations for the RFQ
2. Compare prices, lead times, payment terms
3. Select best supplier(s)
4. Generate purchase orders from selected items
5. Use `/api/rfqs/[id]/generate-purchase-orders` endpoint

```python
url = f"{CRM_API_URL}/api/rfqs/{rfq_id}/generate-purchase-orders"
data = {
    "selected_items": {
        "supplier_id_1": ["item_id_1", "item_id_2"],
        "supplier_id_2": ["item_id_3"]
    }
}
```

## Usage in Hermes

1. Load crm-auth + crm-price-comparison
2. Query product_costs for best pricing
3. Compare across suppliers
4. Recommend sourcing decision
5. Generate POs for selected suppliers
