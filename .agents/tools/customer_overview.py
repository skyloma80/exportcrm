"""Get a complete overview of everything related to a customer.

Aggregates contacts, projects, quotations, and orders.
"""
from __future__ import annotations

from call_api import call_api


def customer_overview(customer_id: str) -> dict:
    """Comprehensive customer profile.

    Returns:
        Dict with customer, contacts, projects, quotations, orders.
    """
    customer = call_api("GET", f"customers/{customer_id}")

    contacts = call_api("GET", "customer_contacts", params={
        "filter": f'customer="{customer_id}"', "sort": "-is_primary",
    }).get("items", [])

    projects = call_api("GET", "projects", params={
        "filter": f'customer="{customer_id}"', "sort": "-created",
    }).get("items", [])

    quotations = call_api("GET", "quotations", params={
        "filter": f'customer="{customer_id}"', "sort": "-created",
    }).get("items", [])

    orders = call_api("GET", "so", params={
        "filter": f'customer_name~"{customer.get("name", "")}"', "sort": "-created",
    }).get("items", [])

    return {
        "customer": customer,
        "contacts": contacts,
        "projects_count": len(projects),
        "projects": projects,
        "quotations_count": len(quotations),
        "quotations": quotations,
        "orders_count": len(orders),
        "orders": orders,
    }
