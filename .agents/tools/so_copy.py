"""Duplicate a sales order with a new code.

Copies all fields including items, sets status='draft'.
Useful for creating orders based on a previous order.
"""
from __future__ import annotations

from call_api import call_api
from datetime import date


def so_copy(source_so_id: str) -> dict:
    """Create a new sales order based on an existing one.

    The new order copies items, pricing, customer info, and terms.
    Status is set to 'draft', code is auto-generated.

    Returns:
        The new sales order record.
    """
    source = call_api("GET", f"so/{source_so_id}")

    body = {
        "customer_name": source.get("customer_name", ""),
        "customer_address": source.get("customer_address"),
        "customer_tax_id": source.get("customer_tax_id"),
        "customer_po": source.get("customer_po"),
        "currency": source.get("currency", "USD"),
        "incoterm": source.get("incoterm"),
        "port_of_loading": source.get("port_of_loading"),
        "port_of_destination": source.get("port_of_destination"),
        "payment_terms": source.get("payment_terms"),
        "bank_info": source.get("bank_info"),
        "country_of_origin": source.get("country_of_origin"),
        "country_of_destination": source.get("country_of_destination"),
        "mode_of_shipment": source.get("mode_of_shipment"),
        "shipping_marks": source.get("shipping_marks"),
        "expected_delivery_date": source.get("expected_delivery_date"),
        "total_amount": source.get("total_amount", 0),
        "items": source.get("items", []),
        "status": "draft",
    }
    return call_api("POST", "so", body=body)
