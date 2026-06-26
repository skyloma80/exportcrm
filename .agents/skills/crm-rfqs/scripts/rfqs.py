#!/usr/bin/env python3
import sys, os, json, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from authenticate import pb_list, pb_get, pb_create, pb_update, pb_delete, CRM_API_URL, _headers

def list_rfqs(status=""):
    params = "sort=-created&perPage=100&expand=project"
    if status: params += f"&filter=(status='{status}')"
    return pb_list("rfqs", params)

def get_rfq(rfq_id):
    return pb_get("rfqs", rfq_id, "project")
def create_rfq(data):
    return pb_create("rfqs", data)
def update_rfq(rfq_id, data):
    return pb_update("rfqs", rfq_id, data)
def delete_rfq(rfq_id):
    return pb_delete("rfqs", rfq_id)

def get_quotations(rfq_id):
    return pb_list("quotations", f"filter=(rfq='{rfq_id}')&expand=supplier")

def ai_analyze(rfq_id):
    url = f"{CRM_API_URL}/api/rfqs/{rfq_id}/ai-analyze"
    req = urllib.request.Request(url, headers=_headers())
    with urllib.request.urlopen(req) as r: return json.loads(r.read())

def generate_pos(rfq_id, selections):
    url = f"{CRM_API_URL}/api/rfqs/{rfq_id}/generate-purchase-orders"
    body = json.dumps(selections).encode()
    req = urllib.request.Request(url, data=body, headers=_headers(), method="POST")
    with urllib.request.urlopen(req) as r: return json.loads(r.read())

if __name__ == "__main__":
    if len(sys.argv) < 2: print("Usage: rfqs.py <list|get|create|update|delete|quotations|analyze|gen-pos> [args]"); sys.exit(1)
    cmd = sys.argv[1]
    try:
        if cmd == "list":
            s = sys.argv[2] if len(sys.argv)>2 else ""; result = list_rfqs(s)
        elif cmd == "get" and len(sys.argv)>2: result = get_rfq(sys.argv[2])
        elif cmd == "create": result = create_rfq(json.loads(sys.stdin.read()))
        elif cmd == "update" and len(sys.argv)>2: result = update_rfq(sys.argv[2], json.loads(sys.stdin.read()))
        elif cmd == "delete" and len(sys.argv)>2: result = {"deleted": delete_rfq(sys.argv[2])}
        elif cmd == "quotations" and len(sys.argv)>2: result = get_quotations(sys.argv[2])
        elif cmd == "analyze" and len(sys.argv)>2: result = ai_analyze(sys.argv[2])
        elif cmd == "gen-pos" and len(sys.argv)>2: result = generate_pos(sys.argv[2], json.loads(sys.stdin.read()))
        else: print("Unknown command"); sys.exit(1)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e: print(json.dumps({"error": str(e)}, ensure_ascii=False)); sys.exit(1)
