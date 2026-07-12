"""Compare a product's prices across all suppliers.

Reads product_costs with expanded supplier info,
evaluates tiered pricing, and returns sorted results.
"""
from __future__ import annotations

from call_api import call_api


def compare_prices(product_id: str) -> list[dict]:
    """Compare pricing across all suppliers for a product.

    Returns each supplier's cost info with tiered pricing,
    sorted by preferred status then price.

    Args:
        product_id: Product record ID

    Returns:
        List of {supplier_id, supplier_name, currency, moq,
                 lead_time_days, tiers, is_preferred, valid_until}
    """
    result = call_api("GET", "product_costs", params={
        "filter": f'product="{product_id}"',
        "expand": "supplier",
        "sort": "-is_preferred,valid_from",
        "perPage": "50",
    })
    items = result.get("items", [])
    output = []
    for item in items:
        expand = item.get("expand", {})
        supplier = expand.get("supplier", {})
        output.append({
            "supplier_id": item.get("supplier"),
            "supplier_name": supplier.get("name", "Unknown"),
            "supplier_code": supplier.get("code", ""),
            "currency": item.get("currency"),
            "moq": item.get("moq"),
            "lead_time_days": item.get("lead_time_days"),
            "tiers": item.get("tiers", []),
            "is_preferred": item.get("is_preferred", False),
            "valid_from": item.get("valid_from"),
            "valid_until": item.get("valid_until"),
        })
    return output
