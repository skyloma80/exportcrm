"""Approve or reject payments (order_payments and po_payments).

Two tables, same logic: set status + timestamp + optional approver.
"""
from __future__ import annotations

from call_api import call_api
from datetime import date


def _now() -> str:
    return date.today().isoformat()


def approve_order_payment(payment_id: str, approved_by: str | None = None) -> dict:
    return call_api("PATCH", f"order_payments/{payment_id}", body={
        "status": "approved", "approved_at": _now(),
        **( {"approved_by": approved_by} if approved_by else {} ),
    })


def approve_po_payment(payment_id: str, approved_by: str | None = None) -> dict:
    return call_api("PATCH", f"po_payments/{payment_id}", body={
        "status": "approved", "approved_at": _now(),
        **( {"approved_by": approved_by} if approved_by else {} ),
    })


def reject_order_payment(payment_id: str, reason: str, approved_by: str | None = None) -> dict:
    return call_api("PATCH", f"order_payments/{payment_id}", body={
        "status": "rejected", "rejection_reason": reason, "approved_at": _now(),
        **( {"approved_by": approved_by} if approved_by else {} ),
    })


def reject_po_payment(payment_id: str, reason: str, approved_by: str | None = None) -> dict:
    return call_api("PATCH", f"po_payments/{payment_id}", body={
        "status": "rejected", "rejection_reason": reason, "approved_at": _now(),
        **( {"approved_by": approved_by} if approved_by else {} ),
    })
