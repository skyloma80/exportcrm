"""Order pipeline tool — PO analysis, SO creation, and PI sending."""
import sys
import os
from pathlib import Path

_SKILL_DIR = Path(__file__).resolve().parent.parent / "skills" / "crm-order-pipeline"
_SCRIPTS_DIR = _SKILL_DIR / "scripts"
sys.path.insert(0, str(_SCRIPTS_DIR))

from po_analyzer import analyze_po
from so_creator import create_so_from_po
from pi_sender import generate_and_send_pi


def process_po_flow(po_id: str, project_id: str | None = None,
                    email_to: str | None = None) -> dict:
    """Full PO → SO → PI flow.

    Args:
        po_id: PO record ID
        project_id: Optional project ID to associate
        email_to: Optional recipient email for PI

    Returns:
        Dict with analysis, so_creation, and pi_sending results
    """
    analysis = analyze_po(po_id)
    if not analysis.get("can_proceed_to_so"):
        return {
            "error": "PO contains items without prices",
            "analysis": analysis,
            "needs_quotation_for": analysis.get("needs_quotation_for", []),
        }

    so_result = create_so_from_po(po_id, project_id)
    if "error" in so_result:
        return {"error": so_result["error"], "analysis": analysis}

    pi_result = generate_and_send_pi(so_result["so_id"], email_to)

    return {
        "analysis": analysis,
        "so": so_result,
        "pi": pi_result,
        "status": "completed",
    }


__all__ = [
    "analyze_po",
    "create_so_from_po",
    "generate_and_send_pi",
    "process_po_flow",
]
