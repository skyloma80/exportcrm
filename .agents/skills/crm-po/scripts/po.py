#!/usr/bin/env python3
import sys, os, json, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from authenticate import pb_list, pb_get, pb_create, pb_update, pb_delete, CRM_API_URL, _headers

def list_pos(status=""):
    params = "sort=-created&perPage=100&expand=supplier,project"
    if status: params += f"&filter=(status='{status}')"
    return pb_list("purchase_orders", params)

def get_po(po_id):
    return pb_get("purchase_orders", po_id, "supplier,project,order")

def create_po(data):
    return pb_create("purchase_orders", data)

def update_po(po_id, data):
    return pb_update("purchase_orders", po_id, data)
def delete_po(po_id):
    return pb_delete("purchase_orders", po_id)

def export_excel(po_id):
    url = f"{CRM_API_URL}/api/po/{po_id}/export-excel"
    req = urllib.request.Request(url, headers=_headers())
    with urllib.request.urlopen(req) as r:
        return r.read()

def get_payments(po_id):
    return pb_list("po_payments", f"filter=(purchase_order='{po_id}')&sort=-created")

def add_payment(data):
    return pb_create("po_payments", data)

if __name__ == "__main__":
    if len(sys.argv) < 2: print("Usage: po.py <list|get|create|update|delete|excel|payments|add-payment> [args]"); sys.exit(1)
    cmd = sys.argv[1]
    try:
        if cmd == "list":
            status = sys.argv[2] if len(sys.argv)>2 else ""
            result = list_pos(status)
        elif cmd == "get" and len(sys.argv)>2: result = get_po(sys.argv[2])
        elif cmd == "create": result = create_po(json.loads(sys.stdin.read()))
        elif cmd == "update" and len(sys.argv)>2: result = update_po(sys.argv[2], json.loads(sys.stdin.read()))
        elif cmd == "delete" and len(sys.argv)>2: result = {"deleted": delete_po(sys.argv[2])}
        elif cmd == "payments" and len(sys.argv)>2: result = get_payments(sys.argv[2])
        elif cmd == "add-payment": result = add_payment(json.loads(sys.stdin.read()))
        else: print("Unknown command"); sys.exit(1)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e: print(json.dumps({"error": str(e)}, ensure_ascii=False)); sys.exit(1)
