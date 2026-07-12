"""Send branded emails via SMTP.

Uces environment variables for credentials:
CRM_SMTP_HOST, CRM_SMTP_PORT, CRM_SMTP_USER, CRM_SMTP_PASS, CRM_SMTP_FROM
"""
from __future__ import annotations

import os
import subprocess
from pathlib import Path


_SCRIPT = Path(__file__).resolve().parent.parent / "skills" / "crm-email" / "scripts" / "crm_email_send.py"


def send_email(
    to: str,
    subject: str,
    body: str,
    attachments: list[str] | None = None,
) -> dict:
    """Send a simple HTML email.

    Args:
        to: Recipient email
        subject: Subject line
        body: HTML body
        attachments: Optional file paths to attach

    Returns:
        {"success": true/false, "message": ..., "error": ...}
    """
    cmd = ["python", str(_SCRIPT), "send", to, "--subject", subject, "--body", body]
    if attachments:
        for a in attachments:
            cmd.extend(["--attachments", a])
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return {"success": False, "error": result.stderr.strip()}
    return {"success": True, "message": result.stdout.strip()}


def send_quotation_email(
    to: str,
    subject: str,
    quotation_code: str,
    total_amount: str,
) -> dict:
    """Send a branded quotation email using the email template.

    Args:
        to: Recipient email
        subject: Subject line
        quotation_code: Quotation number for reference
        total_amount: Formatted total e.g. "USD 5,000.00"
    """
    cmd = [
        "python", str(_SCRIPT), "template-quotation",
        to, "--subject", subject,
        "--quotation-code", quotation_code,
        "--total-amount", total_amount,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return {"success": False, "error": result.stderr.strip()}
    return {"success": True, "message": result.stdout.strip()}
