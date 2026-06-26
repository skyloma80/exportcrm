#!/usr/bin/env python3
import sys, os, json, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from authenticate import pb_list, pb_get, CRM_API_URL, _headers

def send_quotation_email(qid, to_emails, language="en", subject="", message="", attachments=None):
    url = f"{CRM_API_URL}/api/quotations/{qid}/send-email"
    data = {"recipient_emails": to_emails, "language": language, "subject": subject, "message": message}
    if attachments: data["attachments"] = attachments
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=_headers(), method="POST")
    with urllib.request.urlopen(req) as r: return json.dumps({"success": True})

def send_rfq_email(rfq_id, supplier_ids, language="cn", subject="", message="", attachment_note=""):
    url = f"{CRM_API_URL}/api/rfqs/{rfq_id}/send-email"
    data = {"supplier_ids": supplier_ids, "language": language, "subject": subject, "message": message}
    if attachment_note: data["attachment_note"] = attachment_note
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=_headers(), method="POST")
    with urllib.request.urlopen(req) as r: return json.dumps({"success": True})

def send_invoice_email(inv_id, to_emails, language="en", subject="", message=""):
    url = f"{CRM_API_URL}/api/invoices/{inv_id}/send-email"
    data = {"recipient_emails": to_emails, "language": language, "subject": subject, "message": message}
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=_headers(), method="POST")
    with urllib.request.urlopen(req) as r: return json.dumps({"success": True})

def get_smtp_settings(user_id):
    return pb_list("user_settings", f"filter=(user_id='{user_id}')")

if __name__ == "__main__":
    if len(sys.argv) < 2: print("Usage: email.py <send-quotation|send-rfq|send-invoice|smtp-settings> [args]"); sys.exit(1)
    cmd = sys.argv[1]
    try:
        if cmd == "send-quotation" and len(sys.argv)>2:
            data = json.loads(sys.stdin.read()) if not sys.stdin.isatty() else {}
            result = send_quotation_email(sys.argv[2], **data)
        elif cmd == "send-rfq" and len(sys.argv)>2:
            data = json.loads(sys.stdin.read()) if not sys.stdin.isatty() else {}
            result = send_rfq_email(sys.argv[2], **data)
        elif cmd == "send-invoice" and len(sys.argv)>2:
            data = json.loads(sys.stdin.read()) if not sys.stdin.isatty() else {}
            result = send_invoice_email(sys.argv[2], **data)
        elif cmd == "smtp-settings" and len(sys.argv)>2:
            result = get_smtp_settings(sys.argv[2])
        else: print("Unknown command"); sys.exit(1)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e: print(json.dumps({"error": str(e)}, ensure_ascii=False)); sys.exit(1)
