#!/usr/bin/env python3
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from authenticate import pb_list, pb_get, pb_create, pb_update, pb_delete

def list_products(search="", category=""):
    params = "sort=code&perPage=100"
    filters = []
    if search: filters.append(f"(name~'{search}')")
    if category: filters.append(f"(category='{category}')")
    if filters: params += "&filter=" + "&&".join(filters)
    return pb_list("products", params)

def get_product(pid):
    return pb_get("products", pid)

def create_product(data):
    return pb_create("products", data)

def update_product(pid, data):
    return pb_update("products", pid, data)
def delete_product(pid):
    return pb_delete("products", pid)

def get_product_costs(product_id):
    return pb_list("product_costs", f"filter=(product='{product_id}')&expand=supplier&sort=cost_price")

def create_product_cost(data):
    return pb_create("product_costs", data)

if __name__ == "__main__":
    if len(sys.argv) < 2: print("Usage: products.py <list|get|create|update|delete|costs|add-cost> [args]"); sys.exit(1)
    cmd = sys.argv[1]
    try:
        if cmd == "list":
            search = sys.argv[2] if len(sys.argv)>2 else ""
            cat = sys.argv[3] if len(sys.argv)>3 else ""
            result = list_products(search, cat)
        elif cmd == "get" and len(sys.argv)>2: result = get_product(sys.argv[2])
        elif cmd == "create": result = create_product(json.loads(sys.stdin.read()))
        elif cmd == "update" and len(sys.argv)>2: result = update_product(sys.argv[2], json.loads(sys.stdin.read()))
        elif cmd == "delete" and len(sys.argv)>2: result = {"deleted": delete_product(sys.argv[2])}
        elif cmd == "costs" and len(sys.argv)>2: result = get_product_costs(sys.argv[2])
        elif cmd == "add-cost": result = create_product_cost(json.loads(sys.stdin.read()))
        else: print("Unknown command"); sys.exit(1)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e: print(json.dumps({"error": str(e)}, ensure_ascii=False)); sys.exit(1)
