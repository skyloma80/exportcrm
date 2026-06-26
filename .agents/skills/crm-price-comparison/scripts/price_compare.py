#!/usr/bin/env python3
import sys, os, json, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from authenticate import pb_list, pb_get, CRM_API_URL, _headers

def best_price(product_id):
    """Get cheapest supplier for a product."""
    costs = pb_list("product_costs", f"filter=(product='{product_id}')&expand=supplier&sort=cost_price&perPage=5")
    items = costs.get("items", [])
    for i in items:
        s = i.get("expand", {}).get("supplier", {})
        i["_supplier_name"] = s.get("name", "")
    return {"product_id": product_id, "best": items[0] if items else None, "all": items}

def compare_across_suppliers(product_id):
    """Get all supplier prices for a product, sorted by price."""
    return best_price(product_id)

def rfq_quotation_comparison(rfq_id):
    """Compare all quotations received for an RFQ."""
    qs = pb_list("quotations", f"filter=(rfq='{rfq_id}')&expand=supplier")
    items = qs.get("items", [])
    for q in items:
        s = q.get("expand", {}).get("supplier", {})
        q["_supplier_name"] = s.get("name", "")
    # Sort by total_amount
    items.sort(key=lambda x: float(x.get("total_amount", 0) or 0))
    return {"rfq_id": rfq_id, "comparisons": items}

def ai_analyze_rfq(rfq_id):
    """Use AI to analyze RFQ responses."""
    url = f"{CRM_API_URL}/api/rfqs/{rfq_id}/ai-analyze"
    req = urllib.request.Request(url, headers=_headers())
    with urllib.request.urlopen(req) as r: return json.loads(r.read())

if __name__ == "__main__":
    if len(sys.argv) < 3: print("Usage: price_compare.py <best|compare|rfq|analyze> <product_id|rfq_id>"); sys.exit(1)
    cmd, rid = sys.argv[1], sys.argv[2]
    try:
        if cmd == "best": result = best_price(rid)
        elif cmd == "compare": result = compare_across_suppliers(rid)
        elif cmd == "rfq": result = rfq_quotation_comparison(rid)
        elif cmd == "analyze": result = ai_analyze_rfq(rid)
        else: print("Unknown command"); sys.exit(1)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e: print(json.dumps({"error": str(e)}, ensure_ascii=False)); sys.exit(1)
