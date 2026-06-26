#!/usr/bin/env python3
import sys, os, json, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from authenticate import pb_list, pb_get, pb_create, pb_update, pb_delete, CRM_API_URL, _headers

def list_quotations(status=""):
    params = "sort=-created&perPage=100&expand=customer,project"
    if status:
        params += f"&filter=(status='{status}')"
    return pb_list("quotations", params)

def get_quotation(qid):
    return pb_get("quotations", qid, "customer,project")

def create_quotation(data):
    return pb_create("quotations", data)

def update_quotation(qid, data):
    return pb_update("quotations", qid, data)

def revise_quotation(qid):
    url = f"{CRM_API_URL}/api/quotations/{qid}/revise"
    req = urllib.request.Request(url, headers=_headers(), method="POST")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def convert_to_order(qid):
    url = f"{CRM_API_URL}/api/quotations/{qid}/convert-to-order"
    req = urllib.request.Request(url, headers=_headers(), method="POST")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def send_email(qid, to_emails, language="en", subject="", message="", attachments=None):
    import urllib.request
    url = f"{CRM_API_URL}/api/quotations/{qid}/send-email"
    data = {"recipient_emails": to_emails, "language": language, "subject": subject, "message": message}
    if attachments:
        data["attachments"] = attachments
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=_headers(), method="POST")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: quotations.py <list|get|create|update|revise|to-order|send-email> [args]")
        sys.exit(1)
    cmd = sys.argv[1]
    try:
        if cmd == "list":
            status = sys.argv[2] if len(sys.argv) > 2 else ""
            result = list_quotations(status)
        elif cmd == "get" and len(sys.argv) > 2:
            result = get_quotation(sys.argv[2])
        elif cmd == "create":
            result = create_quotation(json.loads(sys.stdin.read()))
        elif cmd == "update" and len(sys.argv) > 2:
            result = update_quotation(sys.argv[2], json.loads(sys.stdin.read()))
        elif cmd == "revise" and len(sys.argv) > 2:
            result = revise_quotation(sys.argv[2])
        elif cmd == "to-order" and len(sys.argv) > 2:
            result = convert_to_order(sys.argv[2])
        elif cmd == "send-email" and len(sys.argv) > 2:
            data = json.loads(sys.stdin.read())
            result = send_email(sys.argv[2], **data)
        else:
            print("Unknown command")
            sys.exit(1)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        sys.exit(1)
