#!/usr/bin/env python3
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from authenticate import pb_list, pb_get, pb_create, pb_update, pb_delete

def list_feedbacks(status="", type_filter=""):
    params = "sort=-created&perPage=100&expand=user,responded_by"
    filters = []
    if status: filters.append(f"(status='{status}')")
    if type_filter: filters.append(f"(type='{type_filter}')")
    if filters: params += "&filter=" + "&&".join(filters)
    return pb_list("feedbacks", params)

def get_feedback(fid):
    return pb_get("feedbacks", fid, "user,responded_by")
def create_feedback(data):
    return pb_create("feedbacks", data)
def update_feedback(fid, data):
    return pb_update("feedbacks", fid, data)
def delete_feedback(fid):
    return pb_delete("feedbacks", fid)

def respond(fid, admin_id, response_text, new_status):
    import datetime
    return pb_update("feedbacks", fid, {
        "status": new_status,
        "admin_response": response_text,
        "responded_by": admin_id,
        "responded_at": datetime.datetime.utcnow().isoformat() + "Z"
    })

def new_feedbacks():
    return list_feedbacks(status="new")

if __name__ == "__main__":
    if len(sys.argv) < 2: print("Usage: feedbacks.py <list|get|create|update|delete|respond|new> [args]"); sys.exit(1)
    cmd = sys.argv[1]
    try:
        if cmd == "list":
            s = sys.argv[2] if len(sys.argv)>2 else ""
            t = sys.argv[3] if len(sys.argv)>3 else ""
            result = list_feedbacks(s, t)
        elif cmd == "get" and len(sys.argv)>2: result = get_feedback(sys.argv[2])
        elif cmd == "create": result = create_feedback(json.loads(sys.stdin.read()))
        elif cmd == "update" and len(sys.argv)>2: result = update_feedback(sys.argv[2], json.loads(sys.stdin.read()))
        elif cmd == "delete" and len(sys.argv)>2: result = {"deleted": delete_feedback(sys.argv[2])}
        elif cmd == "respond" and len(sys.argv)>4: result = respond(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5] if len(sys.argv)>5 else "in_review")
        elif cmd == "new": result = new_feedbacks()
        else: print("Unknown command"); sys.exit(1)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e: print(json.dumps({"error": str(e)}, ensure_ascii=False)); sys.exit(1)
