"""Find the best (cheapest) supplier price for a given quantity.

Evaluates tiered pricing across all suppliers offering
a price that covers the requested quantity.
"""
from __future__ import annotations

from tools.compare_prices import compare_prices


def best_price(product_id: str, quantity: int = 1) -> dict | None:
    """Find the cheapest supplier for a given quantity.

    Evaluates each supplier's tiered pricing to find the
    lowest unit price that satisfies quantity.

    Args:
        product_id: Product record ID
        quantity: Desired order quantity

    Returns:
        {supplier_name, currency, unit_price, moq, lead_time_days, is_preferred}
        or None if no pricing found.
    """
    suppliers = compare_prices(product_id)
    best = None
    best_price_val = float("inf")

    for s in suppliers:
        for tier in s.get("tiers", []):
            min_qty = tier.get("minQty", 0)
            max_qty = tier.get("maxQty")
            unit_price = tier.get("unitPrice", float("inf"))

            if quantity >= min_qty and (max_qty is None or quantity <= max_qty):
                if unit_price < best_price_val:
                    best_price_val = unit_price
                    best = {
                        "supplier_name": s["supplier_name"],
                        "supplier_code": s["supplier_code"],
                        "currency": s["currency"],
                        "unit_price": unit_price,
                        "moq": s["moq"],
                        "lead_time_days": s["lead_time_days"],
                        "is_preferred": s["is_preferred"],
                    }
                break

    return best
