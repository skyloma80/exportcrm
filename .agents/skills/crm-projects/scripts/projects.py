#!/usr/bin/env python3
"""CRM Projects CLI — manage projects, cost tables, documents."""
import sys, os, json, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from authenticate import pb_list, pb_get, pb_create, pb_update, pb_delete, CRM_API_URL, _headers

def list_projects(status=""):
    params = "sort=-created&perPage=100&expand=customer"
    if status: params += f"&filter=(status='{status}')"
    return pb_list("projects", params)
def get_project(pid): return pb_get("projects", pid, "customer")
def create_project(data): return pb_create("projects", data)
def update_project(pid, data): return pb_update("projects", pid, data)
def delete_project(pid): return pb_delete("projects", pid)
def cost_table(pid):
    url = f"{CRM_API_URL}/api/projects/{pid}/cost-table"
    req = urllib.request.Request(url, headers=_headers())
    with urllib.request.urlopen(req) as r: return json.loads(r.read())
def confirm_cost(pid):
    url = f"{CRM_API_URL}/api/projects/{pid}/cost-table/confirm"
    req = urllib.request.Request(url, headers=_headers(), method="POST")
    with urllib.request.urlopen(req) as r: return json.loads(r.read())
def docs(pid):
    url = f"{CRM_API_URL}/api/projects/{pid}/documents"
    req = urllib.request.Request(url, headers=_headers())
    with urllib.request.urlopen(req) as r: return json.loads(r.read())
def supplier_files(pid):
    url = f"{CRM_API_URL}/api/projects/{pid}/supplier-files"
    req = urllib.request.Request(url, headers=_headers())
    with urllib.request.urlopen(req) as r: return json.loads(r.read())

if __name__ == "__main__":
    if len(sys.argv) < 2: print("Usage: projects.py <list|get|create|update|delete|cost-table|confirm-cost|docs|supplier-files> [args]"); sys.exit(1)
    cmd = sys.argv[1]
    try:
        cmds = {
            "list": lambda: list_projects(sys.argv[2] if len(sys.argv)>2 else ""),
            "get": lambda: get_project(sys.argv[2]),
            "create": lambda: create_project(json.loads(sys.stdin.read())),
            "update": lambda: update_project(sys.argv[2], json.loads(sys.stdin.read())),
            "delete": lambda: {"deleted": delete_project(sys.argv[2])},
            "cost-table": lambda: cost_table(sys.argv[2]),
            "confirm-cost": lambda: confirm_cost(sys.argv[2]),
            "docs": lambda: docs(sys.argv[2]),
            "supplier-files": lambda: supplier_files(sys.argv[2]),
        }
        result = cmds[cmd]()
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e: print(json.dumps({"error": str(e)}, ensure_ascii=False)); sys.exit(1)
