#!/usr/bin/env python3
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from authenticate import pb_list, pb_get, pb_create, pb_update, pb_delete

def list_suppliers(search="", country=""):
    params = "sort=name&perPage=100"
    filters = []
    if search: filters.append(f"(name~'{search}')")
    if country: filters.append(f"(country='{country}')")
    if filters: params += "&filter=" + "&&".join(filters)
    return pb_list("suppliers", params)

def get_supplier(sid):
    return pb_get("suppliers", sid)

def create_supplier(data):
    return pb_create("suppliers", data)

def update_supplier(sid, data):
    return pb_update("suppliers", sid, data)

def delete_supplier(sid):
    return pb_delete("suppliers", sid)

if __name__ == "__main__":
    if len(sys.argv) < 2: print("Usage: suppliers.py <list|get|create|update|delete> [args]"); sys.exit(1)
    cmd = sys.argv[1]
    try:
        if cmd == "list":
            search = sys.argv[2] if len(sys.argv)>2 else ""
            country = sys.argv[3] if len(sys.argv)>3 else ""
            result = list_suppliers(search, country)
        elif cmd == "get" and len(sys.argv)>2: result = get_supplier(sys.argv[2])
        elif cmd == "create": result = create_supplier(json.loads(sys.stdin.read()))
        elif cmd == "update" and len(sys.argv)>2: result = update_supplier(sys.argv[2], json.loads(sys.stdin.read()))
        elif cmd == "delete" and len(sys.argv)>2: result = {"deleted": delete_supplier(sys.argv[2])}
        else: print("Unknown command"); sys.exit(1)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e: print(json.dumps({"error": str(e)}, ensure_ascii=False)); sys.exit(1)
