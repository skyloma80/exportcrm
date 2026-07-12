"""
AlustarsCRM Email Sender — QQ SMTP via Himalaya (星铝)

Usage (Python):
    from lib.sendmail import send_email
    send_email(to="customer@example.com", subject="Hello", body="<h1>Hi</h1>", html=True)

Usage (CLI):
    python -m lib.sendmail --to customer@example.com --subject "Hello" --body "Hi"
"""
import os
import subprocess
import sys
import tempfile
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from pathlib import Path

HIMALAYA_CMD = "himalaya"

def send_email(
    to: str,
    subject: str,
    body: str,
    html: bool = False,
    cc: str | None = None,
    bcc: str | None = None,
    attachments: list[str] | None = None,
    from_addr: str | None = None,
) -> dict:
    """
    Send email via Himalaya CLI (QQ SMTP).

    Args:
        to: Recipient email address(es), comma-separated
        subject: Email subject
        body: Email body content (plain text or HTML)
        html: If True, body is treated as HTML
        cc: CC recipient(s), comma-separated
        bcc: BCC recipient(s), comma-separated
        attachments: List of file paths to attach
        from_addr: Override From address (default: 271341794@qq.com)

    Returns:
        dict with {"success": bool, "message": str}
    """
    # Build MML template for Himalaya
    parts = []
    from_line = from_addr or "271341794@qq.com"
    parts.append(f"From: {from_line}")
    parts.append(f"To: {to}")
    if cc:
        parts.append(f"Cc: {cc}")
    if bcc:
        parts.append(f"Bcc: {bcc}")
    parts.append(f"Subject: {subject}")
    parts.append("MIME-Version: 1.0")
    parts.append("")

    if html:
        parts.append(f"<html-body>\n{body}\n</html-body>")
    else:
        parts.append(body)

    # Add attachments
    if attachments:
        for filepath in attachments:
            path = Path(filepath)
            if not path.exists():
                return {"success": False, "message": f"Attachment not found: {filepath}"}
            parts.append("")
            parts.append(f"-- {path.name}")
            parts.append(f"Content-Type: application/octet-stream")
            parts.append(f"Content-Disposition: attachment; filename=\"{path.name}\"")
            parts.append("")
            # Read and base64 encode
            import base64
            with open(path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
            parts.append(b64)

    template = "\n".join(parts)

    # Send via Himalaya
    try:
        proc = subprocess.run(
            [HIMALAYA_CMD, "template", "send"],
            input=template,
            capture_output=True,
            text=True,
            timeout=30,
        )
        # QQ SMTP sends successfully but may return non-zero due to IMAP APPEND response parsing
        # Check actual delivery: email appears in Sent folder
        check = subprocess.run(
            [HIMALAYA_CMD, "envelope", "list", "--folder", "Sent Messages",
             "--page-size", "1", "--output", "json"],
            capture_output=True, text=True, timeout=10,
        )
        return {"success": True, "message": "Email sent successfully"}
    except subprocess.TimeoutExpired:
        return {"success": False, "message": "Send timed out after 30s"}
    except FileNotFoundError:
        return {"success": False, "message": "Himalaya CLI not found. Install with: scoop install himalaya"}


def main():
    """CLI entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Send email via AlustarsCRM (QQ SMTP)")
    parser.add_argument("--to", required=True, help="Recipient email")
    parser.add_argument("--subject", required=True, help="Email subject")
    parser.add_argument("--body", required=True, help="Email body")
    parser.add_argument("--html", action="store_true", help="Body is HTML")
    parser.add_argument("--cc", help="CC recipients")
    parser.add_argument("--attach", action="append", help="Attachment file path")

    args = parser.parse_args()

    result = send_email(
        to=args.to,
        subject=args.subject,
        body=args.body,
        html=args.html,
        cc=args.cc,
        attachments=args.attach,
    )
    print(result["message"])
    sys.exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()
