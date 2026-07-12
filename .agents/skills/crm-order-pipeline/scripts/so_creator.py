"""Create Sales Order from PO data."""
from __future__ import annotations
import os
import sys
import random
from datetime import datetime
from typing import Any

_AGENTS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..")
sys.path.insert(0, os.path.abspath(_AGENTS_DIR))

try:
    from call_api import call_api
except ImportError:
    call_api = None


def create_so_from_po(po_id: str, project_id: str | None = None) -> dict:
    """Create a Sales Order from an existing PO.

    Steps:
    1. Fetch PO record
    2. Map fields to SO structure
    3. Create SO with status=draft
    4. Log activity

    Args:
        po_id: PocketBase record ID of the PO
        project_id: Optional project to associate

    Returns:
        Dict with so_id, so_code, status, total_amount
    """
    po = _get_po(po_id)
    if not po:
        return {"error": f"PO {po_id} not found"}

    items = po.get("items", []) or []
    total_amount = sum(
        float(item.get("amount", 0) or float(item.get("unit_price", 0)) * float(item.get("quantity", 0)))
        for item in items
    )

    so_data = _build_so_data(po, items, total_amount, project_id)
    so = _create_so_record(so_data)
    if not so:
        return {"error": "Failed to create SO"}

    _log_activity("create", "so", so.get("id", ""), so_data.get("code", ""))

    return {
        "so_id": so.get("id"),
        "so_code": so_data.get("code", ""),
        "status": "draft",
        "total_amount": round(total_amount, 2),
        "items_count": len(items),
        "customer_name": so_data.get("customer_name", ""),
    }


def _get_po(po_id: str) -> dict | None:
    """Fetch PO record from PocketBase."""
    if call_api is None:
        return None
    try:
        return call_api("GET", f"po/{po_id}")
    except Exception:
        return None


def _build_so_data(po: dict, items: list, total_amount: float,
                    project_id: str | None) -> dict:
    """Build SO data dict from PO data."""
    code = _generate_so_code()

    # Map PO items to SO items
    so_items = []
    for i, item in enumerate(items):
        qty = float(item.get("quantity", 0))
        price = float(item.get("unit_price", 0))
        amt = float(item.get("amount", 0))
        if not amt:
            amt = qty * price

        so_items.append({
            "id": str(i + 1),
            "product_name": item.get("product_name", ""),
            "part_number": item.get("part_number", ""),
            "description_en": item.get("description_en", ""),
            "description_cn": item.get("description_cn", ""),
            "quantity": qty,
            "unit": item.get("unit", "pcs"),
            "unit_price": price,
            "amount": amt,
            "cost_price": item.get("cost_price", 0),
        })

    # Map PO supplier as SO customer (the PO was sent to supplier,
    # so the supplier becomes the customer on the SO side)
    so_data = {
        "code": code,
        "customer_id": po.get("supplier_id", ""),
        "customer_name": po.get("supplier_name", ""),
        "customer_po": po.get("code", ""),
        "currency": po.get("currency", "USD"),
        "incoterm": po.get("incoterm", ""),
        "remarks": po.get("remarks", ""),
        "total_amount": round(total_amount, 2),
        "status": "draft",
        "items": so_items,
        "expected_delivery_date": po.get("expected_delivery_date", ""),
    }

    if project_id:
        so_data["project_id"] = project_id

    return so_data


def _create_so_record(data: dict) -> dict | None:
    """Create SO record in PocketBase."""
    if call_api is None:
        return None
    try:
        return call_api("POST", "so", body=data)
    except Exception:
        return None


def _generate_so_code() -> str:
    """Generate a unique SO code."""
    import random
    date_part = datetime.now().strftime("%y%m%d")
    rand_part = random.randint(1000, 9999)
    return f"SO-{date_part}-{rand_part}"


def _log_activity(action: str, entity_type: str, entity_id: str,
                   entity_name: str):
    """Record operation in activity_logs."""
    if call_api is None:
        return
    try:
        call_api("POST", "activity_logs", body={
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "entity_name": entity_name,
        })
    except Exception:
        pass
