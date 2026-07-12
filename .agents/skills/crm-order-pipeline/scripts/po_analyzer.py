"""PO analysis — check pricing, product matching, and margin analysis."""
from __future__ import annotations
import os
import sys
from typing import Any

_AGENTS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..")
sys.path.insert(0, os.path.abspath(_AGENTS_DIR))

try:
    from call_api import call_api
except ImportError:
    call_api = None


def analyze_po(po_id: str) -> dict:
    """Analyze a Purchase Order for pricing and product completeness.

    Args:
        po_id: PocketBase record ID of the PO

    Returns:
        Dict with items analysis and recommendations:
        {
            "po": {"id", "code", "supplier_name", ...},
            "items_analysis": [
                {
                    "product_name": str,
                    "has_price": bool,
                    "unit_price": float|None,
                    "product_match": "found" | "not_found" | "partial",
                    "product_id": str|None,
                    "cost_price": float|None,
                    "margin": float|None,
                    "needs_quotation": bool,
                }
            ],
            "all_priced": bool,
            "needs_quotation_for": [str],
            "can_proceed_to_so": bool,
        }
    """
    po = _get_po(po_id)
    if not po:
        return {"error": f"PO {po_id} not found"}

    items = po.get("items", []) or []
    items_analysis = []
    needs_quotation = []

    for item in items:
        analysis = _analyze_item(item)
        items_analysis.append(analysis)
        if analysis.get("needs_quotation"):
            needs_quotation.append(analysis["product_name"])

    all_priced = all(a.get("has_price", False) for a in items_analysis)
    can_proceed = all_priced

    return {
        "po": {
            "id": po.get("id"),
            "code": po.get("code", ""),
            "supplier_name": po.get("supplier_name", ""),
            "currency": po.get("currency", "USD"),
            "total_amount": po.get("total_amount", 0),
            "status": po.get("status", ""),
        },
        "items_analysis": items_analysis,
        "all_priced": all_priced,
        "needs_quotation_for": needs_quotation,
        "can_proceed_to_so": can_proceed,
    }


def _get_po(po_id: str) -> dict | None:
    """Fetch PO record from PocketBase."""
    if call_api is None:
        return None
    try:
        return call_api("GET", f"po/{po_id}")
    except Exception:
        return None


def _analyze_item(item: dict) -> dict:
    """Analyze a single PO line item."""
    product_name = item.get("product_name", "")
    unit_price = item.get("unit_price")
    quantity = item.get("quantity", 0)

    has_price = unit_price is not None and float(unit_price) > 0
    if has_price:
        unit_price = float(unit_price)

    # Try to match product in database
    product_match, product_id, cost_price = _match_product(product_name)

    margin = None
    if has_price and cost_price is not None:
        margin = round((unit_price - cost_price) / unit_price * 100, 1)

    needs_quotation = not has_price

    return {
        "product_name": product_name,
        "part_number": item.get("part_number", ""),
        "quantity": quantity,
        "has_price": has_price,
        "unit_price": unit_price,
        "product_match": product_match,
        "product_id": product_id,
        "cost_price": cost_price,
        "margin": margin,
        "needs_quotation": needs_quotation,
    }


def _match_product(name: str) -> tuple[str, str | None, float | None]:
    """Match product name against database.

    Returns: (status, product_id, cost_price)
    """
    if not name or call_api is None:
        return ("no_data", None, None)

    name_clean = name.strip().replace('"', '\\"')

    # Search by name
    try:
        result = call_api("GET", "products", params={
            "filter": f'name="{name_clean}"',
            "perPage": "1",
        })
        items = result.get("items", [])
        if items:
            best = items[0]
            cost = _get_best_cost(best.get("id", ""))
            return ("found", best.get("id"), cost)
    except Exception:
        pass

    # Fuzzy search
    try:
        keywords = [w for w in name.split() if len(w) > 2][:3]
        for kw in keywords:
            result = call_api("GET", "products", params={
                "filter": f'name~"{kw}"',
                "perPage": "1",
            })
            items = result.get("items", [])
            if items:
                best = items[0]
                import difflib
                ratio = difflib.SequenceMatcher(None,
                    name.lower(), best.get("name", "").lower()).ratio()
                if ratio > 0.5:
                    cost = _get_best_cost(best.get("id", ""))
                    return ("partial", best.get("id"), cost)
    except Exception:
        pass

    return ("not_found", None, None)


def _get_best_cost(product_id: str) -> float | None:
    """Get the best (cheapest) cost price for a product."""
    if call_api is None:
        return None
    try:
        result = call_api("GET", "product_costs", params={
            "filter": f'product="{product_id}"',
            "sort": "tiers",
            "perPage": "1",
        })
        items = result.get("items", [])
        if items and items[0].get("tiers"):
            tiers = items[0]["tiers"]
            if isinstance(tiers, list) and tiers:
                return float(tiers[0].get("unit_price", 0))
    except Exception:
        pass
    return None
