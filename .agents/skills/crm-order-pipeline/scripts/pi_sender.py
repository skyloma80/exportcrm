"""Generate PI and send via email."""
from __future__ import annotations
import os
import sys
from pathlib import Path

_AGENTS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..")
_SKILL_SCRIPTS = os.path.join(_AGENTS_DIR, "skills", "crm-excel", "scripts")
sys.path.insert(0, os.path.abspath(_AGENTS_DIR))
sys.path.insert(0, os.path.abspath(_SKILL_SCRIPTS))

try:
    from call_api import call_api
except ImportError:
    call_api = None

try:
    from excel_pi_generator import ExcelPIGenerator as _PIGen
    _COUNTRY_MAP = {
        "CN": "China", "US": "United States", "ES": "Spain",
        "DE": "Germany", "FR": "France", "GB": "United Kingdom",
        "IT": "Italy", "NL": "Netherlands", "SG": "Singapore",
        "JP": "Japan", "KR": "South Korea", "AU": "Australia",
        "CA": "Canada", "MX": "Mexico", "BR": "Brazil", "IN": "India",
        "TH": "Thailand", "VN": "Vietnam", "MY": "Malaysia",
        "AE": "United Arab Emirates", "RU": "Russia",
    }
    _PI_TEMPLATE = os.path.join(_AGENTS_DIR, "skills", "crm-excel", "templates", "PI-template.xlsx")
    _PI_GEN = _PIGen(country_map=_COUNTRY_MAP)
except ImportError:
    _PI_GEN = None


def _export_pi(so: dict) -> bytes | None:
    """Generate PI Excel bytes using local generator.

    Args:
        so: SO record dict from PocketBase.

    Returns:
        Raw .xlsx bytes, or None on failure.
    """
    if not _PI_GEN:
        return None
    try:

        items_raw = so.get("items") or []
        items = []
        for it in items_raw:
            items.append({
                "part_number": it.get("part_number") or it.get("product_code") or "",
                "description_en": it.get("description_en") or it.get("product_name") or "",
                "quantity": it.get("quantity") or 1,
                "unit": it.get("unit") or "PCS",
                "unit_price": it.get("unit_price") or 0,
                "amount": it.get("amount") or 0,
            })

        order = {
            "code": so.get("code", ""),
            "customer_name": so.get("customer_name", ""),
            "customer_address": so.get("customer_address", ""),
            "customer_tax_id": so.get("customer_tax_id", ""),
            "created": so.get("created", ""),
            "items": items,
            "payment_terms": so.get("payment_terms", ""),
            "incoterm": so.get("incoterm", so.get("port_of_loading", "")),
            "country_of_origin": so.get("country_of_origin", ""),
            "country_of_destination": so.get("country_of_destination", so.get("port_of_destination", "")),
            "port_of_loading": so.get("port_of_loading", ""),
            "port_of_destination": so.get("port_of_destination", ""),
            "mode_of_shipment": so.get("mode_of_shipment", ""),
            "estimated_shipping_date": so.get("estimated_shipping_date", ""),
            "total_amount": so.get("total_amount", 0),
        }
        return _PI_GEN.generate(_PI_TEMPLATE, order)
    except Exception:
        return None


def generate_and_send_pi(so_id: str, email_to: str | None = None) -> dict:
    """Generate PI Excel and send via email.

    Steps:
    1. Fetch SO data
    2. Generate PI Excel via local ExcelPIGenerator
    3. Save Excel to temp directory
    4. If email_to not specified, get from SO customer contacts
    5. Send email with PI attachment
    6. Log activity

    Args:
        so_id: PocketBase record ID of the SO
        email_to: Optional recipient email

    Returns:
        Dict with pi_file, email_sent_to, status
    """
    so = _get_so(so_id)
    if not so:
        return {"error": f"SO {so_id} not found"}

    so_code = so.get("code", "SO-unknown")

    # Generate PI Excel
    temp_dir = Path(__file__).resolve().parent / "temp"
    temp_dir.mkdir(exist_ok=True)
    pi_path = temp_dir / f"PI-{so_code}.xlsx"

    pi_bytes = _export_pi(so)
    if pi_bytes:
        pi_path.write_bytes(pi_bytes)
    else:
        return {"error": "PI generation failed"}

    # Resolve email
    if not email_to:
        email_to = _find_customer_email(so)

    # Send email
    email_sent = False
    if email_to:
        email_sent = _send_pi_email(email_to, so_code, str(pi_path))

    _log_activity("export", "so", so_id, f"PI-{so_code}")

    return {
        "so_id": so_id,
        "so_code": so_code,
        "pi_file": str(pi_path),
        "pi_file_name": f"PI-{so_code}.xlsx",
        "email_sent_to": email_to,
        "email_sent": email_sent,
    }


def _get_so(so_id: str) -> dict | None:
    """Fetch SO record from PocketBase."""
    if call_api is None:
        return None
    try:
        return call_api("GET", f"so/{so_id}")
    except Exception:
        return None


def _find_customer_email(so: dict) -> str | None:
    """Find customer primary contact email from SO data."""
    customer_id = so.get("customer_id")
    if not customer_id or call_api is None:
        return None

    try:
        result = call_api("GET", "customer_contacts", params={
            "filter": f'customer="{customer_id}"&&is_primary=true',
            "perPage": "1",
        })
        items = result.get("items", [])
        if items and items[0].get("email"):
            return items[0]["email"]

        # Fall back to first contact
        result = call_api("GET", "customer_contacts", params={
            "filter": f'customer="{customer_id}"',
            "perPage": "1",
        })
        items = result.get("items", [])
        if items and items[0].get("email"):
            return items[0]["email"]
    except Exception:
        pass

    return None


def _send_pi_email(to: str, so_code: str, pi_path: str) -> bool:
    """Send PI via email using send_email tool."""
    try:
        sys.path.insert(0, os.path.join(_AGENTS_DIR, "tools"))
        from send_email import send_email

        subject = f"PI-{so_code} Proforma Invoice"
        body = f"""<html><body>
<h2>Proforma Invoice - {so_code}</h2>
<p>Dear Customer,</p>
<p>Please find attached the Proforma Invoice {so_code}.</p>
<p>Best regards,<br>Alustars Team</p>
</body></html>"""

        result = send_email(
            to=to,
            subject=subject,
            body=body,
            attachments=[pi_path],
        )
        return result.get("success", False)
    except Exception:
        return False


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
