"""Advance a purchase order to the next status.

Status flow: draft → sent → confirmed → in_production
             → shipped → delivered → completed
Cancellation: any non-final → cancelled
"""
from __future__ import annotations

from call_api import call_api


_PO_TRANSITIONS = {
    "draft": "sent",
    "sent": "confirmed",
    "confirmed": "in_production",
    "in_production": "shipped",
    "shipped": "delivered",
    "delivered": "completed",
}


def advance_po_status(po_id: str) -> dict:
    """Advance the PO one step forward.

    Returns:
        Updated PO record.

    Raises:
        ValueError: If at terminal status.
    """
    po = call_api("GET", f"po/{po_id}")
    current = po.get("status")
    if current not in _PO_TRANSITIONS:
        raise ValueError(f"PO '{po_id}' is at terminal status '{current}', cannot advance")
    return call_api("PATCH", f"po/{po_id}", body={"status": _PO_TRANSITIONS[current]})


def cancel_po(po_id: str) -> dict:
    """Cancel a purchase order."""
    po = call_api("GET", f"po/{po_id}")
    if po.get("status") in ("completed", "cancelled"):
        raise ValueError(f"PO '{po_id}' is already terminal")
    return call_api("PATCH", f"po/{po_id}", body={"status": "cancelled"})
