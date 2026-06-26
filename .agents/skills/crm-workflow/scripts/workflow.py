#!/usr/bin/env python3
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from authenticate import pb_get, pb_update

VALID_TRANSITIONS = {
    "draft": "confirmed", "confirmed": "in_production",
    "in_production": "ready_to_ship", "ready_to_ship": "shipped",
    "shipped": "delivered", "delivered": "completed"
}
TERMINAL = ["completed", "cancelled"]

def get_status(collection, record_id):
    """Get the current status of any status-tracked record."""
    return pb_get(collection, record_id).get("status")

def advance(collection, record_id):
    """Advance an order/PO/shipment to next status."""
    rec = pb_get(collection, record_id)
    current = rec.get("status")
    if current in TERMINAL:
        return {"error": f"Record in terminal state: {current}"}
    if current not in VALID_TRANSITIONS:
        return {"error": f"No transition from {current}"}
    next_s = VALID_TRANSITIONS[current]
    result = pb_update(collection, record_id, {"status": next_s})
    return {"success": True, "from": current, "to": next_s, "record": result}

def cancel(collection, record_id):
    """Cancel a record from any non-terminal state."""
    rec = pb_get(collection, record_id)
    current = rec.get("status")
    if current in TERMINAL:
        return {"error": f"Cannot cancel terminal state: {current}"}
    result = pb_update(collection, record_id, {"status": "cancelled"})
    return {"success": True, "from": current, "to": "cancelled"}

def reactivate(collection, record_id):
    """Reactivate a cancelled record."""
    rec = pb_get(collection, record_id)
    if rec.get("status") != "cancelled":
        return {"error": "Only cancelled records can be reactivated"}
    result = pb_update(collection, record_id, {"status": "draft"})
    return {"success": True, "from": "cancelled", "to": "draft"}

def progress(collection, record_id):
    """Get current progress percentage."""
    rec = pb_get(collection, record_id)
    current = rec.get("status")
    status_order = ["draft","confirmed","in_production","ready_to_ship","shipped","delivered","completed"]
    if current == "cancelled":
        return {"progress": 0, "status": current}
    idx = status_order.index(current) if current in status_order else -1
    pct = round((idx / (len(status_order)-1)) * 100) if idx >= 0 else 0
    return {"progress": pct, "status": current, "index": idx}

if __name__ == "__main__":
    if len(sys.argv) < 3: print("Usage: workflow.py <status|advance|cancel|reactivate|progress> <collection> <record_id>"); sys.exit(1)
    cmd, col, rid = sys.argv[1], sys.argv[2], sys.argv[3]
    try:
        if cmd == "status": result = {"status": get_status(col, rid)}
        elif cmd == "advance": result = advance(col, rid)
        elif cmd == "cancel": result = cancel(col, rid)
        elif cmd == "reactivate": result = reactivate(col, rid)
        elif cmd == "progress": result = progress(col, rid)
        else: print("Unknown command"); sys.exit(1)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e: print(json.dumps({"error": str(e)}, ensure_ascii=False)); sys.exit(1)
