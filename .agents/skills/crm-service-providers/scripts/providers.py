#!/usr/bin/env python3
"""CRM Service Providers CLI."""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from authenticate import pb_list, pb_get, pb_create, pb_update, pb_delete

def list_providers(type_filter=""):
    params = "sort=name"
    if type_filter: params += f"&filter=(type='{type_filter}')"
    return pb_list("service_providers", params)

if __name__ == "__main__":
    if len(sys.argv) < 2: print("Usage: providers.py <list|get|create|update|delete> [args]"); sys.exit(1)
    cmd = sys.argv[1]
    try:
        cmds = {
            "list": lambda: list_providers(sys.argv[2] if len(sys.argv)>2 else ""),
            "get": lambda: pb_get("service_providers", sys.argv[2]),
            "create": lambda: pb_create("service_providers", json.loads(sys.stdin.read())),
            "update": lambda: pb_update("service_providers", sys.argv[2], json.loads(sys.stdin.read())),
            "delete": lambda: {"deleted": pb_delete("service_providers", sys.argv[2])},
        }
        result = cmds[cmd]()
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e: print(json.dumps({"error": str(e)}, ensure_ascii=False)); sys.exit(1)
