"""Convert an accepted quotation into a sales order (SO).

Copies items JSON from quotation to SO with proper field mapping.
"""
from __future__ import annotations

from call_api import call_api


def quotation_to_so(quotation_id: str) -> dict:
    """Convert a quotation to a sales order.

    Copies line items, customer info, pricing, and terms.
    Sets status='draft' on the new SO.

    Returns:
        The created sales order record.
    """
    quotation = call_api("GET", f"quotations/{quotation_id}")

    items = quotation.get("items", [])
    so_items = []
    for item in items:
        so_items.append({
            "part_number": item.get("part_number", ""),
            "product_name": item.get("product_name", ""),
            "description_en": item.get("description_en"),
            "description_cn": item.get("description_cn"),
            "quantity": item.get("quantity", 0),
            "unit": item.get("unit", "pcs"),
            "unit_price": item.get("unit_price", 0),
            "amount": item.get("amount", 0),
            "cost_price": item.get("cost_price"),
        })

    return call_api("POST", "so", body={
        "customer_name": quotation.get("customer_name", ""),
        "currency": quotation.get("currency", "USD"),
        "total_amount": quotation.get("total_amount", 0),
        "items": so_items,
        "quotation": quotation_id,
        "project": quotation.get("project"),
        "incoterm": quotation.get("incoterm"),
        "port_of_loading": quotation.get("port_of_loading"),
        "port_of_destination": quotation.get("port_of_destination"),
        "payment_terms": quotation.get("payment_terms"),
        "status": "draft",
    })
