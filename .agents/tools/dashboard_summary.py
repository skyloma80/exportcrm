"""Get a comprehensive business dashboard summary.

Reads aggregations across all major collections.
"""
from __future__ import annotations

from call_api import call_api


def _count_by(collection: str, field: str, values: list[str] | None = None) -> dict:
    """Helper: count records grouped by a field value."""
    result = call_api("GET", collection, params={"perPage": "200"})
    items = result.get("items", [])
    counts: dict[str, int] = {}
    for item in items:
        val = item.get(field, "unknown")
        counts[val] = counts.get(val, 0) + 1
    return {"total": len(items), f"by_{field}": counts}


def dashboard_summary() -> dict:
    """Get key business metrics across all collections.

    Returns:
        Dict with customer, project, order, quotation, supplier, product stats.
    """
    orders = call_api("GET", "so", params={"perPage": "200"})
    order_items = orders.get("items", [])
    by_status: dict[str, int] = {}
    total_revenue = 0.0
    for o in order_items:
        s = o.get("status", "unknown")
        by_status[s] = by_status.get(s, 0) + 1
        if s not in ("cancelled", "draft"):
            total_revenue += float(o.get("total_amount", 0) or 0)

    return {
        "customers": _count_by("customers", "type"),
        "projects": _count_by("projects", "stage"),
        "orders": {
            "total": len(order_items),
            "by_status": by_status,
            "total_revenue": round(total_revenue, 2),
        },
        "quotations": _count_by("quotations", "status"),
        "suppliers": _count_by("suppliers", "type"),
        "products": _count_by("products", "category"),
    }
