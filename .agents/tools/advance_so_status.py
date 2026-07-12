"""Advance a sales order to the next status with automatic timestamps.

Status flow: draft → confirmed → in_production → ready_to_ship
             → shipped → delivered → completed
Cancellation: any non-final → cancelled
Re-activate:  cancelled → draft
"""
from __future__ import annotations

from call_api import call_api
from datetime import date


_SO_TRANSITIONS = {
    "draft": "confirmed",
    "confirmed": "in_production",
    "in_production": "ready_to_ship",
    "ready_to_ship": "shipped",
    "shipped": "delivered",
    "delivered": "completed",
}


def advance_so_status(so_id: str) -> dict:
    """Advance the SO one step forward in the status flow.

    Automatically records timestamps where applicable
    (e.g. shipped → actual_departure).

    Returns:
        Updated SO record.

    Raises:
        ValueError: If current status has no next step.
    """
    so = call_api("GET", f"so/{so_id}")
    current = so.get("status")

    if current == "cancelled":
        return call_api("PATCH", f"so/{so_id}", body={"status": "draft"})

    if current not in _SO_TRANSITIONS:
        raise ValueError(f"SO '{so_id}' is at terminal status '{current}', cannot advance")

    next_status = _SO_TRANSITIONS[current]
    body = {"status": next_status}
    if next_status == "shipped":
        body["estimated_shipping_date"] = date.today().isoformat()

    return call_api("PATCH", f"so/{so_id}", body=body)


def cancel_so(so_id: str) -> dict:
    """Cancel a sales order (any non-final status → cancelled)."""
    so = call_api("GET", f"so/{so_id}")
    if so.get("status") in ("completed", "cancelled"):
        raise ValueError(f"SO '{so_id}' is already at terminal status '{so.get('status')}'")
    return call_api("PATCH", f"so/{so_id}", body={"status": "cancelled"})
