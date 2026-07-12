"""Advance a shipment through its logistics status flow.

Flow: preparing → booking → customs_clearance → loaded
      → handed_over → shipped → in_transit → arrived → delivered

Auto-records actual_departure/departure and actual_arrival on relevant transitions.
"""
from __future__ import annotations

from call_api import call_api
from datetime import date


_SHIPMENT_TRANSITIONS = {
    "preparing": "booking",
    "booking": "customs_clearance",
    "customs_clearance": "loaded",
    "loaded": "handed_over",
    "handed_over": "shipped",
    "shipped": "in_transit",
    "in_transit": "arrived",
    "arrived": "delivered",
}


def advance_shipment_status(shipment_id: str) -> dict:
    """Advance the shipment one step forward.

    Records actual_departure when status → shipped,
    records actual_arrival when status → delivered.

    Returns:
        Updated shipment record.

    Raises:
        ValueError: If at terminal status.
    """
    shipment = call_api("GET", f"shipments/{shipment_id}")
    current = shipment.get("status")
    if current not in _SHIPMENT_TRANSITIONS:
        raise ValueError(f"Shipment '{shipment_id}' is at terminal status '{current}'")

    next_status = _SHIPMENT_TRANSITIONS[current]
    body = {"status": next_status}
    if next_status == "shipped":
        body["actual_departure"] = date.today().isoformat()
    elif next_status == "delivered":
        body["actual_arrival"] = date.today().isoformat()

    return call_api("PATCH", f"shipments/{shipment_id}", body=body)
