#!/usr/bin/env python3
import sys, os, json, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from authenticate import pb_list, pb_get, pb_create, pb_update, pb_delete, CRM_API_URL, _headers

def list_shipments(status=""):
    params = "sort=-created&perPage=100&expand=order"
    if status: params += f"&filter=(status='{status}')"
    return pb_list("shipments", params)

def get_shipment(sid):
    return pb_get("shipments", sid, "order")
def create_shipment(data):
    return pb_create("shipments", data)
def update_shipment(sid, data):
    return pb_update("shipments", sid, data)
def delete_shipment(sid):
    return pb_delete("shipments", sid)

def update_status(sid, new_status, tracking=""):
    data = {"status": new_status}
    if tracking: data["tracking_number"] = tracking
    return pb_update("shipments", sid, data)

def get_documents(sid):
    url = f"{CRM_API_URL}/api/shipments/{sid}/documents"
    req = urllib.request.Request(url, headers=_headers())
    with urllib.request.urlopen(req) as r: return json.loads(r.read())

def generate_documents(sid):
    url = f"{CRM_API_URL}/api/shipments/{sid}/documents/generate"
    req = urllib.request.Request(url, headers=_headers(), method="POST")
    with urllib.request.urlopen(req) as r: return json.loads(r.read())

if __name__ == "__main__":
    if len(sys.argv) < 2: print("Usage: shipments.py <list|get|create|update|status|docs|gen-docs> [args]"); sys.exit(1)
    cmd = sys.argv[1]
    try:
        if cmd == "list":
            s = sys.argv[2] if len(sys.argv)>2 else ""; result = list_shipments(s)
        elif cmd == "get" and len(sys.argv)>2: result = get_shipment(sys.argv[2])
        elif cmd == "create": result = create_shipment(json.loads(sys.stdin.read()))
        elif cmd == "update" and len(sys.argv)>2: result = update_shipment(sys.argv[2], json.loads(sys.stdin.read()))
        elif cmd == "delete" and len(sys.argv)>2: result = {"deleted": delete_shipment(sys.argv[2])}
        elif cmd == "status" and len(sys.argv)>3:
            trk = sys.argv[4] if len(sys.argv)>4 else ""; result = update_status(sys.argv[2], sys.argv[3], trk)
        elif cmd == "docs" and len(sys.argv)>2: result = get_documents(sys.argv[2])
        elif cmd == "gen-docs" and len(sys.argv)>2: result = generate_documents(sys.argv[2])
        else: print("Unknown command"); sys.exit(1)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e: print(json.dumps({"error": str(e)}, ensure_ascii=False)); sys.exit(1)
