#!/usr/bin/env python3
import sys, os, json, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from authenticate import pb_list, pb_get, pb_create, pb_update, pb_delete, CRM_API_URL, _headers

VALID_TRANSITIONS = {
    "draft": "confirmed", "confirmed": "in_production",
    "in_production": "ready_to_ship", "ready_to_ship": "shipped",
    "shipped": "delivered", "delivered": "completed"
}
TERMINAL = ["completed", "cancelled"]

def list_orders(status=""):
    params = "sort=-created&perPage=100&expand=customer,project"
    if status:
        params += f"&filter=(status='{status}')"
    return pb_list("so", params)

def get_order(order_id):
    return pb_get("so", order_id, "customer,project,quotation")

def create_order(data):
    return pb_create("so", data)

def update_order(order_id, data):
    return pb_update("so", order_id, data)

def delete_order(order_id):
    return pb_delete("so", order_id)

def advance_status(order_id):
    order = pb_get("so", order_id)
    current = order.get("status")
    if current in TERMINAL:
        return {"error": f"Order {order_id} is in terminal state: {current}", "order": order}
    if current not in VALID_TRANSITIONS:
        return {"error": f"No transition defined for status: {current}", "order": order}
    next_status = VALID_TRANSITIONS[current]
    result = pb_update("so", order_id, {"status": next_status})
    return {"success": True, "from": current, "to": next_status, "order": result}

def cancel_order(order_id):
    order = pb_get("so", order_id)
    current = order.get("status")
    if current in TERMINAL:
        return {"error": f"Cannot cancel: order is in terminal state {current}"}
    result = pb_update("so", order_id, {"status": "cancelled"})
    return {"success": True, "from": current, "to": "cancelled", "order": result}

def reactivate_order(order_id):
    order = pb_get("so", order_id)
    if order.get("status") != "cancelled":
        return {"error": "Only cancelled orders can be reactivated"}
    result = pb_update("so", order_id, {"status": "draft"})
    return {"success": True, "from": "cancelled", "to": "draft", "order": result}

def get_pi_documents(order_id):
    url = f"{CRM_API_URL}/api/orders/{order_id}/pi-documents"
    req = urllib.request.Request(url, headers=_headers())
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def get_po_documents(order_id):
    url = f"{CRM_API_URL}/api/orders/{order_id}/purchase-orders"
    req = urllib.request.Request(url, headers=_headers())
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def generate_pi(order_id):
    url = f"{CRM_API_URL}/api/so/{order_id}/export-pi"
    req = urllib.request.Request(url, headers=_headers())
    with urllib.request.urlopen(req) as r:
        return r.read()  # binary Excel
    return {"url": url}  # Return URL for download

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: orders.py <list|get|create|update|advance|cancel|reactivate|pi-docs|po-docs|gen-pi> [args]")
        sys.exit(1)
    cmd = sys.argv[1]
    try:
        if cmd == "list":
            status = sys.argv[2] if len(sys.argv) > 2 else ""
            result = list_orders(status)
        elif cmd == "get" and len(sys.argv) > 2:
            result = get_order(sys.argv[2])
        elif cmd == "create":
            result = create_order(json.loads(sys.stdin.read()))
        elif cmd == "update" and len(sys.argv) > 2:
            result = update_order(sys.argv[2], json.loads(sys.stdin.read()))
        elif cmd == "advance" and len(sys.argv) > 2:
            result = advance_status(sys.argv[2])
        elif cmd == "cancel" and len(sys.argv) > 2:
            result = cancel_order(sys.argv[2])
        elif cmd == "reactivate" and len(sys.argv) > 2:
            result = reactivate_order(sys.argv[2])
        elif cmd == "pi-docs" and len(sys.argv) > 2:
            result = get_pi_documents(sys.argv[2])
        elif cmd == "po-docs" and len(sys.argv) > 2:
            result = get_po_documents(sys.argv[2])
        elif cmd == "gen-pi" and len(sys.argv) > 2:
            result = generate_pi(sys.argv[2])
        else:
            print("Unknown command")
            sys.exit(1)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        sys.exit(1)
