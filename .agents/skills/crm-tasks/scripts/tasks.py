#!/usr/bin/env python3
"""CRM Tasks CLI."""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from authenticate import pb_list, pb_get, pb_create, pb_update, pb_delete

def list_tasks(status="", priority=""):
    params = "sort=-created&perPage=100"
    filters = []
    if status: filters.append(f"(status='{status}')")
    if priority: filters.append(f"(priority='{priority}')")
    if filters: params += "&filter=" + "&&".join(filters)
    return pb_list("tasks", params)

if __name__ == "__main__":
    if len(sys.argv) < 2: print("Usage: tasks.py <list|get|create|update|delete> [args]"); sys.exit(1)
    cmd = sys.argv[1]
    try:
        cmds = {
            "list": lambda: list_tasks(sys.argv[2] if len(sys.argv)>2 else "", sys.argv[3] if len(sys.argv)>3 else ""),
            "get": lambda: pb_get("tasks", sys.argv[2]),
            "create": lambda: pb_create("tasks", json.loads(sys.stdin.read())),
            "update": lambda: pb_update("tasks", sys.argv[2], json.loads(sys.stdin.read())),
            "delete": lambda: {"deleted": pb_delete("tasks", sys.argv[2])},
        }
        result = cmds[cmd]()
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e: print(json.dumps({"error": str(e)}, ensure_ascii=False)); sys.exit(1)
